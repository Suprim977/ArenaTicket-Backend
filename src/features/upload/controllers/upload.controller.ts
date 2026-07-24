import { NextFunction, Response } from 'express';
import { AuthRequest } from '../../../middlewares/auth';
import { AppError } from '../../../middlewares/errorHandler';
import { sendSuccess } from '../../../utils/response';
import { UploadService } from '../services/upload.service';
import { UserService } from '../../user/service/user.service';

export class UploadController {
  private uploadService: UploadService;
  private userService: UserService;

  constructor() {
    this.uploadService = new UploadService();
    this.userService = new UserService();
  }

  uploadTournamentBanner = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new AppError('Banner image is required', 400);
      }

      const result = this.uploadService.buildFileResponse(req.file);
      sendSuccess(res, result, 'Tournament banner uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  uploadProfilePicture = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new AppError('Profile picture is required', 400);
      }

      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }
      const profilePicture = `/uploads/users/${req.file.filename}`;
      const user = await this.userService.updateProfilePicture(
        req.user._id.toString(),
        profilePicture
      );
      sendSuccess(
        res,
        { user, profilePicture: user.profilePicture },
        'Profile picture uploaded successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  };
}
