import jwt from 'jsonwebtoken';
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