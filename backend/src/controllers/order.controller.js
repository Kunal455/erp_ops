"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const order_service_1 = require("../services/order.service");
class OrderController {
    static async createOrder(req, res, next) {
        try {
            const { customerName, locationId, items } = req.body;
            const data = await order_service_1.OrderService.createOrder({
                customerName,
                locationId,
                items,
                userId: req.user?.id,
            });
            res.status(201).json({
                success: true,
                message: 'Customer Order created successfully in DRAFT status',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async reserveStock(req, res, next) {
        try {
            const data = await order_service_1.OrderService.reserveOrderStock(req.params.id, req.user?.id);
            res.status(200).json({
                success: true,
                message: 'Stock successfully reserved for customer order',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async cancelOrder(req, res, next) {
        try {
            const data = await order_service_1.OrderService.cancelOrder(req.params.id, req.user?.id);
            res.status(200).json({
                success: true,
                message: 'Customer Order cancelled and reserved stock released',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async fulfillOrder(req, res, next) {
        try {
            const data = await order_service_1.OrderService.fulfillOrder(req.params.id, req.user?.id);
            res.status(200).json({
                success: true,
                message: 'Customer Order fulfilled and physical stock consumed',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async listOrders(req, res, next) {
        try {
            const { locationId, status } = req.query;
            const data = await order_service_1.OrderService.listOrders({
                locationId: locationId,
                status: status,
            });
            res.status(200).json({ success: true, count: data.length, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async getOrderById(req, res, next) {
        try {
            const data = await order_service_1.OrderService.getOrderById(req.params.id);
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.OrderController = OrderController;
