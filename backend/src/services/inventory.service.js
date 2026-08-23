const { prisma } = require('../config');
const { BadRequestError, NotFoundError } = require('../utils/errors');

/**
 * Get all inventory items with calculated availableQuantity.
 */
async function getInventory(filters = {}) {
  const whereClause = {};

  if (filters.locationId) {
    whereClause.locationId = filters.locationId;
  }
  if (filters.itemId) {
    whereClause.itemId = filters.itemId;
  }
  if (filters.category) {
    whereClause.item = {
      category: filters.category,
    };
  }
  if (filters.search) {
    whereClause.OR = [
      { item: { name: { contains: filters.search } } },
      { item: { sku: { contains: filters.search } } },
      { batchNumber: { contains: filters.search } },
    ];
  }

  const records = await prisma.inventory.findMany({
    where: whereClause,
    include: {
      item: true,
      location: true,
    },
    orderBy: [
      { item: { name: 'asc' } },
      { location: { name: 'asc' } },
      { batchNumber: 'asc' },
    ],
  });

  return records.map((inv) => {
    const physicalQuantity = Number(inv.physicalQuantity);
    const reservedQuantity = Number(inv.reservedQuantity);
    const availableQuantity = Math.max(0, physicalQuantity - reservedQuantity);

    return {
      id: inv.id,
      itemId: inv.itemId,
      itemSku: inv.item.sku,
      itemName: inv.item.name,
      category: inv.item.category,
      uom: inv.item.uom,
      locationId: inv.locationId,
      locationName: inv.location.name,
      locationCode: inv.location.code,
      batchNumber: inv.batchNumber,
      physicalQuantity,
      reservedQuantity,
      availableQuantity,
      item: inv.item,
      location: inv.location,
      updatedAt: inv.updatedAt,
    };
  });
}

/**
 * Get aggregated stock summary across all locations or for a specific item.
 */
async function getStockSummary(itemId) {
  const records = await prisma.inventory.findMany({
    where: itemId ? { itemId } : {},
    include: { item: true, location: true },
  });

  const summaryMap = new Map();

  for (const rec of records) {
    const key = `${rec.itemId}-${rec.locationId}`;
    const physical = Number(rec.physicalQuantity);
    const reserved = Number(rec.reservedQuantity);

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        itemId: rec.itemId,
        itemName: rec.item.name,
        itemSku: rec.item.sku,
        category: rec.item.category,
        uom: rec.item.uom,
        locationId: rec.locationId,
        locationName: rec.location.name,
        locationCode: rec.location.code,
        totalPhysical: 0,
        totalReserved: 0,
        totalAvailable: 0,
        batches: [],
      });
    }

    const itemSummary = summaryMap.get(key);
    itemSummary.totalPhysical += physical;
    itemSummary.totalReserved += reserved;
    itemSummary.totalAvailable += Math.max(0, physical - reserved);
    itemSummary.batches.push({
      batchNumber: rec.batchNumber,
      physicalQuantity: physical,
      reservedQuantity: reserved,
      availableQuantity: Math.max(0, physical - reserved),
    });
  }

  return Array.from(summaryMap.values());
}

/**
 * Inward new stock (Stock-In) to a warehouse with audit transaction.
 */
async function stockIn(dto) {
  const { itemId, locationId, batchNumber, quantity, userId, notes } = dto;

  if (quantity <= 0) {
    throw BadRequestError('Stock-in quantity must be greater than zero');
  }

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw NotFoundError(`Item with ID ${itemId} not found`);

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) throw NotFoundError(`Location with ID ${locationId} not found`);

  return prisma.$transaction(async (tx) => {
    let inventory = await tx.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId,
          locationId,
          batchNumber,
        },
      },
    });

    if (inventory) {
      inventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          physicalQuantity: { increment: quantity },
        },
        include: { item: true, location: true },
      });
    } else {
      inventory = await tx.inventory.create({
        data: {
          itemId,
          locationId,
          batchNumber,
          physicalQuantity: quantity,
          reservedQuantity: 0,
        },
        include: { item: true, location: true },
      });
    }

    await tx.inventoryTransaction.create({
      data: {
        itemId,
        locationId,
        batchNumber,
        type: 'STOCK_IN',
        quantity,
        physicalBalanceAfter: inventory.physicalQuantity,
        reservedBalanceAfter: inventory.reservedQuantity,
        referenceType: 'MANUAL',
        performedById: userId || null,
        notes: notes || 'Manual warehouse stock inward',
      },
    });

    return {
      ...inventory,
      availableQuantity: inventory.physicalQuantity - inventory.reservedQuantity,
    };
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Adjust physical stock count (Cycle count / Adjustment).
 */
async function adjustStock(dto) {
  const { itemId, locationId, batchNumber, newPhysicalQuantity, userId, notes } = dto;

  if (newPhysicalQuantity < 0) {
    throw BadRequestError('Physical quantity cannot be negative');
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.inventory.findUnique({
      where: {
        itemId_locationId_batchNumber: {
          itemId,
          locationId,
          batchNumber,
        },
      },
    });

    if (!existing) {
      throw NotFoundError('Inventory batch record not found for adjustment');
    }

    if (newPhysicalQuantity < existing.reservedQuantity) {
      throw BadRequestError(
        `Cannot adjust physical quantity (${newPhysicalQuantity}) below currently reserved quantity (${existing.reservedQuantity})`
      );
    }

    const delta = newPhysicalQuantity - existing.physicalQuantity;

    const updated = await tx.inventory.update({
      where: { id: existing.id },
      data: { physicalQuantity: newPhysicalQuantity },
      include: { item: true, location: true },
    });

    await tx.inventoryTransaction.create({
      data: {
        itemId,
        locationId,
        batchNumber,
        type: 'ADJUSTMENT',
        quantity: delta,
        physicalBalanceAfter: updated.physicalQuantity,
        reservedBalanceAfter: updated.reservedQuantity,
        referenceType: 'MANUAL',
        performedById: userId || null,
        notes: notes || `Stock adjusted from ${existing.physicalQuantity} to ${newPhysicalQuantity}`,
      },
    });

    return {
      ...updated,
      availableQuantity: updated.physicalQuantity - updated.reservedQuantity,
    };
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Get all warehouse locations.
 */
async function getLocations() {
  return prisma.location.findMany({
    orderBy: { name: 'asc' },
  });
}

/**
 * Get master items list.
 */
async function getItems() {
  return prisma.item.findMany({
    include: {
      bomParents: {
        include: { componentItem: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Get inventory transaction history (audit log).
 */
async function getTransactions(filters = {}) {
  const where = {};
  if (filters.locationId) where.locationId = filters.locationId;
  if (filters.itemId) where.itemId = filters.itemId;
  if (filters.type) where.type = filters.type;

  return prisma.inventoryTransaction.findMany({
    where,
    include: {
      item: true,
      location: true,
      performedBy: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: filters.limit || 100,
  });
}

module.exports = {
  getInventory,
  getStockSummary,
  stockIn,
  adjustStock,
  getLocations,
  getItems,
  getTransactions,
};
