import { Response, NextFunction } from 'express';
import { User } from '../model/user.model';
import bcrypt from 'bcryptjs';
import { sendSuccess } from '../../../utils/response';
import { AuthRequest } from '../../../middlewares/auth';

export class UserController {
  updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await User.findByIdAndUpdate(req.user!._id, req.body, { new: true }).select('-password');
      sendSuccess(res, user, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user!._id);
      
      if (!user || !(await user.comparePassword(currentPassword))) {
        return next(new Error('Current password is incorrect'));
      }
      
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      
      sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  };
}
