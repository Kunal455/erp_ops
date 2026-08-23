const { Router } = require('express');
const transferController = require('../controllers/transfer.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { z } = require('zod');

const router = Router();

const transferRequestSchema = z.object({
  body: z.object({
    sourceLocationId: z.string().min(1, 'Source location ID is required'),
    destinationLocationId: z.string().min(1, 'Destination location ID is required'),
    itemId: z.string().min(1, 'Item ID is required'),
    batchNumber: z.string().min(1, 'Batch number is required'),
    quantity: z.number().positive('Quantity must be greater than zero'),
  }),
});

// View Transfers (ADMIN, OPERATIONS_USER)
router.get('/:id', requireAuth, requireRole('ADMIN', 'OPERATIONS_USER'), transferController.getTransferById);
router.get('/', requireAuth, requireRole('ADMIN', 'OPERATIONS_USER'), transferController.listTransfers);

// Create, Dispatch & Receive Transfers (OPERATIONS_USER ONLY)
router.post(
  '/',
  requireAuth,
  requireRole('OPERATIONS_USER'),
  validate(transferRequestSchema),
  transferController.requestTransfer
);

router.post(
  '/:id/dispatch',
  requireAuth,
  requireRole('OPERATIONS_USER'),
  transferController.dispatchTransfer
);

router.post(
  '/:id/receive',
  requireAuth,
  requireRole('OPERATIONS_USER'),
  transferController.receiveTransfer
);

module.exports = router;
