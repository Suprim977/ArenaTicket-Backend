import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import { AuthService } from './service';
import { registerSchema, loginSchema } from './validation';
import { sendSuccess } from '../../shared/utils/response';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password } = registerSchema.parse(req).body;
      
      const result = await this.authService.register(name, email, password);
      
      sendSuccess(res, result, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = loginSchema.parse(req).body;
      
      const result = await this.authService.login(email, password);
      
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, req.user, 'Current user profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}