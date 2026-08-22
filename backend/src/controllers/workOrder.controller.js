"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkOrderController = void 0;
const workOrder_service_1 = require("../services/workOrder.service");
class WorkOrderController {
    static async createWorkOrder(req, res, next) {
        try {
            const { locationId, itemId, requiredQuantity, assignedUserId, notes, materials } = req.body;
            const data = await workOrder_service_1.WorkOrderService.createWorkOrder({
                locationId,
                itemId,
                requiredQuantity: Number(requiredQuantity),
                assignedUserId,
                notes,
                materials,
            });
            res.status(201).json({
                success: true,
                message: 'Work Order created successfully',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async listWorkOrders(req, res, next) {
        try {
            const { locationId, status } = req.query;
            const data = await workOrder_service_1.WorkOrderService.listWorkOrders({
                locationId: locationId,
                status: status,
            });
            res.status(200).json({ success: true, count: data.length, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async getWorkOrderById(req, res, next) {
        try {
            const data = await workOrder_service_1.WorkOrderService.getWorkOrderById(req.params.id);
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async calculateStockCheck(req, res, next) {
        try {
            const { locationId, itemId, requiredQuantity } = req.query;
            const data = await workOrder_service_1.WorkOrderService.calculateMaterialStockCheck(locationId, itemId, Number(requiredQuantity || 1));
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateStatus(req, res, next) {
        try {
            const { status } = req.body;
            const data = await workOrder_service_1.WorkOrderService.updateStatus(req.params.id, status, req.user?.id);
            res.status(200).json({
                success: true,
                message: `Work Order status updated to ${status}`,
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.WorkOrderController = WorkOrderController;
