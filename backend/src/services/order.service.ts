import { prisma } from '../config';
import { BadRequestError, NotFoundError } from '../utils/errors';

export interface CreateOrderItemDto {
  itemId: string;
  batchNumber?: string;
  quantity: number;
  unitPrice?: number;
}

export interface CreateOrderDto {
  customerName: string;
  locationId: string;
  items: CreateOrderItemDto[];
  userId?: string;
}

export class OrderService {
  /**
   * Create a Customer Order in DRAFT status (Sales / Admin).
   */
  static async createOrder(dto: CreateOrderDto) {
    if (!dto.customerName || !dto.customerName.trim()) {
      throw new BadRequestError('Customer name is required');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestError('Order must contain at least one item');
    }

    const location = await prisma.location.findUnique({ where: { id: dto.locationId } });
    if (!location) throw new NotFoundError('Location not found');

    for (const itm of dto.items) {
      if (itm.quantity <= 0) {
        throw new BadRequestError('Item quantity must be greater than zero');
      }
      const itemExists = await prisma.item.findUnique({ where: { id: itm.itemId } });
      if (!itemExists) throw new NotFoundError(`Item with ID ${itm.itemId} not found`);
    }

    const count = await prisma.customerOrder.count();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `ORD-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

    const totalAmount = dto.items.reduce((acc, itm) => acc + itm.quantity * (itm.unitPrice || 0), 0);

    return prisma.customerOrder.create({
      data: {
        orderNumber,
        customerName: dto.customerName.trim(),
        locationId: dto.locationId,
        status: 'DRAFT',
        totalAmount,
        createdById: dto.userId || null,
        items: {
          create: dto.items.map((itm) => ({
            itemId: itm.itemId,
            batchNumber: itm.batchNumber?.trim() || null,
            quantity: itm.quantity,
            unitPrice: itm.unitPrice || 0,
            reservedQuantity: 0,
          })),
        },
      },
      include: {
        location: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        items: { include: { item: true } },
      },
    });
  }

  /**
   * Reserve Stock for a Customer Order (Sales / Admin).
   * Transactional & Concurrency Safe:
   * Uses atomic database transaction with strict available inventory checks.
   * If two users attempt to reserve at the same time, only the one with sufficient available stock succeeds.
   */
  static async reserveOrderStock(orderId: string, userId?: string) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { item: true } },
          location: true,
        },
      });

      if (!order) {
        throw new NotFoundError(`Customer Order with ID ${orderId} not found`);
      }

      if (order.status === 'RESERVED') {
        throw new BadRequestError(`Customer Order ${order.orderNumber} is already in RESERVED status`);
      }

      if (order.status !== 'DRAFT') {
        throw new BadRequestError(`Cannot reserve stock for order in '${order.status}' status`);
      }

      // Check and reserve stock for each item
      for (const orderItem of order.items) {
        let targetInventory;

        if (orderItem.batchNumber) {
          targetInventory = await tx.inventory.findUnique({
            where: {
              itemId_locationId_batchNumber: {
                itemId: orderItem.itemId,
                locationId: order.locationId,
                batchNumber: orderItem.batchNumber,
              },
            },
          });
        } else {
          // Find first available batch with sufficient inventory
          const availableBatches = await tx.inventory.findMany({
            where: {
              itemId: orderItem.itemId,
              locationId: order.locationId,
            },
            orderBy: { createdAt: 'asc' },
          });

          // Find batch where physical - reserved >= orderItem.quantity
          targetInventory = availableBatches.find(
            (b) => Number(b.physicalQuantity) - Number(b.reservedQuantity) >= orderItem.quantity
          );
        }

        if (!targetInventory) {
          throw new BadRequestError(
            `Cannot reserve stock: No inventory batch with sufficient available quantity for item '${orderItem.item.name}' at location '${order.location.name}'. Requested: ${orderItem.quantity}`
          );
        }

        const available = Number(targetInventory.physicalQuantity) - Number(targetInventory.reservedQuantity);
        if (available < orderItem.quantity) {
          throw new BadRequestError(
            `Cannot reserve stock: Insufficient available inventory for item '${orderItem.item.name}' (Batch: ${targetInventory.batchNumber}) at '${order.location.name}'. Available: ${available}, Requested: ${orderItem.quantity}`
          );
        }

        // Atomically increment reserved quantity
        const updatedInventory = await tx.inventory.update({
          where: { id: targetInventory.id },
          data: {
            reservedQuantity: { increment: orderItem.quantity },
          },
        });

        // Safety Invariant Check: reserved must never exceed physical
        if (updatedInventory.reservedQuantity > updatedInventory.physicalQuantity) {
          throw new BadRequestError(
            `Invariant violation: Reservation exceeded physical stock on item ${orderItem.item.name}`
          );
        }

        // Update the order item's assigned batch and reserved quantity
        await tx.customerOrderItem.update({
          where: { id: orderItem.id },
          data: {
            batchNumber: targetInventory.batchNumber,
            reservedQuantity: orderItem.quantity,
          },
        });

        // Audit log
        await tx.inventoryTransaction.create({
          data: {
            itemId: orderItem.itemId,
            locationId: order.locationId,
            batchNumber: targetInventory.batchNumber,
            type: 'RESERVE',
            quantity: orderItem.quantity,
            physicalBalanceAfter: updatedInventory.physicalQuantity,
            reservedBalanceAfter: updatedInventory.reservedQuantity,
            referenceType: 'CUSTOMER_ORDER',
            referenceId: order.id,
            performedById: userId || null,
            notes: `Reserved ${orderItem.quantity} units for Order ${order.orderNumber}`,
          },
        });
      }

      // Mark order as RESERVED
      const updatedOrder = await tx.customerOrder.update({
        where: { id: order.id },
        data: { status: 'RESERVED' },
        include: {
          location: true,
          createdBy: { select: { id: true, name: true, email: true, role: true } },
          items: { include: { item: true } },
        },
      });

      return updatedOrder;
    });
  }

  /**
   * Cancel an Order and Release any reserved stock.
   */
  static async cancelOrder(orderId: string, userId?: string) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.findUnique({
        where: { id: orderId },
        include: { items: { include: { item: true } }, location: true },
      });

      if (!order) throw new NotFoundError('Order not found');
      if (order.status === 'CANCELLED') {
        throw new BadRequestError('Order is already cancelled');
      }
      if (order.status === 'FULFILLED') {
        throw new BadRequestError('Cannot cancel already fulfilled order');
      }

      // If order was RESERVED, release the reservations
      if (order.status === 'RESERVED') {
        for (const orderItem of order.items) {
          if (orderItem.reservedQuantity > 0 && orderItem.batchNumber) {
            const inventory = await tx.inventory.findUnique({
              where: {
                itemId_locationId_batchNumber: {
                  itemId: orderItem.itemId,
                  locationId: order.locationId,
                  batchNumber: orderItem.batchNumber,
                },
              },
            });

            if (inventory) {
              const updatedInv = await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  reservedQuantity: {
                    decrement: Math.min(orderItem.reservedQuantity, inventory.reservedQuantity),
                  },
                },
              });

              await tx.inventoryTransaction.create({
                data: {
                  itemId: orderItem.itemId,
                  locationId: order.locationId,
                  batchNumber: orderItem.batchNumber,
                  type: 'RELEASE',
                  quantity: -orderItem.reservedQuantity,
                  physicalBalanceAfter: updatedInv.physicalQuantity,
                  reservedBalanceAfter: updatedInv.reservedQuantity,
                  referenceType: 'CUSTOMER_ORDER',
                  referenceId: order.id,
                  performedById: userId || null,
                  notes: `Released ${orderItem.reservedQuantity} units from cancelled Order ${order.orderNumber}`,
                },
              });
            }

            await tx.customerOrderItem.update({
              where: { id: orderItem.id },
              data: { reservedQuantity: 0 },
            });
          }
        }
      }

      const updated = await tx.customerOrder.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
        include: {
          location: true,
          createdBy: { select: { id: true, name: true, email: true, role: true } },
          items: { include: { item: true } },
        },
      });

      return updated;
    });
  }

  /**
   * Fulfill a reserved order (deducts physical and reserved inventory).
   */
  static async fulfillOrder(orderId: string, userId?: string) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.findUnique({
        where: { id: orderId },
        include: { items: { include: { item: true } }, location: true },
      });

      if (!order) throw new NotFoundError('Order not found');
      if (order.status !== 'RESERVED') {
        throw new BadRequestError(`Cannot fulfill order in '${order.status}' status. Must be 'RESERVED'`);
      }

      for (const orderItem of order.items) {
        if (!orderItem.batchNumber) {
          throw new BadRequestError(`Missing batch assignment for item ${orderItem.item.name}`);
        }

        const inventory = await tx.inventory.findUnique({
          where: {
            itemId_locationId_batchNumber: {
              itemId: orderItem.itemId,
              locationId: order.locationId,
              batchNumber: orderItem.batchNumber,
            },
          },
        });

        if (!inventory) {
          throw new BadRequestError(`Inventory batch not found for fulfillment`);
        }

        const updatedInv = await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            physicalQuantity: { decrement: orderItem.quantity },
            reservedQuantity: { decrement: orderItem.reservedQuantity },
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            itemId: orderItem.itemId,
            locationId: order.locationId,
            batchNumber: orderItem.batchNumber,
            type: 'CONSUME',
            quantity: -orderItem.quantity,
            physicalBalanceAfter: updatedInv.physicalQuantity,
            reservedBalanceAfter: updatedInv.reservedQuantity,
            referenceType: 'CUSTOMER_ORDER',
            referenceId: order.id,
            performedById: userId || null,
            notes: `Fulfilled for Order ${order.orderNumber}`,
          },
        });
      }

      const updated = await tx.customerOrder.update({
        where: { id: order.id },
        data: { status: 'FULFILLED' },
        include: {
          location: true,
          createdBy: { select: { id: true, name: true, email: true, role: true } },
          items: { include: { item: true } },
        },
      });

      return updated;
    });
  }

  /**
   * List customer orders.
   */
  static async listOrders(filters?: { locationId?: string; status?: string }) {
    const where: any = {};
    if (filters?.locationId) where.locationId = filters.locationId;
    if (filters?.status) where.status = filters.status.toUpperCase();

    return prisma.customerOrder.findMany({
      where,
      include: {
        location: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        items: { include: { item: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get customer order by ID.
   */
  static async getOrderById(id: string) {
    const order = await prisma.customerOrder.findUnique({
      where: { id },
      include: {
        location: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        items: { include: { item: true } },
      },
    });

    if (!order) throw new NotFoundError(`Customer Order with ID ${id} not found`);
    return order;
  }
}
