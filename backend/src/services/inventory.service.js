"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const config_1 = require("../config");
const errors_1 = require("../utils/errors");
class InventoryService {
    /**
     * Get all inventory items aggregated and by batch with calculated availableQuantity.
     */
    static async getInventory(filters) {
        const whereClause = {};
        if (filters?.locationId) {
            whereClause.locationId = filters.locationId;
        }
        if (filters?.itemId) {
            whereClause.itemId = filters.itemId;
        }
        if (filters?.category) {
            whereClause.item = {
                category: filters.category,
            };
        }
        if (filters?.search) {
            whereClause.OR = [
                { item: { name: { contains: filters.search } } },
                { item: { sku: { contains: filters.search } } },
                { batchNumber: { contains: filters.search } },
            ];
        }
        const records = await config_1.prisma.inventory.findMany({
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
                updatedAt: inv.updatedAt,
            };
        });
    }
    /**
     * Get aggregated stock summary across all locations or for a specific item.
     */
    static async getStockSummary(itemId) {
        const records = await config_1.prisma.inventory.findMany({
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
     * Receive new physical stock into inventory (Operations / Admin).
     */
    static async stockIn(dto) {
        if (dto.quantity <= 0) {
            throw new errors_1.BadRequestError('Quantity must be greater than zero');
        }
        const item = await config_1.prisma.item.findUnique({ where: { id: dto.itemId } });
        if (!item)
            throw new errors_1.NotFoundError(`Item with ID ${dto.itemId} not found`);
        const location = await config_1.prisma.location.findUnique({ where: { id: dto.locationId } });
        if (!location)
            throw new errors_1.NotFoundError(`Location with ID ${dto.locationId} not found`);
        return await config_1.prisma.$transaction(async (tx) => {
            const existing = await tx.inventory.findUnique({
                where: {
                    itemId_locationId_batchNumber: {
                        itemId: dto.itemId,
                        locationId: dto.locationId,
                        batchNumber: dto.batchNumber.trim(),
                    },
                },
            });
            let updatedInventory;
            if (existing) {
                updatedInventory = await tx.inventory.update({
                    where: { id: existing.id },
                    data: {
                        physicalQuantity: { increment: dto.quantity },
                    },
                });
            }
            else {
                updatedInventory = await tx.inventory.create({
                    data: {
                        itemId: dto.itemId,
                        locationId: dto.locationId,
                        batchNumber: dto.batchNumber.trim(),
                        physicalQuantity: dto.quantity,
                        reservedQuantity: 0,
                    },
                });
            }
            await tx.inventoryTransaction.create({
                data: {
                    itemId: dto.itemId,
                    locationId: dto.locationId,
                    batchNumber: dto.batchNumber.trim(),
                    type: 'STOCK_IN',
                    quantity: dto.quantity,
                    physicalBalanceAfter: updatedInventory.physicalQuantity,
                    reservedBalanceAfter: updatedInventory.reservedQuantity,
                    referenceType: 'MANUAL',
                    performedById: dto.userId || null,
                    notes: dto.notes || 'Manual stock in receipt',
                },
            });
            return {
                ...updatedInventory,
                availableQuantity: updatedInventory.physicalQuantity - updatedInventory.reservedQuantity,
            };
        });
    }
    /**
     * Adjust inventory count directly (cannot result in negative physical qty or physical < reserved).
     */
    static async adjustStock(dto) {
        if (dto.newPhysicalQuantity < 0) {
            throw new errors_1.BadRequestError('Physical quantity cannot be negative');
        }
        return await config_1.prisma.$transaction(async (tx) => {
            const existing = await tx.inventory.findUnique({
                where: {
                    itemId_locationId_batchNumber: {
                        itemId: dto.itemId,
                        locationId: dto.locationId,
                        batchNumber: dto.batchNumber.trim(),
                    },
                },
            });
            if (!existing) {
                throw new errors_1.NotFoundError('Inventory batch record not found to adjust');
            }
            if (dto.newPhysicalQuantity < existing.reservedQuantity) {
                throw new errors_1.BadRequestError(`Cannot adjust physical quantity to ${dto.newPhysicalQuantity} because ${existing.reservedQuantity} units are currently reserved`);
            }
            const diff = dto.newPhysicalQuantity - existing.physicalQuantity;
            const updated = await tx.inventory.update({
                where: { id: existing.id },
                data: {
                    physicalQuantity: dto.newPhysicalQuantity,
                },
            });
            await tx.inventoryTransaction.create({
                data: {
                    itemId: dto.itemId,
                    locationId: dto.locationId,
                    batchNumber: dto.batchNumber.trim(),
                    type: 'ADJUSTMENT',
                    quantity: diff,
                    physicalBalanceAfter: updated.physicalQuantity,
                    reservedBalanceAfter: updated.reservedQuantity,
                    referenceType: 'MANUAL',
                    performedById: dto.userId || null,
                    notes: dto.notes || `Manual stock adjustment of ${diff >= 0 ? '+' : ''}${diff}`,
                },
            });
            return {
                ...updated,
                availableQuantity: updated.physicalQuantity - updated.reservedQuantity,
            };
        });
    }
    /**
     * List all master locations.
     */
    static async getLocations() {
        return config_1.prisma.location.findMany({
            orderBy: { name: 'asc' },
        });
    }
    /**
     * List all master items.
     */
    static async getItems() {
        return config_1.prisma.item.findMany({
            include: {
                bomParents: {
                    include: { componentItem: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    /**
     * Get transaction audit logs.
     */
    static async getTransactions(filters) {
        const where = {};
        if (filters?.locationId)
            where.locationId = filters.locationId;
        if (filters?.itemId)
            where.itemId = filters.itemId;
        if (filters?.type)
            where.type = filters.type;
        return config_1.prisma.inventoryTransaction.findMany({
            where,
            include: {
                item: { select: { id: true, name: true, sku: true, uom: true } },
                location: { select: { id: true, name: true, code: true } },
                performedBy: { select: { id: true, name: true, email: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: filters?.limit || 100,
        });
    }
}
exports.InventoryService = InventoryService;
