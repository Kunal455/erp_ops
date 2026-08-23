const { prisma } = require('../config');
const { BadRequestError, NotFoundError } = require('../utils/errors');

/**
 * Request an internal stock transfer (Ops / Admin).
 */
async function requestTransfer(dto) {
  if (dto.quantity <= 0) {
    throw BadRequestError('Transfer quantity must be greater than zero');
  }

  if (dto.sourceLocationId === dto.destinationLocationId) {
    throw BadRequestError('Source and destination locations cannot be the same');
  }

  const sourceLoc = await prisma.location.findUnique({ where: { id: dto.sourceLocationId } });
  if (!sourceLoc) throw NotFoundError('Source location not found');

  const destLoc = await prisma.location.findUnique({ where: { id: dto.destinationLocationId } });
  if (!destLoc) throw NotFoundError('Destination location not found');

  const item = await prisma.item.findUnique({ where: { id: dto.itemId } });
  if (!item) throw NotFoundError('Item not found');

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
    throw BadRequestError(
      `No inventory record found at ${sourceLoc.name} for item ${item.name} batch ${dto.batchNumber}`
    );
  }

  const available = Number(sourceInventory.physicalQuantity) - Number(sourceInventory.reservedQuantity);
  if (available < dto.quantity) {
    throw BadRequestError(
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
async function dispatchTransfer(transferId, userId) {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findUnique({
      where: { id: transferId },
      include: { sourceLocation: true, destinationLocation: true, item: true },
    });

    if (!transfer) {
      throw NotFoundError(`Stock Transfer with ID ${transferId} not found`);
    }

    if (transfer.status !== 'REQUESTED') {
      throw BadRequestError(
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
      throw BadRequestError(
        `Source inventory record not found for dispatch at ${transfer.sourceLocation.name}`
      );
    }

    const available = Number(sourceInventory.physicalQuantity) - Number(sourceInventory.reservedQuantity);
    if (available < transfer.quantity || sourceInventory.physicalQuantity < transfer.quantity) {
      throw BadRequestError(
        `Insufficient source stock to dispatch transfer. Available: ${available}, Transfer qty: ${transfer.quantity}`
      );
    }

    // Decrement source physical quantity with atomic CAS guard
    const updateResult = await tx.inventory.updateMany({
      where: {
        id: sourceInventory.id,
        physicalQuantity: { gte: transfer.quantity },
      },
      data: { physicalQuantity: { decrement: transfer.quantity } },
    });

    if (updateResult.count === 0) {
      throw BadRequestError(
        `Insufficient source stock to dispatch transfer (concurrent dispatch conflict).`
      );
    }

    const updatedSource = await tx.inventory.findUnique({ where: { id: sourceInventory.id } });

    // Update transfer status to DISPATCHED
    const updatedTransfer = await tx.stockTransfer.update({
      where: { id: transferId },
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

    // Record audit transaction
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
        notes: `Dispatched ${transfer.quantity} units to ${transfer.destinationLocation.name} (Transfer: ${transfer.transferNumber})`,
      },
    });

    return updatedTransfer;
  });
}

/**
 * Receive an internal stock transfer (Ops / Admin).
 * RULE: Only upon Receipt does destination inventory INCREASE.
 * RULE: The same transfer MUST NOT be received twice.
 */
async function receiveTransfer(transferId, userId) {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findUnique({
      where: { id: transferId },
      include: { sourceLocation: true, destinationLocation: true, item: true },
    });

    if (!transfer) {
      throw NotFoundError(`Stock Transfer with ID ${transferId} not found`);
    }

    if (transfer.status === 'RECEIVED') {
      throw BadRequestError(
        `Duplicate receipt prevented: Transfer ${transfer.transferNumber} has already been received on ${transfer.receivedAt?.toISOString()}`
      );
    }

    if (transfer.status !== 'DISPATCHED') {
      throw BadRequestError(
        `Cannot receive transfer in status '${transfer.status}'. Transfer must be 'DISPATCHED' before receiving.`
      );
    }

    // Upsert destination inventory
    let destInventory = await tx.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId: transfer.itemId,
          locationId: transfer.destinationLocationId,
          batchNumber: transfer.batchNumber,
        },
      },
    });

    if (destInventory) {
      destInventory = await tx.inventory.update({
        where: { id: destInventory.id },
        data: { physicalQuantity: { increment: transfer.quantity } },
      });
    } else {
      destInventory = await tx.inventory.create({
        data: {
          itemId: transfer.itemId,
          locationId: transfer.destinationLocationId,
          batchNumber: transfer.batchNumber,
          physicalQuantity: transfer.quantity,
          reservedQuantity: 0,
        },
      });
    }

    // Update transfer status to RECEIVED
    const updatedTransfer = await tx.stockTransfer.update({
      where: { id: transferId },
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

    // Record audit transaction
    await tx.inventoryTransaction.create({
      data: {
        itemId: transfer.itemId,
        locationId: transfer.destinationLocationId,
        batchNumber: transfer.batchNumber,
        type: 'TRANSFER_RECEIVE',
        quantity: transfer.quantity,
        physicalBalanceAfter: destInventory.physicalQuantity,
        reservedBalanceAfter: destInventory.reservedQuantity,
        referenceType: 'STOCK_TRANSFER',
        referenceId: transfer.id,
        performedById: userId || null,
        notes: `Received ${transfer.quantity} units from ${transfer.sourceLocation.name} (Transfer: ${transfer.transferNumber})`,
      },
    });

    return updatedTransfer;
  });
}

/**
 * List internal stock transfers.
 */
async function listTransfers(filters = {}) {
  const where = {};
  if (filters.sourceLocationId) where.sourceLocationId = filters.sourceLocationId;
  if (filters.destinationLocationId) where.destinationLocationId = filters.destinationLocationId;
  if (filters.status) where.status = filters.status.toUpperCase();
  if (filters.itemId) where.itemId = filters.itemId;

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
 * Get transfer by ID.
 */
async function getTransferById(id) {
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: {
      sourceLocation: true,
      destinationLocation: true,
      item: true,
      createdBy: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  if (!transfer) {
    throw NotFoundError(`Stock Transfer with ID ${id} not found`);
  }

  return transfer;
}

module.exports = {
  requestTransfer,
  dispatchTransfer,
  receiveTransfer,
  listTransfers,
  getTransferById,
};
