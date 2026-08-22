const { Router } = require('express');
const workOrderController = require('../controllers/workOrder.controller');
const { authenticate, requireRole } = require('../middlewares/auth');
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

router.get('/stock-check/calculate', authenticate, workOrderController.calculateStockCheck);
router.get('/:id', authenticate, workOrderController.getWorkOrderById);
router.get('/', authenticate, workOrderController.listWorkOrders);

router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate(createWorkOrderSchema),
  workOrderController.createWorkOrder
);

router.patch(
  '/:id/status',
  authenticate,
  requireRole('ADMIN'),
  validate(updateStatusSchema),
  workOrderController.updateStatus
);

module.exports = router;
