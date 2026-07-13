import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { User, IUser } from '../../modules/users/model';

// Extend the Express Request interface to include the user property
export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please provide a valid token.', 401);
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { userId: string };

    // 3. Find user and attach to request
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid or expired token.', 401));
    } else {
      next(error);
    }
  }
};