import type { NextFunction, Request, Response } from 'express';
import { userService } from '../services/user.service';

export class AuthController {
  async sendResetPasswordEmail(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { email } = req.body as { email?: string };
      await userService.sendResetPasswordEmail(email ?? '');

      return res.status(200).json({
        success: true,
        message: 'If the email is registered, a reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { token, newPassword } = req.body as { token?: string; newPassword?: string };
      const result = await userService.resetPassword(token ?? '', newPassword ?? '');

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
