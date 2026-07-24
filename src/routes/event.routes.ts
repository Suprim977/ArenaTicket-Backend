import { Router } from 'express';
import { EventController } from '../controllers/EventController';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { asyncHandler } from '../utils/asyncHandler';
import { upload } from '../middlewares/upload';

const router = Router();
const controller = new EventController();
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getOne));
router.post('/', authenticate, authorize('admin'), upload.single('eventImage'), asyncHandler(controller.create));
router.patch('/:id', authenticate, authorize('admin'), upload.single('eventImage'), asyncHandler(controller.update));
router.put('/:id', authenticate, authorize('admin'), upload.single('eventImage'), asyncHandler(controller.update));
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(controller.remove));
export default router;
