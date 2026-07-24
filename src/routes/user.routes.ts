import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new UserController();
router.use(authenticate);
router.get('/profile', asyncHandler(controller.getProfile));
router.get('/dashboard', asyncHandler(controller.dashboard));
router.patch('/profile', asyncHandler(controller.updateProfile));
router.get('/me', asyncHandler(controller.getProfile));
router.put('/me', asyncHandler(controller.updateProfile));
router.patch(
  '/profile/photo',
  upload.single('profilePicture'),
  asyncHandler(controller.updateProfilePicture)
);
router.delete('/profile/photo', asyncHandler(controller.deleteProfilePicture));
export default router;
