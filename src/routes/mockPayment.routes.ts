import { Router } from 'express';
import { MockPaymentController } from '../controllers/MockPaymentController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new MockPaymentController();

router.get('/:method', asyncHandler(controller.show));
router.post('/:method/success', asyncHandler(controller.success));
router.post('/:method/cancel', asyncHandler(controller.cancel));

export default router;
