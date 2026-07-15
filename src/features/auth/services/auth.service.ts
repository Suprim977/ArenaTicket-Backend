import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    
    const userObj = user.toObject();
    delete (userObj as any).password;

    const accessToken = this.generateToken(user._id.toString());
    return { user: userObj as any, tokens: { accessToken } };
  }

  async login(data: { email: string; password: string }): Promise<IAuthResponse> {
    const { email, password } = data;

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Safely check password
    let isPasswordValid = false;
    if (typeof (user as any).comparePassword === 'function') {
      isPasswordValid = await (user as any).comparePassword(password);
    } else {
      isPasswordValid = await bcrypt.compare(password, user.password);
    }

    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const userObj = user.toObject();
    delete (userObj as any).password;

    const accessToken = this.generateToken(user._id.toString());
    return { user: userObj as any, tokens: { accessToken } };
  }

  private generateToken(userId: string): string {
    // Use the standard JWT_SECRET from your .env file
    const secret = process.env.JWT_SECRET || 'fallback_secret_key';
    return jwt.sign({ userId }, secret, { expiresIn: '7d' });
  }
}