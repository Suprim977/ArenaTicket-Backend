import { AppError } from '../middlewares/errorHandler';

export type DevelopmentResetDelivery = {
  resetToken: string;
  resetUrl: string;
  expiresInMinutes: number;
  emailPreview: {
    subject: string;
    heading: string;
    message: string;
  };
};

export class PasswordResetDeliveryService {
  assertConfigured(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Password reset delivery is not configured', 503);
    }
  }

  createDevelopmentDelivery(
    token: string,
    expiresInMinutes: number,
  ): DevelopmentResetDelivery {
    this.assertConfigured();
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    return {
      resetToken: token,
      resetUrl: `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`,
      expiresInMinutes,
      emailPreview: {
        subject: 'Reset your ArenaTicket password',
        heading: 'ArenaTicket — ESPORTS TICKETING',
        message: `We received a request to reset your ArenaTicket password. This link expires in ${expiresInMinutes} minutes. If you did not request this, you can safely ignore this email.`,
      },
    };
  }
}
