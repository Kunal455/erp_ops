const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { z } = require('zod');

const router = Router();

const createOrderSchema = z.object({
  body: z.object({
    customerName: z.string().min(1, 'Customer name is required'),
    locationId: z.string().min(1, 'Location ID is required'),
    items: z
      .array(
        z.object({
          itemId: z.string().min(1, 'Item ID is required'),
          batchNumber: z.string().optional(),
          quantity: z.number().positive('Quantity must be greater than zero'),
          unitPrice: z.number().nonnegative().optional(),
        })
      )
      .min(1, 'At least one order item is required'),
  }),
});

router.get('/:id', authenticate, requireRole('ADMIN', 'SALES'), orderController.getOrderById);
router.get('/', authenticate, requireRole('ADMIN', 'SALES'), orderController.listOrders);

router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'SALES'),
  validate(createOrderSchema),
  orderController.createOrder
);

router.post(
  '/:id/reserve',
  authenticate,
  requireRole('ADMIN', 'SALES'),
  orderController.reserveStock
);

router.post(
  '/:id/cancel',
  authenticate,
  requireRole('ADMIN', 'SALES'),
  orderController.cancelOrder
);

router.post(
  '/:id/fulfill',
  authenticate,
  requireRole('ADMIN', 'SALES'),
  orderController.fulfillOrder
);

module.exports = router;
