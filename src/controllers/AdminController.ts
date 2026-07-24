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
import { Ticket } from '../features/ticket/model/ticket.model';
import { passwordSchema } from '../features/auth/validation/validation';

const phoneFields = {
  countryCode: z.string({ message: 'Country code is required' }).trim()
    .regex(/^\+[1-9]\d{0,3}$/, 'Invalid country code'),
  phoneNumber: z.string({ message: 'Phone number is required' }).trim()
    .regex(/^\d{6,15}$/, 'Phone number must contain 6 to 15 digits'),
};

const adminCreateUserSchema = z.object({
  firstName: z.string({ message: 'First name is required' }).trim().min(2).max(50),
  lastName: z.string({ message: 'Last name is required' }).trim().min(2).max(50),
  ...phoneFields,
  gender: z.string({ message: 'Gender is required' }).trim().toLowerCase()
    .pipe(z.enum(['male', 'female', 'other'], {
      message: 'Gender must be male, female, or other',
    })),
  email: z.string({ message: 'Email is required' }).trim().toLowerCase()
    .email('Invalid email address'),
  password: passwordSchema,
  role: z.enum(['user', 'admin'], { message: 'Role must be user or admin' }),
}).strict().superRefine((data, context) => {
  if (data.countryCode === '+977' && !/^\d{10}$/.test(data.phoneNumber)) {
    context.addIssue({
      code: 'custom',
      path: ['phoneNumber'],
      message: 'Nepal phone number must be exactly 10 digits',
    });
  }
});

const userUpdateSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional(),
  countryCode: phoneFields.countryCode.optional(),
  phoneNumber: phoneFields.phoneNumber.optional(),
  gender: z.string().trim().toLowerCase()
    .pipe(z.enum(['male', 'female', 'other'], {
      message: 'Gender must be male, female, or other',
    })).optional(),
}).strict().refine(data => Object.keys(data).length > 0, {
  message: 'At least one user field is required',
});

const bookingStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']),
}).strict();

