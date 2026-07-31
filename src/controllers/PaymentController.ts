import { randomUUID, timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import { Booking } from '../models/Booking';
import { Payment } from '../models/Payment';
import { AppError } from '../middlewares/errorHandler';
import { sendSuccess } from '../utils/response';
import { PAYMENT_METHODS } from '../constants/payment';
import { PaymentFulfillmentService, money } from '../services/PaymentFulfillmentService';
import { Event } from '../models/Event';

const initiateSchema = z.object({
  bookingId: z.string({ message: 'Booking ID is required.' }).trim().min(1, 'Booking ID is required.'),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: 'Invalid payment method.' }).optional(),
});
const verifySchema = z.object({
  transactionRef: z.string().min(1),
  status: z.enum(['success', 'failed']),
});
const sessionAccessSchema = z.object({
  token: z.string({ message: 'Payment token is required.' }).uuid('Invalid payment token.'),
});

export class PaymentController {
  private readonly fulfillmentService = new PaymentFulfillmentService();

  initiate = async (req: AuthRequest, res: Response): Promise<void> => {
    const data = initiateSchema.parse(req.body);
    const booking = await Booking.findOne({ _id: data.bookingId, userId: req.user!._id });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.status !== 'pending') throw new AppError('Booking is not awaiting payment', 409);
    if (await Payment.exists({ bookingId: booking._id, status: 'pending' })) {
      throw new AppError('A payment is already pending for this booking', 409);
    }
    const method = data.paymentMethod ?? booking.paymentMethod;
    if (data.paymentMethod && data.paymentMethod !== booking.paymentMethod) {
      throw new AppError('Payment method must match the booking payment method', 400);
    }
    const transactionRef = `${method.toUpperCase()}-${randomUUID()}`;
    const mockToken = randomUUID();
    let payment;
    try {
      payment = await Payment.create({
        bookingId: booking._id,
        userId: req.user!._id,
        method,
        amount: booking.totalAmount,
        transactionRef,
        mockToken,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new AppError('A payment is already pending for this booking', 409);
      }
      throw error;
    }
    const baseUrl = (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const paymentUrl = `${baseUrl}/api/v1/mock-payments/${method}`
      + `?paymentId=${encodeURIComponent(payment._id.toString())}`
      + `&token=${encodeURIComponent(mockToken)}`;
    const paymentResponse = payment.toObject() as unknown as Record<string, unknown>;
    delete paymentResponse.mockToken;
    sendSuccess(res, { payment: paymentResponse, paymentUrl }, 'Payment initiated successfully', 201);
  };

  status = async (req: AuthRequest, res: Response): Promise<void> => {
    const paymentId = Array.isArray(req.params.paymentId)
      ? req.params.paymentId[0]
      : req.params.paymentId;
    if (!mongoose.isValidObjectId(paymentId)) throw new AppError('Invalid payment ID', 400);
    const payment = await Payment.findById(paymentId)
      .populate('bookingId', 'bookingRef status totalAmount paymentMethod userId eventId')
      .populate('ticketId', 'ticketNumber ticketTier section quantity status');
    if (!payment) throw new AppError('Payment not found', 404);

    const booking = await Booking.findById(payment.bookingId).select('userId');
    if (!booking) throw new AppError('Booking not found', 404);
    if (req.user?.role !== 'admin' && booking.userId.toString() !== req.user!._id.toString()) {
      throw new AppError('Payment not found', 404);
    }

    sendSuccess(res, {
      payment: {
        _id: payment._id,
        bookingId: payment.bookingId,
        ticketId: payment.ticketId,
        method: payment.method,
        amount: payment.amount,
        status: payment.status,
        transactionRef: payment.transactionRef,
        fulfilledAt: payment.fulfilledAt ?? null,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
    }, 'Payment status retrieved successfully');
  };

  mockSession = async (req: Request, res: Response): Promise<void> => {
    const paymentId = Array.isArray(req.params.paymentId)
      ? req.params.paymentId[0]
      : req.params.paymentId;
    if (!mongoose.isValidObjectId(paymentId)) throw new AppError('Invalid payment ID', 400);
    const { token } = sessionAccessSchema.parse(req.query);
    const payment = await Payment.findById(paymentId).select('+mockToken');
    if (!payment || !secureEqual(payment.mockToken, token)) {
      throw new AppError('Payment not found', 404);
    }
    const booking = await Booking.findById(payment.bookingId);
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.userId.toString() !== payment.userId.toString()) {
      throw new AppError('Payment does not belong to this booking', 403);
    }
    if (money(payment.amount) !== money(booking.totalAmount)) {
      throw new AppError('Payment amount mismatch', 400);
    }
    const event = await Event.findById(booking.eventId)
      .select('title date location venue stadium');
    if (!event) throw new AppError('Event not found', 404);

    sendSuccess(res, {
      session: {
        paymentId: payment._id,
        method: payment.method,
        amount: payment.amount,
        status: payment.status,
        bookingRef: booking.bookingRef,
        tier: booking.tier,
        section: booking.section,
        quantity: booking.quantity,
        event: {
          title: event.title,
          date: event.date,
          location: event.location,
          venue: event.venue || event.stadium || event.location,
        },
      },
    }, 'Payment session retrieved successfully');
  };

  verify = async (req: Request, res: Response): Promise<void> => {
    const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!configuredSecret) throw new AppError('Payment webhook configuration is missing', 500);
    const providedSecret = req.get('x-payment-webhook-secret') || '';
    const expected = Buffer.from(configuredSecret);
    const provided = Buffer.from(providedSecret);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      throw new AppError('Invalid payment webhook signature', 401);
    }
    const data = verifySchema.parse(req.body);
    if (data.status === 'failed') {
      const payment = await Payment.findOneAndUpdate(
        { transactionRef: data.transactionRef, status: 'pending' },
        { status: 'failed' },
        { new: true },
      );
      if (!payment) throw new AppError('Payment not found or already processed', 404);
      sendSuccess(res, payment, 'Payment marked as failed');
      return;
    }

    const pendingPayment = await Payment.findOne({ transactionRef: data.transactionRef, status: 'pending' });
    if (!pendingPayment) {
      const completed = await Payment.findOne({ transactionRef: data.transactionRef, status: 'success' });
      if (completed) {
        const result = await this.fulfillmentService.fulfillSuccessfulPayment(completed);
        sendSuccess(res, result, 'Payment already verified');
        return;
      }
      throw new AppError('Payment not found', 404);
    }
    const booking = await Booking.findById(pendingPayment.bookingId);
    if (!booking) throw new AppError('Booking not found', 404);
    if (money(pendingPayment.amount) !== money(booking.totalAmount)) throw new AppError('Payment amount mismatch', 400);

    const claimed = await Payment.findOneAndUpdate(
      { _id: pendingPayment._id, status: 'pending' },
      { status: 'success' },
      { new: true },
    );
    if (!claimed) throw new AppError('Payment is already being processed', 409);

    const result = await this.fulfillmentService.fulfillSuccessfulPayment(claimed);
    sendSuccess(res, result, 'Payment verified successfully');
  };
}

const secureEqual = (actual: string, expected: string): boolean => {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
};
