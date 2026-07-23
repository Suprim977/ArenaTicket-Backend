import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { loginSchema, registerSchema } from '../validation/validation';
import { sendSuccess } from '../../../utils/response';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { confirmPassword: _confirmPassword, ...data } = registerSchema.parse(req.body);
      const result = await this.authService.register(data);
      sendSuccess(res, result, 'User registered successfully', 201);
    } catch (error) {
      console.error('Registration error:', {
        email: req.body?.email,
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
      });
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = loginSchema.parse({ body: req.body }).body;
      const result = await this.authService.login(email, password);
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      console.error('Login error:', {
        email: req.body?.email,
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
      });
      next(error);
    }
  };

}