export class AdminController {
  dashboard = async (_req: AuthRequest, res: Response): Promise<void> => {
    const [
      totalUsers,
      totalEvents,
      totalBookings,
      ticketStats,
      revenueStats,
      recentBookings,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Event.countDocuments({ status: 'published', availability: true }),
      Booking.countDocuments(),
      Ticket.aggregate<{ total: number }>([
        { $match: { status: { $in: ['valid', 'used'] } } },
        {
          $lookup: {
            from: Payment.collection.name,
            localField: 'bookingId',
            foreignField: 'bookingId',
            as: 'payments',
          },
        },
        { $match: { payments: { $elemMatch: { status: 'success' } } } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]),
      Payment.aggregate<{ total: number }>([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Booking.find()
        .populate('userId', 'firstName lastName email phoneNumber')
        .populate('eventId', 'title slug date location venue stadium imageUrl')
        .populate({
          path: 'payment',
          select: 'method amount status transactionRef ticketId',
          populate: {
            path: 'ticketId',
            select: 'ticketNumber ticketTier section quantity status',
          },
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean({ virtuals: true }),
    ]);
    sendSuccess(res, {
      totalUsers,
      totalEvents,
      totalBookings,
      ticketsSold: ticketStats[0]?.total ?? 0,
      totalRevenue: revenueStats[0]?.total ?? 0,
      recentBookings: recentBookings.map(toAdminBooking),
    }, 'Admin dashboard retrieved successfully');
  };

  listUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    sendSuccess(res, { users }, 'Users retrieved successfully');
  };

  createUser = async (req: AuthRequest, res: Response): Promise<void> => {
    const data = adminCreateUserSchema.parse(req.body);
    await this.assertUniqueUser(data.email, data.countryCode, data.phoneNumber);
    const user = await User.create(data);
    sendSuccess(res, { user: this.toSafeUser(user) }, 'User created successfully', 201);
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
    if (id === req.user!._id.toString() && data.role === 'user') {
      throw new AppError('Administrators cannot remove their own access', 409);
    }
    const user = await User.findById(id);
    if (!user) throw new AppError('User not found', 404);

    const countryCode = data.countryCode ?? user.countryCode;
    const phoneNumber = data.phoneNumber ?? user.phoneNumber;
    if (countryCode === '+977' && !/^\d{10}$/.test(phoneNumber)) {
      throw new AppError('Nepal phone number must be exactly 10 digits', 400);
    }
    if (countryCode !== user.countryCode || phoneNumber !== user.phoneNumber) {
      const duplicate = await User.exists({
        _id: { $ne: user._id },
        countryCode,
        phoneNumber,
      });
      if (duplicate) {
        throw new AppError('Phone number already registered for this country code', 409);
      }
    }

    Object.assign(user, data);
    await user.save();
    sendSuccess(res, { user: this.toSafeUser(user) }, 'User updated successfully');
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
      .populate('eventId', 'title slug date location venue stadium imageUrl')
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate({
        path: 'payment',
        select: 'method amount status transactionRef ticketId',
        populate: {
          path: 'ticketId',
          select: 'ticketNumber ticketTier section quantity status',
        },
      })
      .sort({ createdAt: -1 });
    sendSuccess(res, { bookings }, 'Bookings retrieved successfully');
  };

  listPayments = async (_req: AuthRequest, res: Response): Promise<void> => {
    const payments = await Payment.find()
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate({
        path: 'bookingId',
        select: 'bookingRef tier section quantity status totalAmount userId eventId',
        populate: [
          { path: 'userId', select: 'firstName lastName email phoneNumber' },
          { path: 'eventId', select: 'title slug date location venue stadium imageUrl' },
        ],
      })
      .populate('ticketId', 'ticketNumber ticketTier section quantity status')
      .sort({ createdAt: -1 })
      .lean();
    sendSuccess(
      res,
      { payments: payments.map(toAdminPayment) },
      'Payments retrieved successfully',
    );
  };

  getBooking = async (req: AuthRequest, res: Response): Promise<void> => {
    const identifier = this.getParam(req.params.identifier);
    const filter = mongoose.isValidObjectId(identifier)
      ? { _id: identifier }
      : { bookingRef: identifier };
    const booking = await Booking.findOne(filter)
      .populate('eventId')
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate({
        path: 'payment',
        select: 'method amount status transactionRef ticketId',
        populate: {
          path: 'ticketId',
          select: 'ticketNumber ticketTier section quantity status',
        },
      });
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

  private async assertUniqueUser(
    email: string,
    countryCode: string,
    phoneNumber: string,
  ): Promise<void> {
    const [emailExists, phoneExists] = await Promise.all([
      User.exists({ email }),
      User.exists({ countryCode, phoneNumber }),
    ]);
    if (emailExists) throw new AppError('Email already registered', 409);
    if (phoneExists) {
      throw new AppError('Phone number already registered for this country code', 409);
    }
  }

  private toSafeUser(user: InstanceType<typeof User>): Record<string, unknown> {
    const value = user.toObject() as unknown as Record<string, unknown>;
    delete value.password;
    delete value.passwordResetTokenHash;
    delete value.passwordResetExpiresAt;
    return value;
  }
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object'
    ? value as Record<string, unknown>
    : null;

const toAdminBooking = (value: unknown): Record<string, unknown> => {
  const booking = asRecord(value) ?? {};
  const user = asRecord(booking.userId);
  const event = asRecord(booking.eventId);
  const payment = asRecord(booking.payment);
  const ticket = asRecord(payment?.ticketId);
  return {
    ...booking,
    ticketTier: booking.tier ?? null,
    user,
    event,
    payment,
    ticket,
  };
};

const toAdminPayment = (value: unknown): Record<string, unknown> => {
  const payment = asRecord(value) ?? {};
  const rawBooking = asRecord(payment.bookingId);
  const booking = rawBooking ? toAdminBooking(rawBooking) : null;
  const bookingUser = asRecord(booking?.user);
  const directUser = asRecord(payment.userId);
  return {
    ...payment,
    user: bookingUser ?? directUser,
    event: asRecord(booking?.event),
    booking,
  };
};
