import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { AppError } from '../middlewares/errorHandler';
import { sendSuccess } from '../utils/response';

const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional(),
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine(data => Boolean(data.name || (data.firstName && data.lastName)), {
  message: 'First name and last name are required',
});
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, 'Password is required'),
});

const tokenFor = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError('JWT configuration is missing', 500);
  return jwt.sign({ userId }, secret, { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as jwt.SignOptions['expiresIn'] });
};

const safeUser = (user: InstanceType<typeof User>) => {
  const legacyName = String(user.get('name') || '').trim();
  const [legacyFirst = '', ...legacyLast] = legacyName.split(/\s+/);
  const firstName = user.firstName || legacyFirst;
  const lastName = user.lastName || legacyLast.join(' ');
  return {
    _id: user._id, firstName, lastName, name: `${firstName} ${lastName}`.trim(),
    email: user.email, role: user.role, balance: user.balance ?? 0,
    ticketsCount: user.ticketsCount ?? 0, eventsAttended: user.eventsAttended ?? 0,
  };
};

export class AuthController {
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = registerSchema.parse(req.body);
      if (!process.env.JWT_SECRET) throw new AppError('JWT configuration is missing', 500);
      if (await User.exists({ email: data.email })) throw new AppError('Email already registered', 409);
      const nameParts = data.name?.split(/\s+/) || [];
      const firstName = data.firstName || nameParts.shift()!;
      const lastName = data.lastName || nameParts.join(' ') || 'Player';
      const user = await User.create({ firstName, lastName, email: data.email, password: data.password });
      const token = tokenFor(user._id.toString());
      sendSuccess(res, { user: safeUser(user), token, tokens: { accessToken: token } }, 'User registered successfully', 201);
    } catch (error) {
      console.error('Registration error', error);
      throw error;
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await User.findOne({ email: data.email }).select('+password');
      if (!user || !(await user.comparePassword(data.password))) throw new AppError('Invalid email or password', 401);
      if (!user.isActive) throw new AppError('Account is inactive', 403);
      const token = tokenFor(user._id.toString());
      sendSuccess(res, { user: safeUser(user), token, tokens: { accessToken: token } }, 'Login successful');
    } catch (error) {
      console.error('Login error', error);
      throw error;
    }
  };
}
