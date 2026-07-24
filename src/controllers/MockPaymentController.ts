import { timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { PAYMENT_METHODS, PaymentMethod } from '../constants/payment';
import { AppError } from '../middlewares/errorHandler';
import { Booking } from '../models/Booking';
import { Event } from '../models/Event';
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
    const { payment, booking, event } = await this.requirePayment(access.paymentId, access.token, method);
    if (payment.status === 'failed') throw new AppError('Payment is no longer payable', 409);

    const frontendUrl = this.frontendUrl();
    if (payment.status === 'success') {
      this.sendHtml(res, this.completedPage(frontendUrl));
      return;
    }

    const actionBase = `/api/v1/mock-payments/${method}`;
    this.sendHtml(res, renderMockPaymentPage({
      method,
      eventName: event.title,
      venue: event.venue || event.stadium || event.location,
      date: event.date,
      bookingRef: booking.bookingRef,
      amount: payment.amount,
      status: payment.status,
      paymentId: payment._id.toString(),
      token: access.token,
      actionBase,
    }));
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
    const event = await Event.findById(booking.eventId);
    if (!event) throw new AppError('Event not found', 404);
    return { payment, booking, event };
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

  private sendHtml(res: Response, html: string): void {
    res.set('Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; "
      + "base-uri 'none'; frame-ancestors 'none'");
    res.type('html').send(html);
  }

  private completedPage(frontendUrl: string): string {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment complete | ArenaTicket</title><style>${pageStyles}</style></head>
<body><main class="shell"><section class="card result-card">
<div class="brand"><span class="brand-mark" aria-hidden="true">A</span><span>
<strong>ArenaTicket</strong><small>ESPORTS TICKETING</small></span></div>
<div class="result-icon" aria-hidden="true">&#10003;</div>
<p class="eyebrow">PAYMENT COMPLETE</p><h1>Payment already completed</h1>
<p class="result-copy">This payment has already been confirmed. No duplicate ticket was created.</p>
<a class="button primary" href="${escapeHtml(frontendUrl)}/tickets">View My Tickets</a>
<p class="secure-note">&#9679; Secure ArenaTicket Demo Checkout</p>
</section></main></body></html>`;
  }
}

type MockPaymentPageData = {
  method: PaymentMethod;
  eventName: string;
  venue: string;
  date: Date;
  bookingRef: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  paymentId: string;
  token: string;
  actionBase: string;
};

export const renderMockPaymentPage = (data: MockPaymentPageData): string => {
  const methodLabel = formatPaymentMethod(data.method);
  const amount = formatMoney(data.amount);
  const status = formatStatus(data.status);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(methodLabel)} Mock Payment | ArenaTicket</title>
  <style>${pageStyles}</style>
</head>
<body class="provider-${escapeHtml(data.method)}">
  <main class="shell">
    <section class="card" aria-labelledby="payment-title">
      <header class="brand">
        <span class="brand-mark" aria-hidden="true">A</span>
        <span><strong>ArenaTicket</strong><small>ESPORTS TICKETING</small></span>
        <span class="provider-pill">${escapeHtml(methodLabel)}</span>
      </header>

      <div class="heading">
        <p class="eyebrow">SECURE DEMO CHECKOUT</p>
        <h1 id="payment-title">${escapeHtml(methodLabel)} Mock Payment</h1>
      </div>

      <aside class="notice">
        <span class="notice-icon" aria-hidden="true">i</span>
        <span><strong>University Project Payment Simulator</strong>
        <small>No real payment will be charged.</small></span>
      </aside>

      <dl class="details">
        <div><dt>Event</dt><dd>${escapeHtml(data.eventName)}</dd></div>
        <div><dt>Venue</dt><dd>${escapeHtml(data.venue)}</dd></div>
        <div><dt>Date</dt><dd>${escapeHtml(formatEventDate(data.date))}</dd></div>
        <div><dt>Booking Reference</dt><dd class="reference">${escapeHtml(data.bookingRef)}</dd></div>
        <div><dt>Payment Method</dt><dd>${escapeHtml(methodLabel)}</dd></div>
        <div><dt>Status</dt><dd><span class="status status-${escapeHtml(data.status)}">${status}</span></dd></div>
      </dl>

      <section class="amount-panel" aria-label="Payment amount">
        <span>Amount Due</span><strong>${escapeHtml(amount)}</strong>
      </section>

      <div class="actions">
        <form method="post" action="${escapeHtml(data.actionBase)}/success">
          <input type="hidden" name="paymentId" value="${escapeHtml(data.paymentId)}">
          <input type="hidden" name="token" value="${escapeHtml(data.token)}">
          <button class="button primary" type="submit">Pay ${escapeHtml(amount)}</button>
        </form>
        <form method="post" action="${escapeHtml(data.actionBase)}/cancel">
          <input type="hidden" name="paymentId" value="${escapeHtml(data.paymentId)}">
          <input type="hidden" name="token" value="${escapeHtml(data.token)}">
          <button class="button secondary" type="submit">Cancel Payment</button>
        </form>
      </div>

      <footer class="secure-note"><span aria-hidden="true">&#9679;</span> Secure ArenaTicket Demo Checkout</footer>
    </section>
  </main>
</body>
</html>`;
};

const pageStyles = `
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
color:#1e1b4b;background:#f5f3ff;font-synthesis:none}
*{box-sizing:border-box}body{margin:0;min-width:320px;background:
radial-gradient(circle at 15% 5%,rgba(124,58,237,.13),transparent 30rem),
radial-gradient(circle at 90% 95%,rgba(79,70,229,.1),transparent 32rem),#f8f7ff}
button,a{font:inherit}.shell{min-height:100vh;display:grid;place-items:center;padding:32px 18px}
.card{width:100%;max-width:540px;overflow:hidden;background:rgba(255,255,255,.97);
border:1px solid #ddd6fe;border-radius:24px;box-shadow:0 24px 70px rgba(49,46,129,.14);padding:30px}
.brand{display:flex;align-items:center;gap:12px;padding-bottom:23px;border-bottom:1px solid #ede9fe}
.brand-mark{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;color:#fff;
font-size:21px;font-weight:900;background:linear-gradient(145deg,#7c3aed,#4f46e5);
box-shadow:0 8px 18px rgba(109,40,217,.26);transform:skew(-4deg)}
.brand strong,.brand small{display:block}.brand strong{font-size:16px;letter-spacing:-.02em}
.brand small{margin-top:2px;color:#7c3aed;font-size:9px;font-weight:800;letter-spacing:.15em}
.provider-pill{margin-left:auto;border:1px solid color-mix(in srgb,var(--provider) 28%,white);
border-radius:999px;padding:7px 11px;color:var(--provider);background:color-mix(in srgb,var(--provider) 8%,white);
font-size:12px;font-weight:800}.heading{padding:25px 0 18px}.eyebrow{margin:0 0 7px;color:#7c3aed;
font-size:10px;font-weight:850;letter-spacing:.16em}.heading h1,.result-card h1{margin:0;color:#1e1b4b;
font-size:clamp(24px,6vw,31px);line-height:1.15;letter-spacing:-.04em}
.notice{display:flex;align-items:flex-start;gap:11px;margin-bottom:24px;padding:13px 14px;border:1px solid #e0e7ff;
border-radius:14px;background:#f5f7ff;color:#3730a3}.notice-icon{display:grid;place-items:center;flex:0 0 auto;
width:22px;height:22px;border-radius:50%;background:#e0e7ff;font-size:12px;font-weight:900}
.notice strong,.notice small{display:block}.notice strong{font-size:12px}.notice small{margin-top:3px;color:#6366a5;font-size:11px}
.details{margin:0;border-top:1px solid #ede9fe}.details>div{display:grid;grid-template-columns:138px 1fr;gap:18px;
padding:14px 2px;border-bottom:1px solid #f1effb}.details dt{color:#77728f;font-size:12px;font-weight:650}
.details dd{margin:0;color:#282343;font-size:13px;font-weight:700;text-align:right;overflow-wrap:anywhere}
.details .reference{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#5b21b6}
.status{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:800}
.status:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.status-pending{color:#a16207;background:#fef9c3}.status-success{color:#15803d;background:#dcfce7}
.status-failed{color:#b91c1c;background:#fee2e2}.amount-panel{display:flex;align-items:flex-end;justify-content:space-between;
gap:20px;margin:24px 0 18px;padding:20px;border:1px solid #ddd6fe;border-radius:17px;
background:linear-gradient(135deg,#faf5ff,#eef2ff)}.amount-panel span{color:#6b6681;font-size:12px;font-weight:700}
.amount-panel strong{color:#312e81;font-size:28px;letter-spacing:-.04em}.actions{display:grid;gap:10px}.actions form{margin:0}
.button{display:flex;align-items:center;justify-content:center;width:100%;min-height:49px;border-radius:13px;
font-weight:800;text-decoration:none;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,background .15s ease}
.primary{border:1px solid var(--provider,#6d28d9);color:#fff;background:var(--provider,#6d28d9);
box-shadow:0 10px 22px color-mix(in srgb,var(--provider,#6d28d9) 25%,transparent)}
.primary:hover{filter:brightness(.94);transform:translateY(-1px)}.primary:active{transform:translateY(0)}
.secondary{border:1px solid #d8d4e7;color:#514b69;background:#fff}.secondary:hover{border-color:#a8a1c1;background:#faf9ff}
.button:focus-visible{outline:3px solid color-mix(in srgb,var(--provider,#6d28d9) 28%,transparent);outline-offset:3px}
.secure-note{margin:20px 0 0;color:#8a849e;font-size:10px;font-weight:700;letter-spacing:.04em;text-align:center}
.secure-note span{color:#22c55e;font-size:8px}.provider-esewa{--provider:#138a44}.provider-khalti{--provider:#6d28d9}
.provider-card{--provider:#4f46e5}.result-card{--provider:#6d28d9;text-align:center}.result-card .brand{text-align:left}
.result-icon{display:grid;place-items:center;width:64px;height:64px;margin:30px auto 18px;border-radius:50%;
color:#fff;background:#22c55e;font-size:30px;box-shadow:0 12px 25px rgba(34,197,94,.23)}
.result-card .eyebrow{margin-top:0}.result-copy{max-width:370px;margin:13px auto 24px;color:#6b6681;font-size:14px;line-height:1.65}
@media(max-width:520px){.shell{align-items:start;padding:14px 10px}.card{border-radius:19px;padding:22px 18px}
.details>div{grid-template-columns:1fr;gap:5px}.details dd{text-align:left}.amount-panel{padding:17px}
.amount-panel strong{font-size:25px}.provider-pill{padding:6px 9px}.brand{padding-bottom:18px}}
@media(prefers-reduced-motion:reduce){.button{transition:none}}
`;

const formatEventDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kathmandu',
  }).format(date);

const formatPaymentMethod = (method: PaymentMethod): string => ({
  esewa: 'eSewa',
  khalti: 'Khalti',
  card: 'Card',
})[method];

const formatStatus = (status: MockPaymentPageData['status']): string => ({
  pending: 'Pending',
  success: 'Paid',
  failed: 'Failed',
})[status];

const formatMoney = (amount: number): string =>
  `Rs ${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;

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
