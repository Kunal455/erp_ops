import { Request, Response, NextFunction } from 'express';
import { TransferService } from '../services/transfer.service';

export class TransferController {
  static async requestTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const { sourceLocationId, destinationLocationId, itemId, batchNumber, quantity } = req.body;
      const data = await TransferService.requestTransfer({
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
    } catch (error) {
      next(error);
    }
  }

  static async dispatchTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await TransferService.dispatchTransfer(req.params.id as string, req.user?.id);
      res.status(200).json({
        success: true,
        message: 'Transfer successfully dispatched. Source inventory reduced.',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async receiveTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await TransferService.receiveTransfer(req.params.id as string, req.user?.id);
      res.status(200).json({
        success: true,
        message: 'Transfer successfully received. Destination inventory updated.',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listTransfers(req: Request, res: Response, next: NextFunction) {
    try {
      const { sourceLocationId, destinationLocationId, status, itemId } = req.query;
      const data = await TransferService.listTransfers({
        sourceLocationId: sourceLocationId as string,
        destinationLocationId: destinationLocationId as string,
        status: status as string,
        itemId: itemId as string,
      });
      res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
      next(error);
    }
  }

  static async getTransferById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await TransferService.getTransferById(req.params.id as string);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
