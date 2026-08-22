import { prisma } from '../config';
import { BadRequestError, NotFoundError } from '../utils/errors';

export interface CreateTransferDto {
  sourceLocationId: string;
  destinationLocationId: string;
  itemId: string;
  batchNumber: string;
  quantity: number;
  userId?: string;
}

export class TransferService {
  /**
   * Request an internal stock transfer (Ops / Admin).
   */
  static async requestTransfer(dto: CreateTransferDto) {
    if (dto.quantity <= 0) {
      throw new BadRequestError('Transfer quantity must be greater than zero');
    }

    if (dto.sourceLocationId === dto.destinationLocationId) {
      throw new BadRequestError('Source and destination locations cannot be the same');
    }

    const sourceLoc = await prisma.location.findUnique({ where: { id: dto.sourceLocationId } });
    if (!sourceLoc) throw new NotFoundError('Source location not found');

    const destLoc = await prisma.location.findUnique({ where: { id: dto.destinationLocationId } });
    if (!destLoc) throw new NotFoundError('Destination location not found');

    const item = await prisma.item.findUnique({ where: { id: dto.itemId } });
    if (!item) throw new NotFoundError('Item not found');

    // Check available inventory at source location for this batch
    const sourceInventory = await prisma.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId: dto.itemId,
          locationId: dto.sourceLocationId,
          batchNumber: dto.batchNumber.trim(),
        },
      },
    });

    if (!sourceInventory) {
      throw new BadRequestError(
        `No inventory record found at ${sourceLoc.name} for item ${item.name} batch ${dto.batchNumber}`
      );
    }

    const available = Number(sourceInventory.physicalQuantity) - Number(sourceInventory.reservedQuantity);
    if (available < dto.quantity) {
      throw new BadRequestError(
        `Cannot transfer ${dto.quantity} units. Available stock at source is only ${available} units (Physical: ${sourceInventory.physicalQuantity}, Reserved: ${sourceInventory.reservedQuantity})`
      );
    }

    const count = await prisma.stockTransfer.count();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const transferNumber = `TRF-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

    return prisma.stockTransfer.create({
      data: {
        transferNumber,
        sourceLocationId: dto.sourceLocationId,
        destinationLocationId: dto.destinationLocationId,
        itemId: dto.itemId,
        batchNumber: dto.batchNumber.trim(),
        quantity: dto.quantity,
        status: 'REQUESTED',
        createdById: dto.userId || null,
      },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        item: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  /**
   * Dispatch an internal stock transfer (Ops / Admin).
   * RULE: On Dispatch, source physical inventory REDUCES.
   * RULE: Before Receipt, destination inventory MUST NOT increase.
   */
  static async dispatchTransfer(transferId: string, userId?: string) {
    return await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: { sourceLocation: true, destinationLocation: true, item: true },
      });

      if (!transfer) {
        throw new NotFoundError(`Stock Transfer with ID ${transferId} not found`);
      }

      if (transfer.status !== 'REQUESTED') {
        throw new BadRequestError(
          `Cannot dispatch transfer in status '${transfer.status}'. It must be 'REQUESTED'`
        );
      }

      // Check source inventory
      const sourceInventory = await tx.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: transfer.itemId,
            locationId: transfer.sourceLocationId,
            batchNumber: transfer.batchNumber,
          },
        },
      });

      if (!sourceInventory) {
        throw new BadRequestError(
          `Source inventory record not found for dispatch at ${transfer.sourceLocation.name}`
        );
      }

      const available = Number(sourceInventory.physicalQuantity) - Number(sourceInventory.reservedQuantity);
      if (available < transfer.quantity || sourceInventory.physicalQuantity < transfer.quantity) {
        throw new BadRequestError(
          `Insufficient source stock to dispatch transfer. Available: ${available}, Transfer qty: ${transfer.quantity}`
        );
      }

      // Decrement source physical quantity
      const updatedSource = await tx.inventory.update({
        where: { id: sourceInventory.id },
        data: {
          physicalQuantity: { decrement: transfer.quantity },
        },
      });

      // Audit log for source dispatch
      await tx.inventoryTransaction.create({
        data: {
          itemId: transfer.itemId,
          locationId: transfer.sourceLocationId,
          batchNumber: transfer.batchNumber,
          type: 'TRANSFER_DISPATCH',
          quantity: -transfer.quantity,
          physicalBalanceAfter: updatedSource.physicalQuantity,
          reservedBalanceAfter: updatedSource.reservedQuantity,
          referenceType: 'STOCK_TRANSFER',
          referenceId: transfer.id,
          performedById: userId || null,
          notes: `Dispatched to ${transfer.destinationLocation.name} via ${transfer.transferNumber}`,
        },
      });

      // Update transfer status to DISPATCHED
      const updatedTransfer = await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: 'DISPATCHED',
          dispatchedAt: new Date(),
        },
        include: {
          sourceLocation: true,
          destinationLocation: true,
          item: true,
          createdBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      return updatedTransfer;
    });
  }

  /**
   * Receive an internal stock transfer (Ops / Admin).
   * RULE: On Receipt, destination inventory increases.
   * RULE: The system must PREVENT the same transfer from being received twice.
   */
  static async receiveTransfer(transferId: string, userId?: string) {
    return await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: { sourceLocation: true, destinationLocation: true, item: true },
      });

      if (!transfer) {
        throw new NotFoundError(`Stock Transfer with ID ${transferId} not found`);
      }

      // Check if already received -> MUST PREVENT DOUBLE RECEIPT
      if (transfer.status === 'RECEIVED') {
        throw new BadRequestError(
          `Duplicate receipt prevented: Transfer ${transfer.transferNumber} has already been received at ${transfer.receivedAt?.toISOString() || 'earlier'}`
        );
      }

      if (transfer.status !== 'DISPATCHED') {
        throw new BadRequestError(
          `Cannot receive transfer in status '${transfer.status}'. It must be 'DISPATCHED' first.`
        );
      }

      // Upsert destination inventory
      const existingDest = await tx.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: transfer.itemId,
            locationId: transfer.destinationLocationId,
            batchNumber: transfer.batchNumber,
          },
        },
      });

      let updatedDest;
      if (existingDest) {
        updatedDest = await tx.inventory.update({
          where: { id: existingDest.id },
          data: {
            physicalQuantity: { increment: transfer.quantity },
          },
        });
      } else {
        updatedDest = await tx.inventory.create({
          data: {
            itemId: transfer.itemId,
            locationId: transfer.destinationLocationId,
            batchNumber: transfer.batchNumber,
            physicalQuantity: transfer.quantity,
            reservedQuantity: 0,
          },
        });
      }

      // Audit log for destination receipt
      await tx.inventoryTransaction.create({
        data: {
          itemId: transfer.itemId,
          locationId: transfer.destinationLocationId,
          batchNumber: transfer.batchNumber,
          type: 'TRANSFER_RECEIVE',
          quantity: transfer.quantity,
          physicalBalanceAfter: updatedDest.physicalQuantity,
          reservedBalanceAfter: updatedDest.reservedQuantity,
          referenceType: 'STOCK_TRANSFER',
          referenceId: transfer.id,
          performedById: userId || null,
          notes: `Received from ${transfer.sourceLocation.name} via ${transfer.transferNumber}`,
        },
      });

      // Mark transfer as RECEIVED
      const updatedTransfer = await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
        },
        include: {
          sourceLocation: true,
          destinationLocation: true,
          item: true,
          createdBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      return updatedTransfer;
    });
  }

  /**
   * List all Stock Transfers.
   */
  static async listTransfers(filters?: {
    sourceLocationId?: string;
    destinationLocationId?: string;
    status?: string;
    itemId?: string;
  }) {
    const where: any = {};
    if (filters?.sourceLocationId) where.sourceLocationId = filters.sourceLocationId;
    if (filters?.destinationLocationId) where.destinationLocationId = filters.destinationLocationId;
    if (filters?.status) where.status = filters.status.toUpperCase();
    if (filters?.itemId) where.itemId = filters.itemId;

    return prisma.stockTransfer.findMany({
      where,
      include: {
        sourceLocation: true,
        destinationLocation: true,
        item: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single transfer by ID.
   */
  static async getTransferById(id: string) {
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        item: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!transfer) throw new NotFoundError(`Stock Transfer with ID ${id} not found`);
    return transfer;
  }
}
