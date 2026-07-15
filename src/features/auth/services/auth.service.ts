import jwt from 'jsonwebtoken';
import { AppError } from '../../../middlewares/errorHandler';
import { User } from '../../user/model/user.model';

export class AuthService {
  async register(data: { name: string; email: string; password: string }) {
    const { name, email, password } = data;
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const user = await User.create({ 
      name, 
      email: normalizedEmail, 
      password 
    });

    const { password: _password, ...userObj } = user.toObject();

    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return { user: userObj, tokens: { accessToken } };
  }

  async login(data: { email: string; password: string }) {
    const { email, password } = data;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const { password: _password, ...userObj } = user.toObject();

    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return { user: userObj, tokens: { accessToken } };
  }
}