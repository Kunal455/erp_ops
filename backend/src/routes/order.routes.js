const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');
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

// View Customer Orders (ADMIN, SALES_USER)
router.get('/:id', requireAuth, requireRole('ADMIN', 'SALES_USER'), orderController.getOrderById);
router.get('/', requireAuth, requireRole('ADMIN', 'SALES_USER'), orderController.listOrders);

// Create Customer Order & Reserve Stock (SALES_USER ONLY)
router.post(
  '/',
  requireAuth,
  requireRole('SALES_USER'),
  validate(createOrderSchema),
  orderController.createOrder
);

router.post(
  '/:id/reserve',
  requireAuth,
  requireRole('SALES_USER'),
  orderController.reserveStock
);

router.post(
  '/:id/cancel',
  requireAuth,
  requireRole('SALES_USER', 'ADMIN'),
  orderController.cancelOrder
);

router.post(
  '/:id/fulfill',
  requireAuth,
  requireRole('SALES_USER', 'ADMIN'),
  orderController.fulfillOrder
);

module.exports = router;
