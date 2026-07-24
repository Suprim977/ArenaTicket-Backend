import 'dotenv/config';
import { Server } from 'http';
import { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../app';
import { connectDatabase } from '../config/database';
import { PAYMENT_METHODS, PaymentMethod } from '../constants/payment';
import { Ticket } from '../features/ticket/model/ticket.model';
import { Booking } from '../models/Booking';
import { Event } from '../models/Event';
import { Payment } from '../models/Payment';
import { User } from '../models/User';

type JsonObject = Record<string, unknown>;

function assert(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(label);
  console.log(`PASS ${label}`);
}

const run = async (): Promise<void> => {
  await connectDatabase();
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET is required');

  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const user = await User.create({
    firstName: 'Mock',
    lastName: 'Payment',
    countryCode: '+977',
    phoneNumber: `90${suffix.slice(-8)}`,
    gender: 'other',
    email: `mock-payment-${suffix}@example.com`,
    password: 'AuditPass1!',
  });
  const event = await Event.create({
    title: 'Mock Payment Audit',
    slug: `mock-payment-${suffix}`,
    date: new Date(Date.now() + 86400000),
    location: 'Audit Arena',
    description: 'Temporary event used for mock payment verification.',
    imageUrl: '/audit.png',
    prizePool: 0,
    format: '5v5',
    tiers: [
      { name: 'Normal', price: 600, capacity: 20, available: 20 },
      { name: 'VIP', price: 1500, capacity: 20, available: 20 },
    ],
  });
  const token = jwt.sign({ userId: user._id.toString() }, jwtSecret);
  let server: Server | undefined;
  let origin = process.env.MOCK_PAYMENT_AUDIT_BASE_URL?.replace(/\/$/, '');
  if (!origin) {
    server = app.listen(0);
    await new Promise<void>((resolve, reject) => {
      server!.once('listening', resolve);
      server!.once('error', reject);
    });
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }
  const previousBaseUrl = process.env.BASE_URL;
  process.env.BASE_URL = origin;

  const api = async (
    path: string,
    method = 'GET',
    body?: JsonObject,
  ): Promise<{ status: number; body: JsonObject }> => {
    const response = await fetch(`${origin}/api/v1${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json() as JsonObject };
  };

  const createPayment = async (paymentMethod: PaymentMethod) => {
    const bookingResponse = await api('/bookings', 'POST', {
      eventId: event._id.toString(),
      ticketTier: 'normal',
      section: 'Arena Floor',
      quantity: 1,
      paymentMethod,
    });
    assert(bookingResponse.status === 201, `${paymentMethod} booking is created`);
    const booking = (bookingResponse.body.data as { booking: { _id: string } }).booking;
    const paymentResponse = await api('/payments/initiate', 'POST', {
      bookingId: booking._id,
      paymentMethod,
    });
    assert(paymentResponse.status === 201, `${paymentMethod} payment is initiated`);
    return (paymentResponse.body.data as {
      payment: { _id: string; amount: number };
      paymentUrl: string;
    });
  };

  try {
    let firstCompleted: { paymentId: string; url: URL } | undefined;
    for (const method of PAYMENT_METHODS) {
      const initiated = await createPayment(method);
      const paymentUrl = new URL(initiated.paymentUrl);
      assert(
        paymentUrl.pathname === `/api/v1/mock-payments/${method}`
          && paymentUrl.searchParams.get('paymentId') === initiated.payment._id
          && Boolean(paymentUrl.searchParams.get('token'))
          && !paymentUrl.searchParams.has('amount'),
        `${method} returns the canonical secure mock-payment URL`,
      );

      const page = await fetch(paymentUrl);
      const html = await page.text();
      assert(
        page.status === 200
          && page.headers.get('content-type')?.startsWith('text/html')
          && html.includes(`Rs ${initiated.payment.amount.toFixed(2)}`),
        `${method} mock payment page opens with backend amount`,
      );

      const form = new URLSearchParams({
        paymentId: initiated.payment._id,
        token: paymentUrl.searchParams.get('token')!,
      });
      const success = await fetch(`${origin}/api/v1/mock-payments/${method}/success`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form,
        redirect: 'manual',
      });
      assert(
        success.status === 303
          && success.headers.get('location')?.startsWith('http://localhost:3000/tickets?payment=success'),
        `${method} success redirects to the frontend tickets page`,
      );
      const payment = await Payment.findById(initiated.payment._id);
      const booking = await Booking.findById(payment?.bookingId);
      const ticketCount = await Ticket.countDocuments({ bookingId: payment?.bookingId });
      assert(
        payment?.status === 'success'
          && booking?.status === 'confirmed'
          && ticketCount === 1,
        `${method} success confirms payment/booking and creates one ticket`,
      );
      firstCompleted ??= { paymentId: initiated.payment._id, url: paymentUrl };
    }

    const completedPage = await fetch(firstCompleted!.url);
    assert(
      completedPage.status === 200
        && (await completedPage.text()).includes('Payment already completed'),
      'Refreshing a completed mock page is safe',
    );
    const retryForm = new URLSearchParams({
      paymentId: firstCompleted!.paymentId,
      token: firstCompleted!.url.searchParams.get('token')!,
    });
    const retry = await fetch(`${origin}${firstCompleted!.url.pathname}/success`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: retryForm,
      redirect: 'manual',
    });
    const retryPayment = await Payment.findById(firstCompleted!.paymentId);
    assert(
      retry.status === 303
        && await Ticket.countDocuments({ bookingId: retryPayment?.bookingId }) === 1,
      'Repeated success remains idempotent with exactly one QR ticket',
    );

    const cancelled = await createPayment('card');
    const cancelUrl = new URL(cancelled.paymentUrl);
    const cancelForm = new URLSearchParams({
      paymentId: cancelled.payment._id,
      token: cancelUrl.searchParams.get('token')!,
    });
    const cancelResponse = await fetch(`${origin}/api/v1/mock-payments/card/cancel`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: cancelForm,
      redirect: 'manual',
    });
    const cancelledPayment = await Payment.findById(cancelled.payment._id);
    assert(
      cancelResponse.status === 303
        && cancelledPayment?.status === 'failed'
        && await Ticket.countDocuments({ bookingId: cancelledPayment?.bookingId }) === 0,
      'Cancellation marks payment failed and creates no ticket',
    );
  } finally {
    process.env.BASE_URL = previousBaseUrl;
    await Ticket.deleteMany({ eventId: event._id });
    await Payment.deleteMany({ userId: user._id });
    await Booking.deleteMany({ eventId: event._id });
    await Event.deleteOne({ _id: event._id });
    await User.deleteOne({ _id: user._id });
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close(error => error ? reject(error) : resolve());
      });
    }
  }
};

run()
  .then(async () => {
    await mongoose.disconnect();
    console.log('Mock payment audit passed.');
  })
  .catch(async error => {
    console.error('Mock payment audit failed:', error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
