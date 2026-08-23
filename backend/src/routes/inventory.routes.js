const { Router } = require('express');
const inventoryController = require('../controllers/inventory.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');
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

// View Inventory (ADMIN, OPERATIONS_USER, SALES_USER)
router.get('/locations', requireAuth, requireRole('ADMIN', 'OPERATIONS_USER', 'SALES_USER'), inventoryController.getLocations);
router.get('/items', requireAuth, requireRole('ADMIN', 'OPERATIONS_USER', 'SALES_USER'), inventoryController.getItems);
router.get('/summary', requireAuth, requireRole('ADMIN', 'OPERATIONS_USER', 'SALES_USER'), inventoryController.getStockSummary);
router.get('/transactions', requireAuth, requireRole('ADMIN', 'OPERATIONS_USER', 'SALES_USER'), inventoryController.getTransactions);
router.get('/', requireAuth, requireRole('ADMIN', 'OPERATIONS_USER', 'SALES_USER'), inventoryController.getInventory);

// Modify Inventory (OPERATIONS_USER ONLY)
router.post(
  '/stock-in',
  requireAuth,
  requireRole('OPERATIONS_USER'),
  validate(stockInSchema),
  inventoryController.stockIn
);

router.patch(
  '/adjust',
  requireAuth,
  requireRole('OPERATIONS_USER'),
  validate(adjustStockSchema),
  inventoryController.adjustStock
);

module.exports = router;
