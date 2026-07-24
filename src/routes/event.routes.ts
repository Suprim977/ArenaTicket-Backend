import { Router } from 'express';
import { EventController } from '../controllers/EventController';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new EventController();
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getOne));
router.post('/', authenticate, authorize('admin'), asyncHandler(controller.create));
router.patch('/:id', authenticate, authorize('admin'), asyncHandler(controller.update));
router.put('/:id', authenticate, authorize('admin'), asyncHandler(controller.update));
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(controller.remove));
export default router;
