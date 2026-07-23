import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new AuthController();
router.post('/register', asyncHandler(controller.register));
router.post('/login', asyncHandler(controller.login));
export default router;
