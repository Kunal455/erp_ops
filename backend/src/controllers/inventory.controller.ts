import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service';

export class InventoryController {
  static async getInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId, itemId, category, search } = req.query;
      const data = await InventoryService.getInventory({
        locationId: locationId as string,
        itemId: itemId as string,
        category: category as string,
        search: search as string,
      });
      res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
      next(error);
    }
  }

  static async getStockSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { itemId } = req.query;
      const data = await InventoryService.getStockSummary(itemId as string);
      res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
      next(error);
    }
  }

  static async stockIn(req: Request, res: Response, next: NextFunction) {
    try {
      const { itemId, locationId, batchNumber, quantity, notes } = req.body;
      const data = await InventoryService.stockIn({
        itemId,
        locationId,
        batchNumber,
        quantity: Number(quantity),
        userId: req.user?.id,
        notes,
      });
      res.status(201).json({
        success: true,
        message: 'Stock successfully added to inventory',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { itemId, locationId, batchNumber, newPhysicalQuantity, notes } = req.body;
      const data = await InventoryService.adjustStock({
        itemId,
        locationId,
        batchNumber,
        newPhysicalQuantity: Number(newPhysicalQuantity),
        userId: req.user?.id,
        notes,
      });
      res.status(200).json({
        success: true,
        message: 'Stock adjusted successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await InventoryService.getLocations();
      res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
      next(error);
    }
  }

  static async getItems(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await InventoryService.getItems();
      res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
      next(error);
    }
  }

  static async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId, itemId, type, limit } = req.query;
      const data = await InventoryService.getTransactions({
        locationId: locationId as string,
        itemId: itemId as string,
        type: type as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
      next(error);
    }
  }
}
