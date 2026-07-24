import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Event } from '../models/Event';
import { Booking } from '../models/Booking';
import { AppError } from '../middlewares/errorHandler';
import { sendSuccess } from '../utils/response';

const tierSchema = z.object({
  name: z.string().trim().min(1),
  price: z.number().positive(),
  capacity: z.number().int().positive(),
  available: z.number().int().nonnegative().optional(),
}).refine(tier => tier.available === undefined || tier.available <= tier.capacity, {
  message: 'Available tickets cannot exceed capacity',
  path: ['available'],
});
const ticketPricesSchema = z.object({
  normal: z.number().positive('Normal ticket price must be greater than zero'),
  vip: z.number().positive('VIP ticket price must be greater than zero'),
});
const eventSchema = z.object({
  title: z.string().trim().min(2).max(150),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.string().trim().toLowerCase().optional(),
  date: z.coerce.date(),
  location: z.string().trim().min(2),
  venue: z.string().trim().min(2).optional(),
  stadium: z.string().trim().min(2).optional(),
  time: z.string().trim().min(1).optional(),
  description: z.string().trim().min(10),
  imageUrl: z.string().trim().min(1),
  status: z.enum(['draft', 'published', 'cancelled', 'completed']).default('published'),
  availability: z.boolean().default(true),
  ticketPrices: ticketPricesSchema.default({ normal: 600, vip: 1500 }),
  prizePool: z.number().nonnegative(),
  format: z.string().trim().min(2),
  tiers: z.array(tierSchema).min(1),
  relatedEvents: z.array(z.string()).default([]),
});

export class EventController {
  list = async (req: Request, res: Response): Promise<void> => {
    const query = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().min(1).max(100).default(12),
      category: z.string().trim().toLowerCase().optional(),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
      search: z.string().trim().optional(),
    }).parse(req.query);
    const filter: Record<string, unknown> = {};
    if (query.category) filter.category = query.category;
    if (query.dateFrom || query.dateTo) filter.date = {
      ...(query.dateFrom ? { $gte: query.dateFrom } : {}),
      ...(query.dateTo ? { $lte: query.dateTo } : {}),
    };
    if (query.search) filter.$text = { $search: query.search };
    const [events, total] = await Promise.all([
      Event.find(filter).sort({ date: 1 }).skip((query.page - 1) * query.limit).limit(query.limit),
      Event.countDocuments(filter),
    ]);
    res.json({ success: true, message: 'Events retrieved successfully', data: events, meta: {
      page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit),
    } });
  };

  getOne = async (req: Request, res: Response): Promise<void> => {
    const identifier = req.params.id;
    const filter = mongoose.isValidObjectId(identifier) ? { _id: identifier } : { slug: identifier };
    const event = await Event.findOne(filter).populate('relatedEvents', 'title slug date location imageUrl tiers');
    if (!event) throw new AppError('Event not found', 404);
    sendSuccess(res, event, 'Event retrieved successfully');
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = eventSchema.parse(req.body);
    if (await Event.exists({ slug: data.slug })) throw new AppError('Event slug already exists', 409);
    const event = await Event.create({
      ...data,
      tiers: data.tiers.map(tier => ({
        ...tier,
        price: /^vip$/i.test(tier.name) ? data.ticketPrices.vip
          : /^(normal|standard)$/i.test(tier.name) ? data.ticketPrices.normal
          : tier.price,
        available: tier.available ?? tier.capacity,
      })),
    });
    sendSuccess(res, event, 'Event created successfully', 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid event ID', 400);
    const data = eventSchema.partial().parse(req.body);
    const update: Record<string, unknown> = { ...data };
    if (data.ticketPrices) {
      update['tiers.$[normal].price'] = data.ticketPrices.normal;
      update['tiers.$[vip].price'] = data.ticketPrices.vip;
    }
    const event = await Event.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
      arrayFilters: data.ticketPrices ? [
        { 'normal.name': { $regex: '^(normal|standard)$', $options: 'i' } },
        { 'vip.name': { $regex: '^vip$', $options: 'i' } },
      ] : undefined,
    });
    if (!event) throw new AppError('Event not found', 404);
    sendSuccess(res, event, 'Event updated successfully');
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid event ID', 400);
    if (await Booking.exists({ eventId: req.params.id })) {
      throw new AppError('Cannot delete an event with existing bookings', 409);
    }
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) throw new AppError('Event not found', 404);
    sendSuccess(res, null, 'Event deleted successfully');
  };
}
