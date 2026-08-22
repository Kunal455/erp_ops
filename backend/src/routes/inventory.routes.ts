import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

const stockInSchema = z.object({
  body: z.object({
    itemId: z.string().min(1, 'itemId is required'),
    locationId: z.string().min(1, 'locationId is required'),
    batchNumber: z.string().min(1, 'batchNumber is required'),
    quantity: z.number().positive('Quantity must be positive'),
    notes: z.string().optional(),
  }),
});

const adjustStockSchema = z.object({
  body: z.object({
    itemId: z.string().min(1, 'itemId is required'),
    locationId: z.string().min(1, 'locationId is required'),
    batchNumber: z.string().min(1, 'batchNumber is required'),
    newPhysicalQuantity: z.number().nonnegative('Physical quantity cannot be negative'),
    notes: z.string().optional(),
  }),
});

// Read endpoints accessible by all authenticated roles (Admin, Operations, Sales)
router.get('/', authenticate, InventoryController.getInventory);
router.get('/summary', authenticate, InventoryController.getStockSummary);
router.get('/locations', authenticate, InventoryController.getLocations);
router.get('/items', authenticate, InventoryController.getItems);
router.get('/transactions', authenticate, InventoryController.getTransactions);

// Mutations restricted to Admin & Operations
router.post('/stock-in', authenticate, requireRole('ADMIN', 'OPERATIONS'), validate(stockInSchema), InventoryController.stockIn);
router.post('/adjust', authenticate, requireRole('ADMIN', 'OPERATIONS'), validate(adjustStockSchema), InventoryController.adjustStock);

export default router;
