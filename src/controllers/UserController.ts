import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { sendSuccess } from '../utils/response';
import { UserService } from '../features/user/service/user.service';
import { updateProfileSchema } from '../features/user/validation/validation';

export class UserController {
  private readonly userService = new UserService();

  getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await this.userService.getProfile(this.getUserId(req));
    sendSuccess(res, { user }, 'Profile retrieved successfully');
  };

  updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    const data = updateProfileSchema.parse(req.body);
    const user = await this.userService.updateProfile(this.getUserId(req), data);
    sendSuccess(res, { user }, 'Profile updated successfully');
  };

  updateProfilePicture = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) {
      throw new AppError('Profile picture file is required', 400);
    }

    const profilePicture = `/uploads/users/${req.file.filename}`;
    const user = await this.userService.updateProfilePicture(
      this.getUserId(req),
      profilePicture
    );

    sendSuccess(
      res,
      { user, profilePicture: user.profilePicture },
      'Profile picture updated successfully'
    );
  };

  deleteProfilePicture = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await this.userService.deleteProfilePicture(this.getUserId(req));
    sendSuccess(
      res,
      { user, profilePicture: null },
      'Profile picture deleted successfully'
    );
  };

  private getUserId(req: AuthRequest): string {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    return req.user._id.toString();
  }
}
