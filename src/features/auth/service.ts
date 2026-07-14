import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthRepository } from './repository';
import { AppError } from '../../middlewares/errorHandler';
import { IUser } from '../user/model';

export class AuthService {
  private authRepository: AuthRepository;

  constructor() {
    this.authRepository = new AuthRepository();
  }

  async register(name: string, email: string, password: string): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string } }> {
    const existingUser = await this.authRepository.findByEmail(email);
    
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const user = await this.authRepository.createUser({ name, email, password });
    
    const tokens = this.generateTokens(user._id.toString());
    
    return { user, tokens };
  }

  async login(email: string, password: string): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string } }> {
    const user = await this.authRepository.findByEmail(email);
    
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const tokens = this.generateTokens(user._id.toString());
    
    return { user, tokens };
  }

  private generateTokens(userId: string): { accessToken: string; refreshToken: string } {
    const accessTokenExpiresIn =
      (process.env.JWT_ACCESS_EXPIRY || '15m') as SignOptions['expiresIn'];
    const refreshTokenExpiresIn =
      (process.env.JWT_REFRESH_EXPIRY || '7d') as SignOptions['expiresIn'];

    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: accessTokenExpiresIn }
    );

    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: refreshTokenExpiresIn }
    );

    return { accessToken, refreshToken };
  }
}