import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

const createOrderSchema = z.object({
  body: z.object({
    customerName: z.string().min(1, 'Customer name is required'),
    locationId: z.string().min(1, 'locationId is required'),
    items: z
      .array(
        z.object({
          itemId: z.string().min(1, 'itemId is required'),
          batchNumber: z.string().optional(),
          quantity: z.number().positive('Quantity must be greater than zero'),
          unitPrice: z.number().nonnegative().optional(),
        })
      )
      .min(1, 'Order must contain at least one item'),
  }),
});

// View orders (Admin, Operations, Sales)
router.get('/', authenticate, OrderController.listOrders);
router.get('/:id', authenticate, OrderController.getOrderById);

// Create Customer Order (Sales & Admin)
router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'SALES'),
  validate(createOrderSchema),
  OrderController.createOrder
);

// Reserve Stock (Sales & Admin)
router.post(
  '/:id/reserve',
  authenticate,
  requireRole('ADMIN', 'SALES'),
  OrderController.reserveStock
);

// Cancel Order & Release Stock (Sales & Admin)
router.post(
  '/:id/cancel',
  authenticate,
  requireRole('ADMIN', 'SALES'),
  OrderController.cancelOrder
);

// Fulfill Order (Admin & Operations)
router.post(
  '/:id/fulfill',
  authenticate,
  requireRole('ADMIN', 'OPERATIONS'),
  OrderController.fulfillOrder
);

export default router;
