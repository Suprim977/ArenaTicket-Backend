import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { Booking } from '../models/Booking';
import { Event } from '../models/Event';
import { Payment } from '../models/Payment';
import { User } from '../models/User';
import { sendSuccess } from '../utils/response';

const userUpdateSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  isActive: z.boolean().optional(),
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional(),
}).strict().refine(data => Object.keys(data).length > 0, {
  message: 'At least one user field is required',
});

const bookingStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']),
}).strict();

export class AdminController {
  dashboard = async (_req: AuthRequest, res: Response): Promise<void> => {
    const [totalUsers, totalEvents, totalBookings, ticketStats, revenueStats] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Event.countDocuments(),
      Booking.countDocuments(),
      Booking.aggregate<{ total: number }>([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]),
      Payment.aggregate<{ total: number }>([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);
    sendSuccess(res, {
      totalUsers,
      totalEvents,
      totalBookings,
      ticketsSold: ticketStats[0]?.total ?? 0,
      totalRevenue: revenueStats[0]?.total ?? 0,
    }, 'Admin dashboard retrieved successfully');
  };

  listUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    sendSuccess(res, { users }, 'Users retrieved successfully');
  };

  getUser = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = this.getParam(req.params.id);
    this.requireObjectId(id, 'user');
    const user = await User.findById(id).select('-password');
    if (!user) throw new AppError('User not found', 404);
    sendSuccess(res, { user }, 'User retrieved successfully');
  };

  updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = this.getParam(req.params.id);
    this.requireObjectId(id, 'user');
    const data = userUpdateSchema.parse(req.body);
    if (id === req.user!._id.toString() && (data.role === 'user' || data.isActive === false)) {
      throw new AppError('Administrators cannot remove their own access', 409);
    }
    const user = await User.findByIdAndUpdate(id, { $set: data }, {
      new: true,
      runValidators: true,
    }).select('-password');
    if (!user) throw new AppError('User not found', 404);
    sendSuccess(res, { user }, 'User updated successfully');
  };

  deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = this.getParam(req.params.id);
    this.requireObjectId(id, 'user');
    if (id === req.user!._id.toString()) {
      throw new AppError('Administrators cannot delete their own account', 409);
    }
    if (await Booking.exists({ userId: id })) {
      throw new AppError('Cannot delete a user with existing bookings', 409);
    }
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new AppError('User not found', 404);
    sendSuccess(res, null, 'User deleted successfully');
  };

  listBookings = async (_req: AuthRequest, res: Response): Promise<void> => {
    const bookings = await Booking.find()
      .populate('eventId', 'title slug date location imageUrl')
      .populate('userId', 'firstName lastName email phoneNumber')
      .sort({ createdAt: -1 });
    sendSuccess(res, { bookings }, 'Bookings retrieved successfully');
  };

  listPayments = async (_req: AuthRequest, res: Response): Promise<void> => {
    const payments = await Payment.find()
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate({
        path: 'bookingId',
        populate: { path: 'eventId', select: 'title slug date location imageUrl' },
      })
      .populate('ticketId')
      .sort({ createdAt: -1 });
    sendSuccess(res, { payments }, 'Payments retrieved successfully');
  };

  getBooking = async (req: AuthRequest, res: Response): Promise<void> => {
    const identifier = this.getParam(req.params.identifier);
    const filter = mongoose.isValidObjectId(identifier)
      ? { _id: identifier }
      : { bookingRef: identifier };
    const booking = await Booking.findOne(filter)
      .populate('eventId')
      .populate('userId', 'firstName lastName email phoneNumber');
    if (!booking) throw new AppError('Booking not found', 404);
    sendSuccess(res, { booking }, 'Booking retrieved successfully');
  };

  updateBookingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    const data = bookingStatusSchema.parse(req.body);
    const identifier = this.getParam(req.params.identifier);
    const filter = mongoose.isValidObjectId(identifier)
      ? { _id: identifier }
      : { bookingRef: identifier };
    const booking = await Booking.findOneAndUpdate(filter, { $set: data }, {
      new: true,
      runValidators: true,
    });
    if (!booking) throw new AppError('Booking not found', 404);
    sendSuccess(res, { booking }, 'Booking status updated successfully');
  };

  private requireObjectId(id: string, resource: string): void {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError(`Invalid ${resource} ID`, 400);
    }
  }

  private getParam(value: string | string[]): string {
    return Array.isArray(value) ? value[0] : value;
  }
}
