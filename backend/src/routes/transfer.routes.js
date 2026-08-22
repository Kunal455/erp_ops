const { Router } = require('express');
const transferController = require('../controllers/transfer.controller');
const { authenticate, requireRole } = require('../middlewares/auth');
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

router.get('/:id', authenticate, requireRole('ADMIN', 'OPERATIONS'), transferController.getTransferById);
router.get('/', authenticate, requireRole('ADMIN', 'OPERATIONS'), transferController.listTransfers);

router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'OPERATIONS'),
  validate(transferRequestSchema),
  transferController.requestTransfer
);

router.post(
  '/:id/dispatch',
  authenticate,
  requireRole('ADMIN', 'OPERATIONS'),
  transferController.dispatchTransfer
);

router.post(
  '/:id/receive',
  authenticate,
  requireRole('ADMIN', 'OPERATIONS'),
  transferController.receiveTransfer
);

module.exports = router;
