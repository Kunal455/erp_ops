const { Router } = require('express');
const workOrderController = require('../controllers/workOrder.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { z } = require('zod');

const router = Router();

const createWorkOrderSchema = z.object({
  body: z.object({
    locationId: z.string().min(1, 'Location ID is required'),
    itemId: z.string().min(1, 'Item ID is required'),
    requiredQuantity: z.number().positive('Required quantity must be greater than zero'),
    assignedUserId: z.string().optional(),
    notes: z.string().optional(),
    materials: z
      .array(
        z.object({
          materialItemId: z.string(),
          requiredQuantity: z.number().positive(),
        })
      )
      .optional(),
  }),
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  }),
});

// View Work Orders (ADMIN, OPERATIONS_USER)
router.get('/stock-check/calculate', requireAuth, requireRole('ADMIN', 'OPERATIONS_USER'), workOrderController.calculateStockCheck);
router.get('/:id', requireAuth, requireRole('ADMIN', 'OPERATIONS_USER'), workOrderController.getWorkOrderById);
router.get('/', requireAuth, requireRole('ADMIN', 'OPERATIONS_USER'), workOrderController.listWorkOrders);

// Create Work Order (ADMIN ONLY)
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(createWorkOrderSchema),
  workOrderController.createWorkOrder
);

// Update Status (ADMIN ONLY)
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateStatusSchema),
  workOrderController.updateStatus
);

module.exports = router;
