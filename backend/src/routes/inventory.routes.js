const { Router } = require('express');
const inventoryController = require('../controllers/inventory.controller');
const { authenticate, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { z } = require('zod');

const router = Router();

const stockInSchema = z.object({
  body: z.object({
    itemId: z.string().min(1, 'Item ID is required'),
    locationId: z.string().min(1, 'Location ID is required'),
    batchNumber: z.string().min(1, 'Batch number is required'),
    quantity: z.number().positive('Quantity must be greater than zero'),
    notes: z.string().optional(),
  }),
});

const adjustStockSchema = z.object({
  body: z.object({
    itemId: z.string().min(1, 'Item ID is required'),
    locationId: z.string().min(1, 'Location ID is required'),
    batchNumber: z.string().min(1, 'Batch number is required'),
    newPhysicalQuantity: z.number().min(0, 'Physical quantity cannot be negative'),
    notes: z.string().optional(),
  }),
});

router.get('/locations', authenticate, inventoryController.getLocations);
router.get('/items', authenticate, inventoryController.getItems);
router.get('/summary', authenticate, inventoryController.getStockSummary);
router.get('/transactions', authenticate, inventoryController.getTransactions);

router.get('/', authenticate, inventoryController.getInventory);

router.post(
  '/stock-in',
  authenticate,
  requireRole('ADMIN', 'OPERATIONS'),
  validate(stockInSchema),
  inventoryController.stockIn
);

router.patch(
  '/adjust',
  authenticate,
  requireRole('ADMIN', 'OPERATIONS'),
  validate(adjustStockSchema),
  inventoryController.adjustStock
);

module.exports = router;
