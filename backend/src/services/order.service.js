const { prisma } = require('../config');
const { BadRequestError, NotFoundError } = require('../utils/errors');

/**
 * Create a Customer Order in DRAFT status (Sales / Admin).
 */
async function createOrder(dto) {
  if (!dto.customerName || !dto.customerName.trim()) {
    throw BadRequestError('Customer name is required');
  }

  if (!dto.items || dto.items.length === 0) {
    throw BadRequestError('Order must contain at least one item');
  }

  const location = await prisma.location.findUnique({ where: { id: dto.locationId } });
  if (!location) throw NotFoundError('Location not found');

  for (const itm of dto.items) {
    if (itm.quantity <= 0) {
      throw BadRequestError('Item quantity must be greater than zero');
    }
    const itemExists = await prisma.item.findUnique({ where: { id: itm.itemId } });
    if (!itemExists) throw NotFoundError(`Item with ID ${itm.itemId} not found`);
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
 */
async function reserveOrderStock(orderId, userId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { item: true } },
        location: true,
      },
    });

    if (!order) {
      throw NotFoundError(`Customer Order with ID ${orderId} not found`);
    }

    if (order.status === 'RESERVED') {
      throw BadRequestError(`Customer Order ${order.orderNumber} is already in RESERVED status`);
    }

    if (order.status !== 'DRAFT') {
      throw BadRequestError(`Cannot reserve stock for order in '${order.status}' status`);
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
          orderBy: { batchNumber: 'asc' },
        });

        targetInventory = availableBatches.find(
          (b) => Number(b.physicalQuantity) - Number(b.reservedQuantity) >= orderItem.quantity
        );
      }

      if (!targetInventory) {
        throw BadRequestError(
          `Insufficient available inventory at ${order.location.name} for item ${orderItem.item.name}. Required: ${orderItem.quantity}`
        );
      }

      const available = Number(targetInventory.physicalQuantity) - Number(targetInventory.reservedQuantity);
      if (available < orderItem.quantity) {
        throw BadRequestError(
          `Insufficient available inventory for item ${orderItem.item.name} batch ${targetInventory.batchNumber}. Required: ${orderItem.quantity}, Available: ${available}`
        );
      }

      // Atomic increment of reservedQuantity with CAS guard
      const updateResult = await tx.inventory.updateMany({
        where: {
          id: targetInventory.id,
          reservedQuantity: { lte: targetInventory.physicalQuantity - orderItem.quantity },
        },
        data: {
          reservedQuantity: { increment: orderItem.quantity },
        },
      });

      if (updateResult.count === 0) {
        throw BadRequestError(
          `Insufficient available inventory for item ${orderItem.item?.name || 'Item'} (concurrent reservation conflict)`
        );
      }

      const updatedInv = await tx.inventory.findUnique({ where: { id: targetInventory.id } });

      // Update order line item
      await tx.customerOrderItem.update({
        where: { id: orderItem.id },
        data: {
          reservedQuantity: orderItem.quantity,
          batchNumber: targetInventory.batchNumber,
        },
      });

      // Log reservation audit transaction
      await tx.inventoryTransaction.create({
        data: {
          itemId: orderItem.itemId,
          locationId: order.locationId,
          batchNumber: targetInventory.batchNumber,
          type: 'RESERVE',
          quantity: orderItem.quantity,
          physicalBalanceAfter: updatedInv.physicalQuantity,
          reservedBalanceAfter: updatedInv.reservedQuantity,
          referenceType: 'CUSTOMER_ORDER',
          referenceId: order.id,
          performedById: userId || null,
          notes: `Reserved ${orderItem.quantity} units for Order ${order.orderNumber}`,
        },
      });
    }

    // Advance order status to RESERVED
    const updatedOrder = await tx.customerOrder.update({
      where: { id: orderId },
      data: { status: 'RESERVED' },
      include: {
        location: true,
        items: { include: { item: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return updatedOrder;
  });
}

/**
 * Cancel an order and release reserved stock.
 */
async function cancelOrder(orderId, userId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { item: true } },
        location: true,
      },
    });

    if (!order) {
      throw NotFoundError(`Customer Order with ID ${orderId} not found`);
    }

    if (order.status === 'CANCELLED') {
      throw BadRequestError('Order is already cancelled');
    }

    if (order.status === 'FULFILLED') {
      throw BadRequestError('Cannot cancel an already fulfilled order');
    }

    // If order was in RESERVED status, release the reserved stock
    if (order.status === 'RESERVED') {
      for (const orderItem of order.items) {
        if (orderItem.reservedQuantity > 0 && orderItem.batchNumber) {
          const inv = await tx.inventory.findUnique({
            where: {
              itemId_locationId_batchNumber: {
                itemId: orderItem.itemId,
                locationId: order.locationId,
                batchNumber: orderItem.batchNumber,
              },
            },
          });

          if (inv) {
            const updatedInv = await tx.inventory.update({
              where: { id: inv.id },
              data: {
                reservedQuantity: { decrement: orderItem.reservedQuantity },
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
                notes: `Released ${orderItem.reservedQuantity} reserved units from cancelled Order ${order.orderNumber}`,
              },
            });
          }
        }
      }
    }

    return tx.customerOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
      include: {
        location: true,
        items: { include: { item: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  });
}

/**
 * Fulfill an order (consume reserved physical stock).
 */
async function fulfillOrder(orderId, userId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { item: true } },
        location: true,
      },
    });

    if (!order) {
      throw NotFoundError(`Customer Order with ID ${orderId} not found`);
    }

    if (order.status !== 'RESERVED') {
      throw BadRequestError(`Cannot fulfill order in '${order.status}' status. Must be RESERVED first.`);
    }

    for (const orderItem of order.items) {
      if (!orderItem.batchNumber) {
        throw BadRequestError(`Order item ${orderItem.item.name} has no assigned batch for fulfillment`);
      }

      const inv = await tx.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: orderItem.itemId,
            locationId: order.locationId,
            batchNumber: orderItem.batchNumber,
          },
        },
      });

      if (!inv || inv.physicalQuantity < orderItem.quantity) {
        throw BadRequestError(`Physical stock unavailable for consumption on item ${orderItem.item.name}`);
      }

      // Consume both physical and reserved stock
      const updatedInv = await tx.inventory.update({
        where: { id: inv.id },
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
          notes: `Consumed ${orderItem.quantity} units for fulfilled Order ${order.orderNumber}`,
        },
      });
    }

    return tx.customerOrder.update({
      where: { id: orderId },
      data: { status: 'FULFILLED' },
      include: {
        location: true,
        items: { include: { item: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  });
}

/**
 * List Customer Orders.
 */
async function listOrders(filters = {}) {
  const where = {};
  if (filters.locationId) where.locationId = filters.locationId;
  if (filters.status) where.status = filters.status.toUpperCase();

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
 * Get Order by ID.
 */
async function getOrderById(id) {
  const order = await prisma.customerOrder.findUnique({
    where: { id },
    include: {
      location: true,
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      items: { include: { item: true } },
    },
  });

  if (!order) {
    throw NotFoundError(`Customer Order with ID ${id} not found`);
  }

  return order;
}

module.exports = {
  createOrder,
  reserveOrderStock,
  cancelOrder,
  fulfillOrder,
  listOrders,
  getOrderById,
};
