"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventory_controller_1 = require("../controllers/inventory.controller");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const stockInSchema = zod_1.z.object({
    body: zod_1.z.object({
        itemId: zod_1.z.string().min(1, 'itemId is required'),
        locationId: zod_1.z.string().min(1, 'locationId is required'),
        batchNumber: zod_1.z.string().min(1, 'batchNumber is required'),
        quantity: zod_1.z.number().positive('Quantity must be positive'),
        notes: zod_1.z.string().optional(),
    }),
});
const adjustStockSchema = zod_1.z.object({
    body: zod_1.z.object({
        itemId: zod_1.z.string().min(1, 'itemId is required'),
        locationId: zod_1.z.string().min(1, 'locationId is required'),
        batchNumber: zod_1.z.string().min(1, 'batchNumber is required'),
        newPhysicalQuantity: zod_1.z.number().nonnegative('Physical quantity cannot be negative'),
        notes: zod_1.z.string().optional(),
    }),
});
// Read endpoints accessible by all authenticated roles (Admin, Operations, Sales)
router.get('/', auth_1.authenticate, inventory_controller_1.InventoryController.getInventory);
router.get('/summary', auth_1.authenticate, inventory_controller_1.InventoryController.getStockSummary);
router.get('/locations', auth_1.authenticate, inventory_controller_1.InventoryController.getLocations);
router.get('/items', auth_1.authenticate, inventory_controller_1.InventoryController.getItems);
router.get('/transactions', auth_1.authenticate, inventory_controller_1.InventoryController.getTransactions);
// Mutations restricted to Admin & Operations
router.post('/stock-in', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'OPERATIONS'), (0, validate_1.validate)(stockInSchema), inventory_controller_1.InventoryController.stockIn);
router.post('/adjust', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'OPERATIONS'), (0, validate_1.validate)(adjustStockSchema), inventory_controller_1.InventoryController.adjustStock);
exports.default = router;
