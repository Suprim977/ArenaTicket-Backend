import { Router } from 'express';
import { AuthController } from '../dtos/auth.controller';
import { authenticate } from '../../../middlewares/auth';

const router = Router();
const authController = new AuthController();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.patch('/profile', authenticate, authController.updateProfile);
router.patch('/change-password', authenticate, authController.changePassword);

export default router;