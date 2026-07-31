import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { AuthRepository } from '../repository/auth.repository';
import { AppError } from '../../../middlewares/errorHandler';
import { IUser } from '../../../models/User';
import { ADMIN_REGISTRATION_SECRET } from '../../../config/index';
import {
  DevelopmentResetDelivery,
  PasswordResetDeliveryService,
} from '../../../services/PasswordResetDeliveryService';

export type RegistrationInput = {
  firstName: string;
  lastName: string;
  countryCode: string;
  phoneNumber: string;
  gender: 'male' | 'female' | 'other';
  email: string;
  password: string;
};

export type AdminRegistrationInput = {
  fullName: string;
  email: string;
  password: string;
  adminRegistrationCode: string;
};

export type SafeUser = {
  _id: string;
  firstName: string;
  lastName: string;
  name: string;
  countryCode: string;
  phoneNumber: string;
  gender: 'male' | 'female' | 'other';
  email: string;
  role: 'user' | 'admin';
  profilePicture: string | null;
  balance: number;
  ticketsCount: number;
  eventsAttended: number;
};

export class AuthService {
  private readonly authRepository = new AuthRepository();
  private readonly passwordResetDelivery = new PasswordResetDeliveryService();

  async register(data: RegistrationInput): Promise<{ user: SafeUser; token: string; tokens: { accessToken: string } }> {
    this.getJwtSecret();
    if (await this.authRepository.findByEmail(data.email)) {
      throw new AppError('Email already registered', 409);
    }
    if (await this.authRepository.findByPhone(data.countryCode, data.phoneNumber)) {
      throw new AppError('Phone number already registered for this country code', 409);
    }

    const user = await this.authRepository.createUser({ ...data, role: 'user' });
    const token = this.generateToken(user._id.toString());
    return { user: this.toSafeUser(user), token, tokens: { accessToken: token } };
  }

  async registerAdmin(
    data: AdminRegistrationInput,
  ): Promise<{ user: SafeUser; token: string; tokens: { accessToken: string } }> {
    if (!ADMIN_REGISTRATION_SECRET) {
      throw new AppError('Admin registration is not configured', 500);
    }
    if (data.adminRegistrationCode !== ADMIN_REGISTRATION_SECRET) {
      throw new AppError('Invalid admin registration code', 403);
    }

    const [firstName, ...rest] = data.fullName.trim().split(/\s+/);
    const lastName = rest.join(' ').trim() || firstName;

    if (await this.authRepository.findByEmail(data.email)) {
      throw new AppError('Email already registered', 409);
    }

    const user = await this.authRepository.createUser({
      firstName,
      lastName,
      countryCode: '+1',
      phoneNumber: `9${randomBytes(5).toString('hex').slice(0, 9)}`,
      gender: 'other',
      email: data.email,
      password: data.password,
      role: 'admin',
    });
    const token = this.generateToken(user._id.toString());
    return { user: this.toSafeUser(user), token, tokens: { accessToken: token } };
  }

  async login(email: string, password: string): Promise<{ user: SafeUser; token: string; tokens: { accessToken: string } }> {
    const user = await this.authRepository.findByEmail(email);
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }
    if (!user.isActive) {
      throw new AppError('Account is inactive', 403);
    }
    if (user.role === 'admin') {
      throw new AppError('Admin accounts must use the admin login portal.', 403);
    }
    const token = this.generateToken(user._id.toString());
    return { user: this.toSafeUser(user), token, tokens: { accessToken: token } };
  }

  async loginAdmin(email: string, password: string): Promise<{ user: SafeUser; token: string; tokens: { accessToken: string } }> {
    const user = await this.authRepository.findByEmail(email);
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }
    if (!user.isActive) {
      throw new AppError('Account is inactive', 403);
    }
    if (user.role !== 'admin') {
      throw new AppError('User accounts must use the normal login portal.', 403);
    }
    const token = this.generateToken(user._id.toString());
    return { user: this.toSafeUser(user), token, tokens: { accessToken: token } };
  }

  async forgotPassword(email: string): Promise<{
    devDelivery?: DevelopmentResetDelivery;
  }> {
    this.passwordResetDelivery.assertConfigured();
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    const expiresInMinutes = this.getResetExpiryMinutes();
    const user = await this.authRepository.findByEmail(email);
    if (user?.isActive) {
      await this.authRepository.setPasswordResetToken(
        user._id.toString(),
        tokenHash,
        new Date(Date.now() + expiresInMinutes * 60_000),
      );
    }

    return {
      devDelivery: this.passwordResetDelivery.createDevelopmentDelivery(
        token,
        expiresInMinutes,
      ),
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const user = await this.authRepository.consumePasswordResetToken(
      this.hashResetToken(token),
      passwordHash,
      new Date(),
    );
    if (!user) {
      throw new AppError('This password reset link is invalid or has expired.', 400);
    }
  }

  private generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      this.getJwtSecret(),
      { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as jwt.SignOptions['expiresIn'] }
    );
  }

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new AppError('JWT configuration is missing', 500);
    return secret;
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getResetExpiryMinutes(): number {
    const configured = Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES || 30);
    return Number.isInteger(configured) && configured >= 5 && configured <= 60
      ? configured
      : 30;
  }

  private toSafeUser(user: IUser): SafeUser {
    return {
      _id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      countryCode: user.countryCode,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      balance: user.balance ?? 0,
      ticketsCount: user.ticketsCount ?? 0,
      eventsAttended: user.eventsAttended ?? 0,
    };
  }
}
