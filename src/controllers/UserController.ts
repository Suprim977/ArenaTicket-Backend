import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import { User } from '../models/User';
import { AppError } from '../middlewares/errorHandler';
import { sendSuccess } from '../utils/response';

const updateSchema = z.object({
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
}).refine(data => Object.keys(data).length > 0, 'At least one field is required');

export class UserController {
  me = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await User.findById(req.user!._id).select('-password');
    if (!user) throw new AppError('User not found', 404);
    sendSuccess(res, user, 'Profile retrieved successfully');
  };

  updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
    const data = updateSchema.parse(req.body);
    if (data.email && await User.exists({ email: data.email, _id: { $ne: req.user!._id } })) {
      throw new AppError('Email already registered', 409);
    }
    const user = await User.findByIdAndUpdate(req.user!._id, data, { new: true, runValidators: true }).select('-password');
    if (!user) throw new AppError('User not found', 404);
    sendSuccess(res, user, 'Profile updated successfully');
  };
}
