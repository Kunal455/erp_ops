import { Request, Response, NextFunction } from 'express';
import { WorkOrderService } from '../services/workOrder.service';

export class WorkOrderController {
  static async createWorkOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId, itemId, requiredQuantity, assignedUserId, notes, materials } = req.body;
      const data = await WorkOrderService.createWorkOrder({
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
    } catch (error) {
      next(error);
    }
  }

  static async listWorkOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId, status } = req.query;
      const data = await WorkOrderService.listWorkOrders({
        locationId: locationId as string,
        status: status as string,
      });
      res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
      next(error);
    }
  }

  static async getWorkOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await WorkOrderService.getWorkOrderById(req.params.id as string);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async calculateStockCheck(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId, itemId, requiredQuantity } = req.query;
      const data = await WorkOrderService.calculateMaterialStockCheck(
        locationId as string,
        itemId as string,
        Number(requiredQuantity || 1)
      );
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const data = await WorkOrderService.updateStatus(req.params.id as string, status, req.user?.id);
      res.status(200).json({
        success: true,
        message: `Work Order status updated to ${status}`,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
