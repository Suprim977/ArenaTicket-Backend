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
      const message = roles.some(role => role.toLowerCase() === 'admin')
        ? 'Administrator access required.'
        : 'You do not have permission to perform this action';
      return next(new AppError(message, 403));
    }

    next();
  };
};
