import { Router } from 'express';
import { WorkOrderController } from '../controllers/workOrder.controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

const createWorkOrderSchema = z.object({
  body: z.object({
    locationId: z.string().min(1, 'locationId is required'),
    itemId: z.string().min(1, 'itemId is required'),
    requiredQuantity: z.number().positive('Required quantity must be positive'),
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

// Calculate real-time stock shortage
router.get('/stock-check', authenticate, WorkOrderController.calculateStockCheck);

// List and get details
router.get('/', authenticate, WorkOrderController.listWorkOrders);
router.get('/:id', authenticate, WorkOrderController.getWorkOrderById);

// Create Work Order (Admin Only as per requirements: "Admin can create Work Orders")
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate(createWorkOrderSchema),
  WorkOrderController.createWorkOrder
);

// Update Status (Admin & Operations)
router.patch(
  '/:id/status',
  authenticate,
  requireRole('ADMIN', 'OPERATIONS'),
  validate(updateStatusSchema),
  WorkOrderController.updateStatus
);

export default router;
