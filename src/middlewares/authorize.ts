import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from './errorHandler';

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const normalizedRole = String(req.user.role).toLowerCase();
    if (!roles.map(role => role.toLowerCase()).includes(normalizedRole)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};
