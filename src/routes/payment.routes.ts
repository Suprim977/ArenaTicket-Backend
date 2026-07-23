import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new PaymentController();
router.post('/initiate', authenticate, asyncHandler(controller.initiate));
router.post('/verify', asyncHandler(controller.verify));
export default router;
