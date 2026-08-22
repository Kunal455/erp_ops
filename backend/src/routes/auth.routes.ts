import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.getMe);
router.get('/users', authenticate, AuthController.listUsers);

export default router;
