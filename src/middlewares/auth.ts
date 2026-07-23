import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(new AppError('Authentication required', 401));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return next(new AppError('JWT configuration is missing', 500));
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
    const userId = decoded.userId || decoded.id;
    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError('User not found', 401));
    }

    req.user = user;
    next();
  } catch (error) {
    next(new AppError('Invalid or expired token', 401));
  }
};
