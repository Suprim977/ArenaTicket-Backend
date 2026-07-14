import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();
const userController = new UserController();

router.patch('/profile', authenticate, userController.updateProfile);
router.patch('/change-password', authenticate, userController.changePassword);

export default router;