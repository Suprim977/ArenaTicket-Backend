import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../features/auth/services/auth.service';
import { registerSchema } from '../features/auth/validation/validation';
import { sendSuccess } from '../utils/response';

const loginSchema = z.object({
  email: z.string({ message: 'Email is required' }).trim().toLowerCase().email('Invalid email address'),
  password: z.string({ message: 'Password is required' }).min(1, 'Password is required'),
}).strict();

export class AuthController {
  private readonly authService = new AuthService();

  register = async (req: Request, res: Response): Promise<void> => {
    const { confirmPassword: _confirmPassword, ...data } = registerSchema.parse(req.body);
    const result = await this.authService.register(data);
    sendSuccess(res, result, 'User registered successfully', 201);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const data = loginSchema.parse(req.body);
    const result = await this.authService.login(data.email, data.password);
    sendSuccess(res, result, 'Login successful');
  };
}
