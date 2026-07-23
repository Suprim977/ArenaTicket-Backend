import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import { Booking } from '../models/Booking';
import { Event } from '../models/Event';
import { AppError } from '../middlewares/errorHandler';
import { generateBookingRef } from '../utils/bookingRef';
import { sendSuccess } from '../utils/response';

const bookingSchema = z.object({
  eventId: z.string(),
  tier: z.string().trim().min(1),
  seatDetails: z.object({
    section: z.string().trim().min(1),
    row: z.string().trim().min(1),
    seat: z.string().trim().min(1),
  }),
  quantity: z.number().int().min(1).max(10),
});
const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export class BookingController {
  create = async (req: AuthRequest, res: Response): Promise<void> => {
    const data = bookingSchema.parse(req.body);
    if (!mongoose.isValidObjectId(data.eventId)) throw new AppError('Invalid event ID', 400);

    const event = await Event.findOneAndUpdate(
      { _id: data.eventId, tiers: { $elemMatch: { name: data.tier, available: { $gte: data.quantity } } } },
      { $inc: { 'tiers.$.available': -data.quantity } },
      { new: false },
    );
    if (!event) {
      const exists = await Event.findById(data.eventId);
      if (!exists) throw new AppError('Event not found', 404);
      const tier = exists.tiers.find(item => item.name === data.tier);
      if (!tier) throw new AppError('Invalid ticket tier', 400);
      throw new AppError('Tier sold out', 409);
    }

    const selectedTier = event.tiers.find(item => item.name === data.tier)!;
    const subtotal = money(selectedTier.price * data.quantity);
    const bookingFee = money(subtotal * 0.05);
    const tax = money(subtotal * 0.13);
    try {
      let booking;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          booking = await Booking.create({
            bookingRef: generateBookingRef(), userId: req.user!._id, eventId: data.eventId,
            tier: data.tier, seatDetails: data.seatDetails, quantity: data.quantity,
            subtotal, bookingFee, tax, totalAmount: money(subtotal + bookingFee + tax),
          });
          break;
        } catch (error) {
          if ((error as { code?: number }).code !== 11000 || attempt === 4) throw error;
        }
      }
      sendSuccess(res, booking, 'Booking created successfully', 201);
    } catch (error) {
      await Event.updateOne({ _id: data.eventId, 'tiers.name': data.tier }, { $inc: { 'tiers.$.available': data.quantity } });
      throw error;
    }
  };

  myBookings = async (req: AuthRequest, res: Response): Promise<void> => {
    const bookings = await Booking.find({ userId: req.user!._id })
      .populate('eventId', 'title slug date location imageUrl')
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 });
    sendSuccess(res, bookings, 'Bookings retrieved successfully');
  };

  getOne = async (req: AuthRequest, res: Response): Promise<void> => {
    const booking = await Booking.findOne({ bookingRef: req.params.bookingRef, userId: req.user!._id })
      .populate('eventId', 'title slug date location imageUrl')
      .populate('userId', 'firstName lastName email');
    if (!booking) throw new AppError('Booking not found', 404);
    sendSuccess(res, booking, 'Booking retrieved successfully');
  };
}
