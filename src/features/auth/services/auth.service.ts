import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AppError } from '../../../middlewares/errorHandler';
import { User } from '../../user/model/user.model';

export class AuthService {
  async register(data: { name: string; email: string; password: string }) {
    const { name, email, password } = data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      name, 
      email, 
      password: hashedPassword 
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

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
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