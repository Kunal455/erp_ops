"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transfer_controller_1 = require("../controllers/transfer.controller");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const createTransferSchema = zod_1.z.object({
    body: zod_1.z.object({
        sourceLocationId: zod_1.z.string().min(1, 'sourceLocationId is required'),
        destinationLocationId: zod_1.z.string().min(1, 'destinationLocationId is required'),
        itemId: zod_1.z.string().min(1, 'itemId is required'),
        batchNumber: zod_1.z.string().min(1, 'batchNumber is required'),
        quantity: zod_1.z.number().positive('Quantity must be greater than zero'),
    }),
});
// Query transfers (Admin, Operations, Sales)
router.get('/', auth_1.authenticate, transfer_controller_1.TransferController.listTransfers);
router.get('/:id', auth_1.authenticate, transfer_controller_1.TransferController.getTransferById);
// Transfer management restricted to Operations & Admin
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'OPERATIONS'), (0, validate_1.validate)(createTransferSchema), transfer_controller_1.TransferController.requestTransfer);
router.post('/:id/dispatch', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'OPERATIONS'), transfer_controller_1.TransferController.dispatchTransfer);
router.post('/:id/receive', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN', 'OPERATIONS'), transfer_controller_1.TransferController.receiveTransfer);
exports.default = router;
