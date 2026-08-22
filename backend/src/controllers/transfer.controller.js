"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferController = void 0;
const transfer_service_1 = require("../services/transfer.service");
class TransferController {
    static async requestTransfer(req, res, next) {
        try {
            const { sourceLocationId, destinationLocationId, itemId, batchNumber, quantity } = req.body;
            const data = await transfer_service_1.TransferService.requestTransfer({
                sourceLocationId,
                destinationLocationId,
                itemId,
                batchNumber,
                quantity: Number(quantity),
                userId: req.user?.id,
            });
            res.status(201).json({
                success: true,
                message: 'Internal stock transfer requested successfully',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async dispatchTransfer(req, res, next) {
        try {
            const data = await transfer_service_1.TransferService.dispatchTransfer(req.params.id, req.user?.id);
            res.status(200).json({
                success: true,
                message: 'Transfer successfully dispatched. Source inventory reduced.',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async receiveTransfer(req, res, next) {
        try {
            const data = await transfer_service_1.TransferService.receiveTransfer(req.params.id, req.user?.id);
            res.status(200).json({
                success: true,
                message: 'Transfer successfully received. Destination inventory updated.',
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async listTransfers(req, res, next) {
        try {
            const { sourceLocationId, destinationLocationId, status, itemId } = req.query;
            const data = await transfer_service_1.TransferService.listTransfers({
                sourceLocationId: sourceLocationId,
                destinationLocationId: destinationLocationId,
                status: status,
                itemId: itemId,
            });
            res.status(200).json({ success: true, count: data.length, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async getTransferById(req, res, next) {
        try {
            const data = await transfer_service_1.TransferService.getTransferById(req.params.id);
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.TransferController = TransferController;
