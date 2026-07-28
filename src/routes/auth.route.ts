import { Router } from 'express';
import { authController } from '../controllers/auth.controller';

const router = Router();

router.post('/request-password-reset', authController.sendResetPasswordEmail.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));

export default router;
