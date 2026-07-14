import { Response, NextFunction } from 'express';
import { UserService } from './service';
import { updateProfileSchema, changePasswordSchema } from './validation';
import { sendSuccess } from '../../shared/utils/response';
import { AuthRequest } from '../../shared/middleware/auth';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = updateProfileSchema.parse(req.body);
      
      const result = await this.userService.updateProfile(req.user!._id.toString(), name!);
      
      sendSuccess(res, result, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      
      await this.userService.changePassword(req.user!._id.toString(), currentPassword, newPassword);
      
      sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  };
}import { Response, NextFunction } from 'express';
import { UserService } from './service';
import { updateProfileSchema, changePasswordSchema } from './validation';
import { sendSuccess } from '../../shared/utils/response';
import { AuthRequest } from '../../shared/middleware/auth';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = updateProfileSchema.parse(req.body);
      
      const result = await this.userService.updateProfile(req.user!._id.toString(), name!);
      
      sendSuccess(res, result, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      
      await this.userService.changePassword(req.user!._id.toString(), currentPassword, newPassword);
      
      sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  };
}