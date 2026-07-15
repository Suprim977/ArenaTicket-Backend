import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { authorize } from '../../../middlewares/authorize';
import { upload } from '../../../middlewares/upload';
import { UploadController } from '../controllers/upload.controller';

const router = Router();
const uploadController = new UploadController();

router.post('/tournament-banner', authenticate, authorize('ADMIN'), upload.single('banner'), uploadController.uploadTournamentBanner);
router.post('/profile-picture', authenticate, upload.single('profilePicture'), uploadController.uploadProfilePicture);

export default router;