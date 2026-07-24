import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { sendSuccess } from '../utils/response';
import { UserService } from '../features/user/service/user.service';
import { updateProfileSchema } from '../features/user/validation/validation';
import { Booking } from '../models/Booking';
import { Event } from '../models/Event';

export class UserController {
  private readonly userService = new UserService();

  getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await this.userService.getProfile(this.getUserId(req));
    sendSuccess(res, { user }, 'Profile retrieved successfully');
  };

  updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    const data = updateProfileSchema.parse(req.body);
    const user = await this.userService.updateProfile(this.getUserId(req), data);
    sendSuccess(res, { user }, 'Profile updated successfully');
  };

  dashboard = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const [profile, recentBookings, upcomingEvents, ticketCount] = await Promise.all([
      this.userService.getProfile(userId),
      Booking.find({ userId })
        .populate('eventId', 'title slug date location imageUrl')
        .sort({ createdAt: -1 })
        .limit(5),
      Event.find({
        date: { $gte: new Date() },
        status: 'published',
        availability: true,
      }).sort({ date: 1 }).limit(5),
      Booking.aggregate<{ total: number }>([
        { $match: { userId: req.user!._id, status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]),
    ]);
    sendSuccess(res, {
      profile,
      recentBookings,
      upcomingEvents,
      ticketCount: ticketCount[0]?.total ?? 0,
    }, 'User dashboard retrieved successfully');
  };

  updateProfilePicture = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) {
      throw new AppError('Profile picture file is required', 400);
    }

    const profilePicture = `/uploads/users/${req.file.filename}`;
    const user = await this.userService.updateProfilePicture(
      this.getUserId(req),
      profilePicture
    );

    sendSuccess(
      res,
      { user, profilePicture: user.profilePicture },
      'Profile picture updated successfully'
    );
  };

  deleteProfilePicture = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await this.userService.deleteProfilePicture(this.getUserId(req));
    sendSuccess(
      res,
      { user, profilePicture: null },
      'Profile picture deleted successfully'
    );
  };

  private getUserId(req: AuthRequest): string {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    return req.user._id.toString();
  }
}
