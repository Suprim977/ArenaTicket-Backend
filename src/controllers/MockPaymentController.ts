import { timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { PAYMENT_METHODS, PaymentMethod } from '../constants/payment';
import { AppError } from '../middlewares/errorHandler';
import { Booking } from '../models/Booking';
import { Payment } from '../models/Payment';
import { PaymentFulfillmentService } from '../services/PaymentFulfillmentService';

const paymentAccessSchema = z.object({
  paymentId: z.string({ message: 'Payment ID is required.' }).trim().min(1, 'Payment ID is required.'),
  token: z.string({ message: 'Payment token is required.' }).uuid('Invalid payment token.'),
});

export class MockPaymentController {
  private readonly fulfillmentService = new PaymentFulfillmentService();

  show = async (req: Request, res: Response): Promise<void> => {
    const method = this.parseMethod(req.params.method);
    const access = paymentAccessSchema.parse(req.query);
    const { payment, booking } = await this.requirePayment(access.paymentId, access.token, method);
    if (payment.status === 'failed') throw new AppError('Payment is no longer payable', 409);

    const frontendUrl = this.frontendUrl();
    if (payment.status === 'success') {
      res.type('html').send(this.completedPage(frontendUrl));
      return;
    }

    const actionBase = `/api/v1/mock-payments/${method}`;
    res.type('html').send(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ArenaTicket Mock ${escapeHtml(method.toUpperCase())} Payment</title></head>
<body>
  <main>
    <h1>Mock ${escapeHtml(method.toUpperCase())} Payment</h1>
    <p>University project payment simulator. No real payment will be charged.</p>
    <dl>
      <dt>Booking</dt><dd>${escapeHtml(booking.bookingRef)}</dd>
      <dt>Amount</dt><dd>Rs ${payment.amount.toFixed(2)}</dd>
      <dt>Status</dt><dd>${escapeHtml(payment.status)}</dd>
    </dl>
    <form method="post" action="${actionBase}/success">
      <input type="hidden" name="paymentId" value="${escapeHtml(payment._id.toString())}">
      <input type="hidden" name="token" value="${escapeHtml(access.token)}">
      <button type="submit">Complete mock payment</button>
    </form>
    <form method="post" action="${actionBase}/cancel">
      <input type="hidden" name="paymentId" value="${escapeHtml(payment._id.toString())}">
      <input type="hidden" name="token" value="${escapeHtml(access.token)}">
      <button type="submit">Cancel</button>
    </form>
  </main>
</body>
</html>`);
  };

  success = async (req: Request, res: Response): Promise<void> => {
    const method = this.parseMethod(req.params.method);
    const access = paymentAccessSchema.parse(req.body);
    let { payment } = await this.requirePayment(access.paymentId, access.token, method);
    if (payment.status === 'failed') {
      throw new AppError('Failed payment cannot be completed', 409);
    }
    if (payment.status === 'pending') {
      payment = await Payment.findOneAndUpdate(
        { _id: payment._id, status: 'pending' },
        { $set: { status: 'success' } },
        { new: true },
      ) ?? await Payment.findById(payment._id).select('+mockToken') ?? payment;
    }
    const result = await this.fulfillmentService.fulfillSuccessfulPayment(payment);
    const redirectUrl = `${this.frontendUrl()}/tickets?payment=success`
      + `&ticketId=${encodeURIComponent(result.ticket._id.toString())}`;
    res.redirect(303, redirectUrl);
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const method = this.parseMethod(req.params.method);
    const access = paymentAccessSchema.parse(req.body);
    const { payment } = await this.requirePayment(access.paymentId, access.token, method);
    if (payment.status === 'success') {
      throw new AppError('Successful payment cannot be cancelled', 409);
    }
    await Payment.updateOne(
      { _id: payment._id, status: 'pending' },
      { $set: { status: 'failed' } },
    );
    res.redirect(303, `${this.frontendUrl()}/bookings?payment=cancelled`);
  };

  private async requirePayment(paymentId: string, token: string, method: PaymentMethod) {
    if (!mongoose.isValidObjectId(paymentId)) throw new AppError('Invalid payment ID', 400);
    const payment = await Payment.findById(paymentId).select('+mockToken');
    if (!payment || !secureEqual(payment.mockToken, token)) {
      throw new AppError('Payment not found', 404);
    }
    if (payment.method !== method) throw new AppError('Payment method does not match', 400);
    const booking = await Booking.findById(payment.bookingId);
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.userId.toString() !== payment.userId.toString()) {
      throw new AppError('Payment does not belong to this booking', 403);
    }
    if (payment.amount !== booking.totalAmount) {
      throw new AppError('Payment amount mismatch', 400);
    }
    return { payment, booking };
  }

  private parseMethod(value: string | string[]): PaymentMethod {
    const method = (Array.isArray(value) ? value[0] : value)?.toLowerCase();
    const parsed = z.enum(PAYMENT_METHODS, { message: 'Invalid payment method.' }).safeParse(method);
    if (!parsed.success) throw new AppError('Invalid payment method.', 400);
    return parsed.data;
  }

  private frontendUrl(): string {
    return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  }

  private completedPage(frontendUrl: string): string {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment complete</title></head><body><main><h1>Payment already completed</h1>
<p>This payment has already been confirmed. No duplicate ticket was created.</p>
<a href="${escapeHtml(frontendUrl)}/tickets">View tickets</a></main></body></html>`;
  }
}

const secureEqual = (actual: string, expected: string): boolean => {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
