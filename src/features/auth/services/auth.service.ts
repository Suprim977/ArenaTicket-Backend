import jwt from 'jsonwebtoken';
import { AppError } from '../../../middlewares/errorHandler';
import { User } from '../../user/model/user.model';
import { IAuthResponse } from '../types/auth.types';

export class AuthService {
  async register(data: { name: string; email: string; password: string }): Promise<IAuthResponse> {
    const { name, email, password } = data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const user = await User.create({ name, email, password });
    const tokens = this.generateTokens(user._id.toString());
    return { user, tokens };
  }

  async login(data: { email: string; password: string }): Promise<IAuthResponse> {
    const { email, password } = data;

    const user = await User.findOne({ email }).select('+password');
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