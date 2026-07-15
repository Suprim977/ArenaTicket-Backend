import { Router } from 'express';
import { AuthController } from '../dtos/auth.controller';
import { authenticate } from '../../../middlewares/auth';

const router = Router();
const authController = new AuthController();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);

export default router;