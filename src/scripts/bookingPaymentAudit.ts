import 'dotenv/config';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Booking } from '../models/Booking';
import { Event } from '../models/Event';
import { Payment } from '../models/Payment';
import { User } from '../models/User';
import { Ticket } from '../features/ticket/model/ticket.model';
import { PaymentMethod, PAYMENT_METHODS } from '../constants/payment';

type JsonObject = Record<string, unknown>;
type RequestResult = { status: number; body: JsonObject };

function assert(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(label);
  console.log(`PASS ${label}`);
}

const run = async (): Promise<void> => {
  await connectDatabase();
  const jwtSecret = process.env.JWT_SECRET;
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!jwtSecret || !webhookSecret) {
    throw new Error('JWT_SECRET and PAYMENT_WEBHOOK_SECRET are required');
  }

  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const user = await User.create({
    firstName: 'Booking',
    lastName: 'Audit',
    countryCode: '+977',
    phoneNumber: `93${suffix.slice(-8)}`,
    gender: 'other',
    email: `booking-audit-${suffix}@example.com`,
    password: 'AuditPass1!',
  });
  const otherUser = await User.create({
    firstName: 'Other',
    lastName: 'Ticket',
    countryCode: '+977',
    phoneNumber: `92${suffix.slice(-8)}`,
    gender: 'other',
    email: `ticket-other-${suffix}@example.com`,
    password: 'AuditPass1!',
  });
  const admin = await User.create({
    firstName: 'Ticket',
    lastName: 'Admin',
    countryCode: '+977',
    phoneNumber: `91${suffix.slice(-8)}`,
    gender: 'other',
    email: `ticket-admin-${suffix}@example.com`,
    password: 'AuditPass1!',
    role: 'admin',
  });
  const event = await Event.create({
    title: 'Booking Payment Audit',
    slug: `booking-payment-${suffix}`,
    date: new Date(Date.now() + 86400000),
    location: 'Audit Arena',
    description: 'Temporary event for booking payment and QR verification.',
    imageUrl: '/audit.png',
    prizePool: 0,
    format: '5v5',
    tiers: [
      { name: 'Normal', price: 600, capacity: 100, available: 100 },
      { name: 'VIP', price: 1500, capacity: 100, available: 100 },
    ],
  });

  const userToken = jwt.sign({ userId: user._id.toString() }, jwtSecret);
  const otherToken = jwt.sign({ userId: otherUser._id.toString() }, jwtSecret);
  const baseUrl = 'http://localhost:8089/api/v1';

  const request = async (
    path: string,
    method = 'GET',
    token?: string,
    body?: JsonObject,
    extraHeaders?: Record<string, string>,
  ): Promise<RequestResult> => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      signal: globalThis.AbortSignal.timeout(10_000),
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json() as JsonObject };
  };

  const createBooking = async (
    ticketTier: 'normal' | 'vip',
    quantity: number,
    paymentMethod: PaymentMethod,
  ): Promise<{ _id: string; unitPrice: number; totalAmount: number; subtotal: number }> => {
    const response = await request('/bookings', 'POST', userToken, {
      eventId: event._id.toString(),
      ticketTier,
      section: 'Arena Floor',
      quantity,
      paymentMethod,
      price: 1,
      unitPrice: 1,
      total: 1,
    });
    assert(response.status === 201, `Booking accepts ${paymentMethod}`);
    return (response.body.data as {
      booking: { _id: string; unitPrice: number; totalAmount: number; subtotal: number };
    }).booking;
  };

  try {
    const adminLogin = await request('/auth/login', 'POST', undefined, {
      email: admin.email,
      password: 'AuditPass1!',
    });
    const adminAccessToken = (adminLogin.body.data as {
      token: string;
    }).token;
    assert(
      adminLogin.status === 200 && Boolean(adminAccessToken),
      'Admin logs in and receives a real JWT',
    );
    const userLogin = await request('/auth/login', 'POST', undefined, {
      email: user.email,
      password: 'AuditPass1!',
    });
    const userAccessToken = (userLogin.body.data as {
      token: string;
    }).token;
    assert(
      userLogin.status === 200 && Boolean(userAccessToken),
      'Normal user logs in and receives a real JWT',
    );
    assert(
      (await request('/admin/payments')).status === 401,
      'Admin payments rejects requests without a JWT',
    );
    assert(
      (await request('/admin/payments', 'GET', userAccessToken)).status === 403,
      'Admin payments rejects a normal-user JWT',
    );

    const standardOne = await createBooking('normal', 1, 'card');
    assert(standardOne.totalAmount === 600, '1. Standard x1 totals Rs 600');
    const standardFour = await createBooking('normal', 4, 'card');
    assert(
      standardFour.unitPrice === 600 && standardFour.totalAmount === 2400,
      '2. Standard x4 totals Rs 2,400',
    );
    const vipOne = await createBooking('vip', 1, 'card');
    assert(vipOne.totalAmount === 1500, '3. VIP x1 totals Rs 1,500');
    const vipFour = await createBooking('vip', 4, 'card');
    assert(
      vipFour.unitPrice === 1500 && vipFour.totalAmount === 6000,
      '4. VIP x4 totals Rs 6,000',
    );
    assert(
      vipFour.subtotal === vipFour.totalAmount,
      '5. No VAT, tax, booking fee, or service charge is added',
    );

    const missingMethod = await request('/bookings', 'POST', userToken, {
      eventId: event._id.toString(),
      ticketTier: 'normal',
      section: 'Arena Floor',
      quantity: 1,
    });
    assert(
      missingMethod.status === 400
        && missingMethod.body.message === 'Payment method is required.',
      '6. Missing paymentMethod returns a readable HTTP 400',
    );
    const invalidMethod = await request('/bookings', 'POST', userToken, {
      eventId: event._id.toString(),
      ticketTier: 'normal',
      section: 'Arena Floor',
      quantity: 1,
      paymentMethod: 'cash',
    });
    assert(
      invalidMethod.status === 400
        && invalidMethod.body.message === 'Invalid payment method.',
      'Invalid paymentMethod returns a readable HTTP 400',
    );

    const methodBookings: Array<{
      method: PaymentMethod;
      booking: { _id: string };
      transactionRef?: string;
    }> = [];
    for (const method of PAYMENT_METHODS) {
      const booking = await createBooking('normal', 1, method);
      const initiated = await request('/payments/initiate', 'POST', userToken, {
        bookingId: booking._id,
        paymentMethod: method,
        amount: 1,
      });
      if (initiated.status !== 201) console.error('Payment initiation response:', initiated.body);
      assert(initiated.status === 201, `${method} payment initializes`);
      const payment = (initiated.body.data as {
        payment: { transactionRef: string; amount: number; method: PaymentMethod };
      }).payment;
      assert(
        payment.amount === 600 && payment.method === method,
        `${method} payment uses the saved booking amount`,
      );
      methodBookings.push({ method, booking, transactionRef: payment.transactionRef });
    }
    console.log('PASS 7-9. esewa, khalti, and card booking/payment flows work');

    const primary = methodBookings[0];
    const confirmed = await request('/payments/verify', 'POST', undefined, {
      transactionRef: primary.transactionRef,
      status: 'success',
    }, { 'x-payment-webhook-secret': webhookSecret });
    assert(confirmed.status === 200, '10. Successful payment confirms the booking and creates a ticket');
    const ticket = (confirmed.body.data as {
      ticket: {
        _id: string;
        ticketNumber: string;
        qrToken: string;
        qrCodeData: string;
      };
    }).ticket;
    assert(
      /^AT-\d{4}-[A-F0-9]{10}$/.test(ticket.ticketNumber)
        && /^[a-f0-9]{64}$/.test(ticket.qrToken),
      '11. Ticket has unique ticket number and secure QR token',
    );

    const firstReload = await request('/tickets/my', 'GET', userToken);
    const secondReload = await request('/tickets/my', 'GET', userToken);
    const firstTicket = (firstReload.body.data as {
      tickets: Array<{
        _id: string;
        qrToken: string;
        qrCodeData: string;
        eventId: { title: string; date: string; location: string };
        bookingId: { status: string; paymentMethod: string };
      }>;
    }).tickets.find(item => item._id === ticket._id);
    const secondTicket = (secondReload.body.data as {
      tickets: Array<{ _id: string; qrToken: string; qrCodeData: string }>;
    }).tickets.find(item => item._id === ticket._id);
    assert(
      firstTicket?.qrToken === ticket.qrToken
        && secondTicket?.qrToken === ticket.qrToken
        && firstTicket?.qrCodeData === secondTicket?.qrCodeData,
      '12. Reloading a ticket returns the same QR token and QR image',
    );
    assert(
      firstTicket?.eventId?.title === 'Booking Payment Audit'
        && firstTicket?.bookingId?.status === 'confirmed',
      'My tickets response includes event and confirmed booking/payment details',
    );

    const retry = await request('/payments/verify', 'POST', undefined, {
      transactionRef: primary.transactionRef,
      status: 'success',
    }, { 'x-payment-webhook-secret': webhookSecret });
    const retryTicket = (retry.body.data as { ticket: { _id: string; qrToken: string } }).ticket;
    const ticketCount = await Ticket.countDocuments({ bookingId: primary.booking._id });
    assert(
      retry.status === 200
        && retryTicket._id === ticket._id
        && retryTicket.qrToken === ticket.qrToken
        && ticketCount === 1,
      '13. Retrying confirmation is idempotent and creates no duplicate ticket',
    );

    const myBookings = await request('/bookings/my-bookings', 'GET', userToken);
    const myBooking = (myBookings.body.data as {
      bookings: Array<{
        _id: string;
        userId: { _id: string };
        eventId: { title: string };
        payment: { method: string; amount: number; status: string };
      }>;
    }).bookings.find(item => item._id === primary.booking._id);
    assert(
      myBookings.status === 200
        && myBooking?.userId._id === user._id.toString()
        && myBooking.eventId.title === 'Booking Payment Audit'
        && myBooking.payment.method === primary.method
        && myBooking.payment.amount === 600
        && myBooking.payment.status === 'success',
      'My bookings includes the authenticated user, event, and payment state',
    );

    const adminBookings = await request('/admin/bookings', 'GET', adminAccessToken);
    const adminBooking = (adminBookings.body.data as {
      bookings: Array<{
        _id: string;
        userId: { firstName: string; lastName: string };
        eventId: { title: string };
        payment: { method: string; amount: number; status: string };
      }>;
    }).bookings.find(item => item._id === primary.booking._id);
    assert(
      adminBookings.status === 200
        && adminBooking?.userId.firstName === 'Booking'
        && adminBooking.userId.lastName === 'Audit'
        && adminBooking.eventId.title === 'Booking Payment Audit'
        && adminBooking.payment.method === primary.method
        && adminBooking.payment.amount === 600
        && adminBooking.payment.status === 'success',
      'Admin bookings identifies the real customer, event, amount, and payment',
    );

    const adminPayments = await request('/admin/payments', 'GET', adminAccessToken);
    const adminPayment = (adminPayments.body.data as {
      payments: Array<{
        transactionRef: string;
        user: { firstName: string; lastName: string; email: string };
        event: { title: string; venue?: string; location: string; date: string };
        booking: {
          bookingRef: string;
          ticketTier: string;
          section: string;
          quantity: number;
          status: string;
        };
        amount: number;
        method: string;
        status: string;
        createdAt: string;
      }>;
    }).payments.find(item => item.transactionRef === primary.transactionRef);
    assert(
      adminPayments.status === 200
        && adminPayment?.user.firstName === 'Booking'
        && adminPayment.user.lastName === 'Audit'
        && adminPayment.user.email === user.email
        && adminPayment.event.title === 'Booking Payment Audit'
        && adminPayment.event.location === 'Audit Arena'
        && Boolean(adminPayment.event.date)
        && Boolean(adminPayment.booking.bookingRef)
        && adminPayment.booking.ticketTier === 'Normal'
        && adminPayment.booking.section === 'Arena Floor'
        && adminPayment.booking.quantity === 1
        && adminPayment.booking.status === 'confirmed'
        && adminPayment.amount === 600
        && adminPayment.method === primary.method
        && adminPayment.status === 'success',
      'Admin payments returns the real customer, event, booking, and successful payment',
    );
    const pending = (adminPayments.body.data as {
      payments: Array<{
        transactionRef: string;
        status: string;
        booking: { status: string };
        user: { _id: string };
        event: { _id: string };
      }>;
    }).payments.find(item => item.transactionRef === methodBookings[1].transactionRef);
    assert(
      pending?.status === 'pending'
        && pending.booking.status === 'pending'
        && Boolean(pending.user._id)
        && Boolean(pending.event._id),
      'Admin payments includes pending real payments without changing their status',
    );

    const adminTickets = await request('/tickets', 'GET', adminAccessToken);
    const adminTicket = (adminTickets.body.data as {
      tickets: Array<{
        _id: string;
        userId: { firstName: string };
        eventId: { title: string };
        bookingId: {
          status: string;
          payment: { status: string; method: string };
        };
        status: string;
      }>;
    }).tickets.find(item => item._id === ticket._id);
    assert(
      adminTickets.status === 200
        && adminTicket?.userId.firstName === 'Booking'
        && adminTicket.eventId.title === 'Booking Payment Audit'
        && adminTicket.bookingId.status === 'confirmed'
        && adminTicket.bookingId.payment.status === 'success'
        && adminTicket.status === 'valid',
      'Admin tickets identifies its owner, event, booking, and payment state',
    );

    const expectedUsers = await User.countDocuments({ role: 'user' });
    const expectedEvents = await Event.countDocuments({ status: 'published', availability: true });
    const expectedBookings = await Booking.countDocuments();
    const expectedRevenue = await Payment.aggregate<{ total: number }>([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const dashboard = await request('/admin/dashboard', 'GET', adminAccessToken);
    const dashboardData = dashboard.body.data as {
      totalUsers: number;
      totalEvents: number;
      totalBookings: number;
      totalRevenue: number;
      ticketsSold: number;
      recentBookings: Array<{
        _id: string;
        userId: { firstName: string };
        eventId: { title: string };
        payment: { status: string };
      }>;
    };
    const recent = dashboardData.recentBookings.find(item => item._id === primary.booking._id);
    assert(
      dashboard.status === 200
        && dashboardData.totalUsers === expectedUsers
        && dashboardData.totalEvents === expectedEvents
        && dashboardData.totalBookings === expectedBookings
        && dashboardData.totalRevenue === (expectedRevenue[0]?.total ?? 0)
        && dashboardData.ticketsSold >= 1
        && recent?.userId.firstName === 'Booking'
        && recent.eventId.title === 'Booking Payment Audit'
        && recent.payment.status === 'success',
      'Admin dashboard uses MongoDB totals and populated recent bookings',
    );

    const otherTickets = await request('/tickets/my', 'GET', otherToken);
    const otherList = (otherTickets.body.data as { tickets: unknown[] }).tickets;
    assert(otherTickets.status === 200 && otherList.length === 0, '14. User cannot see another user ticket');

    const verification = await request(`/tickets/verify/${ticket.qrToken}`, 'GET', adminAccessToken);
    assert(
      verification.status === 200
        && (verification.body.data as { ticket: { _id: string } }).ticket._id === ticket._id,
      '15. Admin can verify a valid ticket',
    );
    const userVerification = await request(`/tickets/verify/${ticket.qrToken}`, 'GET', userToken);
    assert(userVerification.status === 403, 'Normal user cannot access ticket verification');
  } finally {
    await Ticket.deleteMany({ eventId: event._id });
    await Payment.deleteMany({ userId: user._id });
    await Booking.deleteMany({ eventId: event._id });
    await Event.deleteOne({ _id: event._id });
    await User.deleteMany({ _id: { $in: [user._id, otherUser._id, admin._id] } });
  }
};

run()
  .then(async () => {
    await mongoose.disconnect();
    console.log('Booking/payment/QR audit passed.');
  })
  .catch(async error => {
    console.error('Booking/payment/QR audit failed:', error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
