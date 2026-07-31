import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../features/auth/services/auth.service';
import { AppError } from '../middlewares/errorHandler';
import {
  adminLoginSchema,
  adminRegisterSchema,
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
} from '../features/auth/validation/validation';
import { sendSuccess } from '../utils/response';

const loginSchema = z.object({
  email: z.string({ message: 'Email is required' }).trim().toLowerCase().email('Invalid email address'),
  password: z.string({ message: 'Password is required' }).min(1, 'Password is required'),
}).strict();

export class AuthController {
  private readonly authService = new AuthService();

  register = async (req: Request, res: Response): Promise<void> => {
    const { confirmPassword: _confirmPassword, role: _role, ...data } = registerSchema.parse(req.body);
    const result = await this.authService.register(data);
    sendSuccess(res, result, 'User registered successfully', 201);
  };

  registerAdmin = async (req: Request, res: Response): Promise<void> => {
    const { confirmPassword: _confirmPassword, role: _role, ...data } = adminRegisterSchema.parse(req.body);
    const result = await this.authService.registerAdmin(data);
    sendSuccess(res, result, 'Admin account created', 201);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const data = loginSchema.parse(req.body);
    const result = await this.authService.login(data.email, data.password);
    if (result.user.role === 'admin') {
      throw new AppError('Admin accounts must use the admin login portal.', 403);
    }
    sendSuccess(res, result, 'Login successful');
  };

  loginAdmin = async (req: Request, res: Response): Promise<void> => {
    const data = adminLoginSchema.parse(req.body);
    const result = await this.authService.loginAdmin(data.email, data.password);
    if (result.user.role !== 'admin') {
      throw new AppError('User accounts must use the normal login portal.', 403);
    }
    sendSuccess(res, result, 'Login successful');
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = forgotPasswordSchema.parse(req.body);
    await this.authService.forgotPassword(email);
    sendSuccess(
      res,
      null,
      'If an account exists for this email, password reset instructions have been sent.',
    );
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const data = resetPasswordSchema.parse(req.body);
    await this.authService.resetPassword(data.token, data.newPassword);
    sendSuccess(res, null, 'Password reset successfully');
  };
}
