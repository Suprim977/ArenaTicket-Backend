import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthRepository } from '../repository/auth.repository';
import { AppError } from '../../../middlewares/errorHandler';
import { IUser } from '../../user/model/user.model';

type SafeUser = Pick<IUser, '_id' | 'name' | 'email' | 'role' | 'isActive' | 'profilePicture'>;
type AuthResult = { user: SafeUser; tokens: { accessToken: string; refreshToken: string } };

export class AuthService {
  private authRepository: AuthRepository;

  constructor() {
    this.authRepository = new AuthRepository();
  }

  async register(data: { name: string; email: string; password: string }): Promise<AuthResult> {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const { password } = data;

    // Validate token configuration before persisting a user. This prevents an
    // account from being created when JWT creation would fail afterwards.
    this.getJwtSecrets();

    const existingUser = await this.authRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const user = await this.authRepository.createUser({ name, email, password });
    const tokens = this.generateTokens(user._id.toString());
    return { user: this.toSafeUser(user), tokens };
  }

  async login(data: { email: string; password: string }): Promise<AuthResult> {
    const email = data.email.trim().toLowerCase();
    const { password } = data;

    const user = await this.authRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is inactive', 403);
    }

    const tokens = this.generateTokens(user._id.toString());
    return { user: this.toSafeUser(user), tokens };
  }

  async updateProfile(userId: string, data: { name?: string; email?: string }): Promise<Omit<IUser, 'password'>> {
    const user = await this.authRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (data.email) {
      const normalizedEmail = data.email.trim().toLowerCase();
      const existingUser = await this.authRepository.findByEmail(normalizedEmail);

      if (existingUser && existingUser._id.toString() !== userId) {
        throw new AppError('Email already registered', 409);
      }

      user.email = normalizedEmail;
    }

    if (data.name) {
      user.name = data.name.trim();
    }

    await user.save();

    const { password: _password, ...safeUser } = user.toObject();
    return safeUser;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.authRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const userWithPassword = await this.authRepository.findByEmail(user.email);

    if (!userWithPassword) {
      throw new AppError('User not found', 404);
    }

    const isPasswordValid = await userWithPassword.comparePassword(currentPassword);

    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userWithPassword.updateOne({ password: hashedPassword });

    return { message: 'Password changed successfully' };
  }

  private generateTokens(userId: string): { accessToken: string; refreshToken: string } {
    const { accessSecret, refreshSecret } = this.getJwtSecrets();
    const accessToken = jwt.sign(
      { userId },
      accessSecret,
      { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as jwt.SignOptions['expiresIn'] }
    );

    const refreshToken = jwt.sign(
      { userId },
      refreshSecret,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as jwt.SignOptions['expiresIn'] }
    );

    return { accessToken, refreshToken };
  }

  private getJwtSecrets(): { accessSecret: string; refreshSecret: string } {
    // Support the existing JWT_SECRET setting while allowing separate secrets.
    const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

    if (!accessSecret || !refreshSecret) {
      throw new AppError('Server authentication configuration is missing. Please contact support.', 500);
    }

    return { accessSecret, refreshSecret };
  }

  private toSafeUser(user: IUser): SafeUser {
    const { _id, name, email, role, isActive, profilePicture } = user;
    return { _id, name, email, role, isActive, profilePicture };
  }
}
