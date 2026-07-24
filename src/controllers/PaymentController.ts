import { randomUUID, timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import { Booking } from '../models/Booking';
import { Payment } from '../models/Payment';
import { AppError } from '../middlewares/errorHandler';
import { sendSuccess } from '../utils/response';
import { PAYMENT_METHODS } from '../constants/payment';
import { PaymentFulfillmentService, money } from '../services/PaymentFulfillmentService';

const initiateSchema = z.object({
  bookingId: z.string({ message: 'Booking ID is required.' }).trim().min(1, 'Booking ID is required.'),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: 'Invalid payment method.' }).optional(),
});
const verifySchema = z.object({
  transactionRef: z.string().min(1),
  status: z.enum(['success', 'failed']),
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
    const payment = await Payment.create({
      bookingId: booking._id,
      userId: req.user!._id,
      method,
      amount: booking.totalAmount,
      transactionRef,
      mockToken,
    });
    const baseUrl = (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const paymentUrl = `${baseUrl}/api/v1/mock-payments/${method}`
      + `?paymentId=${encodeURIComponent(payment._id.toString())}`
      + `&token=${encodeURIComponent(mockToken)}`;
    const paymentResponse = payment.toObject() as unknown as Record<string, unknown>;
    delete paymentResponse.mockToken;
    sendSuccess(res, { payment: paymentResponse, paymentUrl }, 'Payment initiated successfully', 201);
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
