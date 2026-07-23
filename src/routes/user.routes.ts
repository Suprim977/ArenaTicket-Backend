import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new UserController();
router.use(authenticate);
router.get('/me', asyncHandler(controller.me));
router.put('/me', asyncHandler(controller.updateMe));
export default router;
