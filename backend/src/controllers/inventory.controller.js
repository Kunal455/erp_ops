"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const inventory_service_1 = require("../services/inventory.service");
class InventoryController {
    static async getInventory(req, res, next) {
        try {
            const { locationId, itemId, category, search } = req.query;
            const data = await inventory_service_1.InventoryService.getInventory({
                locationId: locationId,
                itemId: itemId,
                category: category,
                search: search,
            });
            res.status(200).json({ success: true, count: data.length, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async getStockSummary(req, res, next) {
        try {
            const { itemId } = req.query;
            const data = await inventory_service_1.InventoryService.getStockSummary(itemId);
            res.status(200).json({ success: true, count: data.length, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async stockIn(req, res, next) {
        try {
            const { itemId, locationId, batchNumber, quantity, notes } = req.body;
            const data = await inventory_service_1.InventoryService.stockIn({
                itemId,
                locationId,
                batchNumber,
                quantity: Number(quantity),
                userId: req.user?.id,
                notes,
            });
            res.status(201).json({
                success: true,
                message: 'Stock successfully added to inventory',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async adjustStock(req, res, next) {
        try {
            const { itemId, locationId, batchNumber, newPhysicalQuantity, notes } = req.body;
            const data = await inventory_service_1.InventoryService.adjustStock({
                itemId,
                locationId,
                batchNumber,
                newPhysicalQuantity: Number(newPhysicalQuantity),
                userId: req.user?.id,
                notes,
            });
            res.status(200).json({
                success: true,
                message: 'Stock adjusted successfully',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getLocations(req, res, next) {
        try {
            const data = await inventory_service_1.InventoryService.getLocations();
            res.status(200).json({ success: true, count: data.length, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async getItems(req, res, next) {
        try {
            const data = await inventory_service_1.InventoryService.getItems();
            res.status(200).json({ success: true, count: data.length, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async getTransactions(req, res, next) {
        try {
            const { locationId, itemId, type, limit } = req.query;
            const data = await inventory_service_1.InventoryService.getTransactions({
                locationId: locationId,
                itemId: itemId,
                type: type,
                limit: limit ? parseInt(limit, 10) : undefined,
            });
            res.status(200).json({ success: true, count: data.length, data });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.InventoryController = InventoryController;
