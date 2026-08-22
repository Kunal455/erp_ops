import { Router } from 'express';
import { TransferController } from '../controllers/transfer.controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

const createTransferSchema = z.object({
  body: z.object({
    sourceLocationId: z.string().min(1, 'sourceLocationId is required'),
    destinationLocationId: z.string().min(1, 'destinationLocationId is required'),
    itemId: z.string().min(1, 'itemId is required'),
    batchNumber: z.string().min(1, 'batchNumber is required'),
    quantity: z.number().positive('Quantity must be greater than zero'),
  }),
});

// Query transfers (Admin, Operations, Sales)
router.get('/', authenticate, TransferController.listTransfers);
router.get('/:id', authenticate, TransferController.getTransferById);

// Transfer management restricted to Operations & Admin
router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'OPERATIONS'),
  validate(createTransferSchema),
  TransferController.requestTransfer
);

router.post(
  '/:id/dispatch',
  authenticate,
  requireRole('ADMIN', 'OPERATIONS'),
  TransferController.dispatchTransfer
);

router.post(
  '/:id/receive',
  authenticate,
  requireRole('ADMIN', 'OPERATIONS'),
  TransferController.receiveTransfer
);

export default router;
