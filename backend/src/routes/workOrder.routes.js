"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const workOrder_controller_1 = require("../controllers/workOrder.controller");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const createWorkOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        locationId: zod_1.z.string().min(1, 'locationId is required'),
        itemId: zod_1.z.string().min(1, 'itemId is required'),
        requiredQuantity: zod_1.z.number().positive('Required quantity must be positive'),
        assignedUserId: zod_1.z.string().optional(),
        notes: zod_1.z.string().optional(),
        materials: zod_1.z
            .array(zod_1.z.object({
            materialItemId: zod_1.z.string(),
            requiredQuantity: zod_1.z.number().positive(),
        }))
            .optional(),
    }),
});
const updateStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    }),
});
// Calculate real-time stock shortage
router.get('/stock-check', auth_1.authenticate, workOrder_controller_1.WorkOrderController.calculateStockCheck);
// List and get details
router.get('/', auth_1.authenticate, workOrder_controller_1.WorkOrderController.listWorkOrders);
router.get('/:id', auth_1.authenticate, workOrder_controller_1.WorkOrderController.getWorkOrderById);
// Create Work Order (Admin Only as per requirements: "Admin can create Work Orders")
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), (0, validate_1.validate)(createWorkOrderSchema), workOrder_controller_1.WorkOrderController.createWorkOrder);
// Update Status (Admin & Operations)
router.patch('/:id/status', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'OPERATIONS'), (0, validate_1.validate)(updateStatusSchema), workOrder_controller_1.WorkOrderController.updateStatus);
exports.default = router;
