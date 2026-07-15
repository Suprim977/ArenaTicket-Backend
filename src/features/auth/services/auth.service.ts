import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthRepository } from '../repository/auth.repository';
import { AppError } from '../../../middlewares/errorHandler';
import { IUser } from '../../user/model/user.model';

export class AuthService {
  private authRepository: AuthRepository;

  constructor() {
    this.authRepository = new AuthRepository();
  }

  async register(data: { name: string; email: string; password: string }): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string } }> {
    const { name, email, password } = data;

    const existingUser = await this.authRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const user = await this.authRepository.createUser({ name, email, password });
    const tokens = this.generateTokens(user._id.toString());
    return { user, tokens };
  }

  async login(data: { email: string; password: string }): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string } }> {
    const { email, password } = data;

    const user = await this.authRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const tokens = this.generateTokens(user._id.toString());
    return { user, tokens };
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
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as jwt.SignOptions['expiresIn'] }
    );

    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as jwt.SignOptions['expiresIn'] }
    );

    return { accessToken, refreshToken };
  }
}