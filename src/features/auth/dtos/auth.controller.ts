import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from '../validation/validation';
import { sendSuccess } from '../../../utils/response';
import { AuthRequest } from '../../../middlewares/auth';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password } = registerSchema.parse({ body: req.body }).body;
      const result = await this.authService.register({ name, email, password });
      sendSuccess(res, result, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = loginSchema.parse({ body: req.body }).body;
      const result = await this.authService.login({ email, password });
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email } = updateProfileSchema.parse({ body: req.body }).body;
      const result = await this.authService.updateProfile(req.user._id.toString(), { name, email });
      sendSuccess(res, result, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse({ body: req.body }).body;
      const result = await this.authService.changePassword(req.user._id.toString(), currentPassword, newPassword);
      sendSuccess(res, result, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  };
}