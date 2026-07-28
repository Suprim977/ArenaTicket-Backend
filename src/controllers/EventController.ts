import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Event } from '../models/Event';
import { Booking } from '../models/Booking';
import { AppError } from '../middlewares/errorHandler';
import { sendSuccess } from '../utils/response';
import { promises as fs } from 'fs';
import path from 'path';
import { EVENT_UPLOADS_ROOT, UPLOADS_ROOT } from '../config/paths';

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

const parseMultipartBody = (body: Record<string, unknown>): Record<string, unknown> => {
  const parsed = { ...body };
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string' && value.trim() === '') {
      delete parsed[key];
    }
  }
  const numberFields = ['prizePool', 'standardPrice', 'vipPrice', 'standardCapacity', 'vipCapacity'];
  for (const field of numberFields) {
    if (typeof parsed[field] === 'string') parsed[field] = Number(parsed[field]);
  }
  for (const field of ['ticketPrices', 'tiers', 'relatedEvents']) {
    if (typeof parsed[field] === 'string') {
      try {
        parsed[field] = JSON.parse(parsed[field] as string);
      } catch {
        throw new AppError(`${field} must be valid JSON`, 400);
      }
    }
  }
  if (typeof parsed.availability === 'string') {
    if (!['true', 'false'].includes(parsed.availability)) {
      throw new AppError('availability must be true or false', 400);
    }
    parsed.availability = parsed.availability === 'true';
  }
  return parsed;
};

const parseOptionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const resolveTierName = (tierName: string): 'normal' | 'vip' | null => {
  if (/^(normal|standard)$/i.test(tierName)) return 'normal';
  if (/^vip$/i.test(tierName)) return 'vip';
  return null;
};

const mergeFlatTierFields = (
  existingTiers: { name: string; price: number; capacity: number; available: number }[],
  data: Record<string, unknown>,
): { name: string; price: number; capacity: number; available: number }[] | undefined => {
  const standardPrice = parseOptionalNumber(data.standardPrice);
  const vipPrice = parseOptionalNumber(data.vipPrice);
  const standardCapacity = parseOptionalNumber(data.standardCapacity);
  const vipCapacity = parseOptionalNumber(data.vipCapacity);
  const ticketsAvailable = typeof data.ticketsAvailable === 'boolean' ? data.ticketsAvailable : undefined;

  if (
    standardPrice === undefined
    && vipPrice === undefined
    && standardCapacity === undefined
    && vipCapacity === undefined
    && ticketsAvailable === undefined
  ) {
    return undefined;
  }

  return existingTiers.map(tier => {
    const tierKey = resolveTierName(tier.name);
    if (tierKey === 'normal') {
      const capacity = standardCapacity ?? tier.capacity;
      return {
        ...tier,
        price: standardPrice ?? tier.price,
        capacity,
        available: ticketsAvailable === false ? 0 : Math.min(tier.available, capacity),
      };
    }
    if (tierKey === 'vip') {
      const capacity = vipCapacity ?? tier.capacity;
      return {
        ...tier,
        price: vipPrice ?? tier.price,
        capacity,
        available: ticketsAvailable === false ? 0 : Math.min(tier.available, capacity),
      };
    }
    return tier;
  });
};

const eventImagePath = (file: Express.Multer.File): string =>
  `/uploads/events/${file.filename}`;

const deleteLocalEventImage = async (imageUrl?: string | null): Promise<void> => {
  const normalizedUrlPath = imageUrl?.split('?')[0].replace(/\\/g, '/');
  if (!normalizedUrlPath?.startsWith('/uploads/events/')) return;

  const relativePath = normalizedUrlPath.slice('/uploads/'.length);
  const absolutePath = path.resolve(UPLOADS_ROOT, relativePath);
  if (!absolutePath.startsWith(`${EVENT_UPLOADS_ROOT}${path.sep}`)) return;

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new AppError('Unable to delete event image', 500);
    }
  }
};

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
    const uploadedImage = req.file ? eventImagePath(req.file) : undefined;
    try {
      const data = eventSchema.parse({
        ...parseMultipartBody(req.body),
        ...(uploadedImage ? { imageUrl: uploadedImage } : {}),
      });
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
    } catch (error) {
      await deleteLocalEventImage(uploadedImage);
      throw error;
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const uploadedImage = req.file ? eventImagePath(req.file) : undefined;
    let imagePersisted = false;
    try {
      if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid event ID', 400);
      const existingEvent = await Event.findById(req.params.id);
      if (!existingEvent) throw new AppError('Event not found', 404);
      const parsedBody = parseMultipartBody(req.body);
      const data = eventSchema.partial().parse({
        ...parsedBody,
        ...(uploadedImage ? { imageUrl: uploadedImage } : {}),
      });
      const update: Record<string, unknown> = { ...data };
      if (data.ticketPrices) {
        update['tiers.$[normal].price'] = data.ticketPrices.normal;
        update['tiers.$[vip].price'] = data.ticketPrices.vip;
      }
      const mergedTiers = mergeFlatTierFields(existingEvent.tiers, parsedBody);
      if (mergedTiers) {
        update.tiers = mergedTiers;
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
      imagePersisted = Boolean(uploadedImage);
      if (uploadedImage && existingEvent.imageUrl !== uploadedImage) {
        await deleteLocalEventImage(existingEvent.imageUrl);
      }
      sendSuccess(res, event, 'Event updated successfully');
    } catch (error) {
      if (!imagePersisted) await deleteLocalEventImage(uploadedImage);
      throw error;
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid event ID', 400);
    if (await Booking.exists({ eventId: req.params.id })) {
      throw new AppError('Cannot delete an event with existing bookings', 409);
    }
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) throw new AppError('Event not found', 404);
    await deleteLocalEventImage(event.imageUrl);
    sendSuccess(res, null, 'Event deleted successfully');
  };
}
