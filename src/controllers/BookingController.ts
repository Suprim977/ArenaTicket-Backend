import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import { Booking } from '../models/Booking';
import { Event } from '../models/Event';
import { AppError } from '../middlewares/errorHandler';
import { generateBookingRef } from '../utils/bookingRef';
import { sendSuccess } from '../utils/response';
import { PAYMENT_METHODS } from '../constants/payment';

const bookingSchema = z.object({
  eventId: z.string({ message: 'Event ID is required' }).trim().min(1, 'Event ID is required'),
  tier: z.string().trim().optional(),
  ticketTier: z.string().trim().optional(),
  section: z.string().trim().optional(),
  seatDetails: z.object({ section: z.string().trim().min(1) }).passthrough().optional(),
  quantity: z.coerce.number({ message: 'Quantity must be a number' }).int('Quantity must be a whole number').min(1).max(10),
  paymentMethod: z.string({ message: 'Payment method is required.' }).trim().toLowerCase()
    .pipe(z.enum(PAYMENT_METHODS, { message: 'Invalid payment method.' })),
  amount: z.never({ message: 'Amount is calculated by the backend and must not be sent' }).optional(),
  totalAmount: z.never({ message: 'Amount is calculated by the backend and must not be sent' }).optional(),
}).passthrough().transform((data, context) => {
  const rawTier = data.ticketTier ?? data.tier;
  const normalizedTier = rawTier?.trim().toLowerCase();
  const tier: 'VIP' | 'Normal' | undefined =
    normalizedTier === 'vip' ? 'VIP' : normalizedTier === 'normal' ? 'Normal' : undefined;
  const section = data.section ?? data.seatDetails?.section;
  if (!tier) {
    context.addIssue({ code: 'custom', path: ['ticketTier'], message: 'Ticket tier must be VIP or Normal' });
  }
  if (!section) {
    context.addIssue({ code: 'custom', path: ['section'], message: 'Section is required' });
  }
  return { eventId: data.eventId, tier: tier!, section: section!, quantity: data.quantity, paymentMethod: data.paymentMethod };
});

const tierPattern = (tier: 'VIP' | 'Normal'): RegExp =>
  tier === 'Normal' ? /^(normal|standard)$/i : /^vip$/i;

export class BookingController {
  create = async (req: AuthRequest, res: Response): Promise<void> => {
    const data = bookingSchema.parse(req.body);
    if (!mongoose.isValidObjectId(data.eventId)) throw new AppError('Invalid event ID', 400);

    const event = await Event.findOneAndUpdate(
      { _id: data.eventId, tiers: { $elemMatch: { name: tierPattern(data.tier), available: { $gte: data.quantity } } } },
      { $inc: { 'tiers.$.available': -data.quantity } },
      { new: false },
    );
    if (!event) {
      const exists = await Event.findById(data.eventId);
      if (!exists) throw new AppError('Event not found', 404);
      const tier = exists.tiers.find(item => tierPattern(data.tier).test(item.name));
      if (!tier) throw new AppError('Ticket tier is not available for this event', 400);
      throw new AppError('Not enough tickets available for this tier', 409);
    }

    const unitPrice = data.tier === 'VIP'
      ? event.ticketPrices.vip
      : event.ticketPrices.normal;
    const totalAmount = unitPrice * data.quantity;
    try {
      let booking;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          booking = await Booking.create({
            bookingRef: generateBookingRef(),
            userId: req.user!._id,
            eventId: data.eventId,
            tier: data.tier,
            section: data.section,
            quantity: data.quantity,
            subtotal: totalAmount,
            totalAmount,
            paymentMethod: data.paymentMethod,
          });
          break;
        } catch (error) {
          if ((error as { code?: number }).code !== 11000 || attempt === 4) throw error;
        }
      }
      sendSuccess(res, { booking }, 'Booking created successfully', 201);
    } catch (error) {
      await Event.updateOne(
        { _id: data.eventId, 'tiers.name': tierPattern(data.tier) },
        { $inc: { 'tiers.$.available': data.quantity } }
      );
      throw error;
    }
  };

  myBookings = async (req: AuthRequest, res: Response): Promise<void> => {
    const filter: Record<string, unknown> = { userId: req.user!._id };
    if (req.query.status) filter.status = req.query.status;
    const bookings = await Booking.find(filter)
      .populate('eventId', 'title slug date location imageUrl')
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 });
    sendSuccess(res, { bookings }, 'Bookings retrieved successfully');
  };

  getOne = async (req: AuthRequest, res: Response): Promise<void> => {
    const booking = await Booking.findOne({ bookingRef: req.params.bookingRef, userId: req.user!._id })
      .populate('eventId', 'title slug date location imageUrl')
      .populate('userId', 'firstName lastName email');
    if (!booking) throw new AppError('Booking not found', 404);
    sendSuccess(res, { booking }, 'Booking retrieved successfully');
  };
}
