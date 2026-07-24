import 'dotenv/config';
import { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../app';
import { connectDatabase } from '../config/database';
import { Booking } from '../models/Booking';
import { Event } from '../models/Event';
import { User } from '../models/User';

type JsonBody = Record<string, unknown>;

const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
const createdUserIds: mongoose.Types.ObjectId[] = [];
const createdEventIds: mongoose.Types.ObjectId[] = [];
const createdBookingIds: mongoose.Types.ObjectId[] = [];

const assertStatus = (actual: number, expected: number, label: string): void => {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
  console.log(`PASS ${label}`);
};

const run = async (): Promise<void> => {
  await connectDatabase();
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');

  const admin = await User.create({
    firstName: 'Security',
    lastName: 'Admin',
    countryCode: '+977',
    phoneNumber: `98${suffix.slice(-8)}`,
    gender: 'other',
    email: `security-admin-${suffix}@example.com`,
    password: 'AuditPass1!',
    role: 'admin',
  });
  const user = await User.create({
    firstName: 'Security',
    lastName: 'User',
    countryCode: '+977',
    phoneNumber: `97${suffix.slice(-8)}`,
    gender: 'other',
    email: `security-user-${suffix}@example.com`,
    password: 'AuditPass1!',
    role: 'user',
  });
  const otherUser = await User.create({
    firstName: 'Other',
    lastName: 'User',
    countryCode: '+977',
    phoneNumber: `96${suffix.slice(-8)}`,
    gender: 'other',
    email: `security-other-${suffix}@example.com`,
    password: 'AuditPass1!',
    role: 'user',
  });
  createdUserIds.push(admin._id, user._id, otherUser._id);

  const adminToken = jwt.sign({ userId: admin._id.toString() }, secret);
  const userToken = jwt.sign({ userId: user._id.toString() }, secret);
  const server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const request = async (
    path: string,
    method = 'GET',
    token?: string,
    body?: JsonBody,
  ): Promise<{ status: number; json: JsonBody }> => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, json: await response.json() as JsonBody };
  };

  const eventPayload = (slug: string): JsonBody => ({
    title: 'RBAC Security Event',
    slug,
    category: 'security',
    date: new Date(Date.now() + 86400000).toISOString(),
    location: 'Audit Arena',
    description: 'Temporary event created by the RBAC security audit.',
    imageUrl: '/audit.png',
    prizePool: 1000,
    format: '5v5',
    ticketPrices: { normal: 600, vip: 1500 },
    tiers: [
      { name: 'Normal', price: 600, capacity: 20 },
      { name: 'VIP', price: 1500, capacity: 10 },
    ],
  });

  try {
    const adminCreate = await request('/events', 'POST', adminToken, eventPayload(`rbac-${suffix}`));
    assertStatus(adminCreate.status, 201, '1. Admin creates event');
    const eventId = String((adminCreate.json.data as { _id: string })._id);
    createdEventIds.push(new mongoose.Types.ObjectId(eventId));

    assertStatus((await request('/events', 'POST', userToken, eventPayload(`denied-${suffix}`))).status, 403, '2. User cannot create event');
    assertStatus((await request(`/events/${eventId}`, 'PATCH', adminToken, { title: 'Updated Security Event' })).status, 200, '3. Admin edits event');
    assertStatus((await request(`/events/${eventId}`, 'PATCH', userToken, { title: 'Forbidden Edit' })).status, 403, '4. User cannot edit event');

    const deletable = await request('/events', 'POST', adminToken, eventPayload(`delete-${suffix}`));
    const deletableId = String((deletable.json.data as { _id: string })._id);
    createdEventIds.push(new mongoose.Types.ObjectId(deletableId));
    assertStatus((await request(`/events/${deletableId}`, 'DELETE', adminToken)).status, 200, '5. Admin deletes event');
    assertStatus((await request(`/events/${eventId}`, 'DELETE', userToken)).status, 403, '6. User cannot delete event');

    assertStatus((await request(`/events/${eventId}`, 'PATCH', adminToken, {
      ticketPrices: { normal: 700, vip: 1800 },
    })).status, 200, '7. Admin changes VIP price');
    assertStatus((await request(`/events/${eventId}`, 'PATCH', userToken, {
      ticketPrices: { normal: 700, vip: 1900 },
    })).status, 403, '8. User cannot change VIP price');

    const bookingCreation = await request('/bookings', 'POST', userToken, {
      eventId,
      ticketTier: 'vip',
      section: 'A',
      quantity: 2,
      paymentMethod: 'card',
      price: 1,
      unitPrice: 1,
      total: 1,
    });
    assertStatus(bookingCreation.status, 201, 'Booking is created from server-side pricing');
    const ownBookingData = (bookingCreation.json.data as {
      booking: { _id: string; bookingRef: string; subtotal: number; totalAmount: number };
    }).booking;
    if (ownBookingData.subtotal !== 3600 || ownBookingData.totalAmount !== 3600) {
      throw new Error('Booking trusted a client price or added an unexpected fee');
    }
    console.log('PASS Booking total is event price x quantity with no fees');
    const ownBooking = await Booking.findById(ownBookingData._id);
    if (!ownBooking) throw new Error('Created booking was not persisted');
    const otherBooking = await Booking.create({
      bookingRef: `OTHER-${suffix}`,
      userId: otherUser._id,
      eventId,
      tier: 'Normal',
      section: 'B',
      unitPrice: 700,
      quantity: 1,
      subtotal: 700,
      totalAmount: 700,
      paymentMethod: 'card',
    });
    createdBookingIds.push(ownBooking._id, otherBooking._id);
    assertStatus((await request(`/bookings/${ownBooking.bookingRef}`, 'GET', userToken)).status, 200, '9. User views own booking');
    assertStatus((await request(`/bookings/${otherBooking.bookingRef}`, 'GET', userToken)).status, 404, '10. User cannot view another booking');
    assertStatus((await request('/admin/bookings', 'GET', adminToken)).status, 200, '11. Admin views all bookings');
    assertStatus((await request('/admin/dashboard', 'GET', userToken)).status, 403, '12. User cannot access admin API');

    const registrationEmail = `role-injection-${suffix}@example.com`;
    const registration = await request('/auth/register', 'POST', undefined, {
      firstName: 'Role',
      lastName: 'Injection',
      countryCode: '+977',
      phoneNumber: `95${suffix.slice(-8)}`,
      gender: 'other',
      email: registrationEmail,
      password: 'AuditPass1!',
      confirmPassword: 'AuditPass1!',
      role: 'admin',
    });
    assertStatus(registration.status, 201, '13. Registration ignores requested admin role');
    const registered = await User.findOne({ email: registrationEmail });
    if (!registered || registered.role !== 'user') {
      throw new Error('13. Role injection created a non-user account');
    }
    createdUserIds.push(registered._id);
    console.log('PASS 13. Registered role is user');

    const storedRegistration = await User.findById(registered._id).select('+password').lean();
    if (
      !storedRegistration
      || !storedRegistration.password.startsWith('$2')
      || storedRegistration.password === 'AuditPass1!'
      || Object.prototype.hasOwnProperty.call(storedRegistration, 'confirmPassword')
    ) {
      throw new Error('Registered password was not safely persisted');
    }
    console.log('PASS Registration stores a bcrypt hash and never stores confirmPassword');

    assertStatus((await request('/auth/register', 'POST', undefined, {
      firstName: 'Duplicate',
      lastName: 'Email',
      countryCode: '+977',
      phoneNumber: `94${suffix.slice(-8)}`,
      gender: 'other',
      email: registrationEmail,
      password: 'AuditPass1!',
      confirmPassword: 'AuditPass1!',
    })).status, 409, 'Duplicate email is rejected');
    assertStatus((await request('/auth/register', 'POST', undefined, {
      firstName: 'Duplicate',
      lastName: 'Phone',
      countryCode: '+977',
      phoneNumber: registered.phoneNumber,
      gender: 'other',
      email: `different-${suffix}@example.com`,
      password: 'AuditPass1!',
      confirmPassword: 'AuditPass1!',
    })).status, 409, 'Duplicate phone is rejected');

    const login = await request('/auth/login', 'POST', undefined, {
      email: registrationEmail,
      password: 'AuditPass1!',
    });
    assertStatus(login.status, 200, 'Registered user logs in');
    const loginData = login.json.data as {
      user: { _id: string; role: string };
      token: string;
      tokens: { accessToken: string };
    };
    if (
      loginData.user._id !== registered._id.toString()
      || loginData.user.role !== 'user'
      || !loginData.token
      || loginData.tokens.accessToken !== loginData.token
    ) {
      throw new Error('Login did not return the authenticated user, role, and access token');
    }
    assertStatus((await request('/users/profile', 'GET', loginData.token)).status, 200, 'Login JWT accesses a protected endpoint');

    assertStatus((await request('/admin/payments', 'GET', adminToken)).status, 200, 'Admin views all payments');
    assertStatus((await request('/tickets', 'GET', adminToken)).status, 200, 'Admin views all tickets');
    assertStatus((await request('/admin/users', 'GET', userToken)).status, 403, 'User cannot list all users');
    assertStatus((await request('/admin/payments', 'GET', userToken)).status, 403, 'User cannot list all payments');
    assertStatus((await request('/tickets', 'GET', userToken)).status, 403, 'User cannot list all tickets');
  } finally {
    await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    await Event.deleteMany({ _id: { $in: createdEventIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
};

run()
  .then(async () => {
    await mongoose.disconnect();
    console.log('RBAC security audit passed.');
  })
  .catch(async error => {
    console.error('RBAC security audit failed:', error);
    await Booking.deleteMany({ _id: { $in: createdBookingIds } }).catch(() => undefined);
    await Event.deleteMany({ _id: { $in: createdEventIds } }).catch(() => undefined);
    await User.deleteMany({ _id: { $in: createdUserIds } }).catch(() => undefined);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
