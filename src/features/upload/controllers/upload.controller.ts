import { NextFunction, Response } from 'express';
import { AuthRequest } from '../../../middlewares/auth';
import { AppError } from '../../../middlewares/errorHandler';
import { sendSuccess } from '../../../utils/response';
import { UploadService } from '../services/upload.service';

export class UploadController {
  private uploadService: UploadService;

  constructor() {
    this.uploadService = new UploadService();
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

      const result = this.uploadService.buildFileResponse(req.file);
      sendSuccess(res, result, 'Profile picture uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  };
}