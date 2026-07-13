import { Router } from 'express';
import { AuthController } from './controller';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();
const authController = new AuthController();

// Public Routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected Routes (Requires Login)
router.get('/me', authenticate, authController.getMe);

export default router;