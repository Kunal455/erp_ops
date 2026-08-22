"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_1 = require("../controllers/order.controller");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const createOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        customerName: zod_1.z.string().min(1, 'Customer name is required'),
        locationId: zod_1.z.string().min(1, 'locationId is required'),
        items: zod_1.z
            .array(zod_1.z.object({
            itemId: zod_1.z.string().min(1, 'itemId is required'),
            batchNumber: zod_1.z.string().optional(),
            quantity: zod_1.z.number().positive('Quantity must be greater than zero'),
            unitPrice: zod_1.z.number().nonnegative().optional(),
        }))
            .min(1, 'Order must contain at least one item'),
    }),
});
// View orders (Admin, Operations, Sales)
router.get('/', auth_1.authenticate, order_controller_1.OrderController.listOrders);
router.get('/:id', auth_1.authenticate, order_controller_1.OrderController.getOrderById);
// Create Customer Order (Sales & Admin)
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'SALES'), (0, validate_1.validate)(createOrderSchema), order_controller_1.OrderController.createOrder);
// Reserve Stock (Sales & Admin)
router.post('/:id/reserve', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'SALES'), order_controller_1.OrderController.reserveStock);
// Cancel Order & Release Stock (Sales & Admin)
router.post('/:id/cancel', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'SALES'), order_controller_1.OrderController.cancelOrder);
// Fulfill Order (Admin & Operations)
router.post('/:id/fulfill', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'OPERATIONS'), order_controller_1.OrderController.fulfillOrder);
exports.default = router;
