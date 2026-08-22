import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';

export class OrderController {
  static async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { customerName, locationId, items } = req.body;
      const data = await OrderService.createOrder({
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
    } catch (error) {
      next(error);
    }
  }

  static async reserveStock(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrderService.reserveOrderStock(req.params.id as string, req.user?.id);
      res.status(200).json({
        success: true,
        message: 'Stock successfully reserved for customer order',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrderService.cancelOrder(req.params.id as string, req.user?.id);
      res.status(200).json({
        success: true,
        message: 'Customer Order cancelled and reserved stock released',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async fulfillOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrderService.fulfillOrder(req.params.id as string, req.user?.id);
      res.status(200).json({
        success: true,
        message: 'Customer Order fulfilled and physical stock consumed',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId, status } = req.query;
      const data = await OrderService.listOrders({
        locationId: locationId as string,
        status: status as string,
      });
      res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
      next(error);
    }
  }

  static async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrderService.getOrderById(req.params.id as string);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
