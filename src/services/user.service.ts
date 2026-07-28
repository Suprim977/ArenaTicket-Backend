import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { User } from '../models/User';
import { CLIENT_URL, JWT_SECRET } from '../config/index';
import { sendEmail } from '../config/email';

type PasswordResetResponse = {
  message: string;
};

export class UserService {
  async sendResetPasswordEmail(email: string): Promise<PasswordResetResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const genericResponse = { message: 'If the email is registered, a reset link has been sent.' };

    if (!normalizedEmail) {
      return genericResponse;
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      return genericResponse;
    }

    const resetToken = jwt.sign(
      { sub: user._id.toString(), purpose: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    user.passwordResetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${CLIENT_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 16px">Reset your ArenaTicket password</h2>
        <p>You requested a password reset. Click the button below to create a new password.</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">
            Reset Password
          </a>
        </p>
        <p>If the button does not work, paste this URL into your browser:</p>
        <p style="word-break:break-all">${resetUrl}</p>
        <p>This link expires in 1 hour.</p>
      </div>
    `;

    try {
      await sendEmail(normalizedEmail, 'ArenaTicket Password Reset', html);
    } catch (error) {
      // Do not leak delivery issues to the client; log for operators instead.
      console.error('Password reset email delivery failed:', error);
    }

    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string): Promise<PasswordResetResponse> {
    const normalizedToken = token.trim();
    const normalizedPassword = newPassword.trim();

    if (!normalizedToken || !normalizedPassword) {
      throw new Error('Token and new password are required.');
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(normalizedToken, JWT_SECRET) as JwtPayload;
    } catch {
      throw new Error('Invalid or expired reset token.');
    }

    if (decoded.purpose !== 'password-reset' || typeof decoded.sub !== 'string') {
      throw new Error('Invalid reset token.');
    }

    const user = await User.findById(decoded.sub).select('+passwordResetTokenHash +passwordResetExpiresAt +password');
    if (!user) {
      throw new Error('Invalid or expired reset token.');
    }

    const tokenHash = crypto.createHash('sha256').update(normalizedToken).digest('hex');
    if (!user.passwordResetTokenHash || user.passwordResetTokenHash !== tokenHash) {
      throw new Error('Invalid or expired reset token.');
    }

    if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw new Error('Invalid or expired reset token.');
    }

    user.password = await bcryptjs.hash(normalizedPassword, 12);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    return { message: 'Password has been reset successfully.' };
  }
}

export const userService = new UserService();
