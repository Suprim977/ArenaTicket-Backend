import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { User } from '../models/User';

type Body = {
  message?: string;
  data?: {
    user?: {
      _id?: string;
      email?: string;
      password?: string;
    };
    token?: string;
  };
};

const origin = 'http://localhost:8089/api/v1';
const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
const createdIds: mongoose.Types.ObjectId[] = [];

const request = async (
  path: string,
  method: string,
  token?: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; body: Body }> => {
  const response = await fetch(`${origin}${path}`, {
    method,
    signal: globalThis.AbortSignal.timeout(10_000),
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed: Body;
  try {
    parsed = JSON.parse(text) as Body;
  } catch {
    throw new Error(`${method} ${path}: HTTP ${response.status}; non-JSON response: ${text.slice(0, 500)}`);
  }
  return { status: response.status, body: parsed };
};

const assertStatus = (actual: number, expected: number, label: string): void => {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
  console.log(`PASS ${label}: HTTP ${actual}`);
};

const run = async (): Promise<void> => {
  await connectDatabase();
  const admin = await User.create({
    firstName: 'Live',
    lastName: 'Admin',
    countryCode: '+977',
    phoneNumber: `98${suffix.slice(-8)}`,
    gender: 'other',
    email: `live-admin-${suffix}@example.com`,
    password: 'AdminPass1!',
    role: 'admin',
  });
  const normalUser = await User.create({
    firstName: 'Live',
    lastName: 'Caller',
    countryCode: '+977',
    phoneNumber: `97${suffix.slice(-8)}`,
    gender: 'other',
    email: `live-caller-${suffix}@example.com`,
    password: 'CallerPass1!',
    role: 'user',
  });
  createdIds.push(admin._id, normalUser._id);

  const createdEmail = `live-created-${suffix}@example.com`;
  const createPayload = {
    firstName: 'Created',
    lastName: 'User',
    countryCode: '+977',
    phoneNumber: `96${suffix.slice(-8)}`,
    gender: 'female' as const,
    email: createdEmail,
    password: 'CreatedPass1!',
    role: 'user' as const,
  };

  const adminLogin = await request('/auth/login', 'POST', undefined, {
    email: admin.email,
    password: 'AdminPass1!',
  });
  assertStatus(adminLogin.status, 200, 'admin login');
  const adminToken = adminLogin.body.data?.token;
  if (!adminToken) throw new Error('Admin login did not return a JWT');

  const normalLogin = await request('/auth/login', 'POST', undefined, {
    email: normalUser.email,
    password: 'CallerPass1!',
  });
  assertStatus(normalLogin.status, 200, 'normal user login');
  const normalToken = normalLogin.body.data?.token;
  if (!normalToken) throw new Error('Normal-user login did not return a JWT');

  const noToken = await request('/admin/users', 'POST', undefined, createPayload);
  assertStatus(noToken.status, 401, 'admin create without token');
  const forbidden = await request('/admin/users', 'POST', normalToken, createPayload);
  assertStatus(forbidden.status, 403, 'admin create with normal-user token');
  const created = await request('/admin/users', 'POST', adminToken, createPayload);
  assertStatus(created.status, 201, 'admin creates user');
  if (created.body.data?.user?.password !== undefined) {
    throw new Error('Admin create response exposed password');
  }

  const stored = await User.findOne({ email: createdEmail }).select('+password');
  if (!stored) throw new Error('Admin-created user does not exist in MongoDB');
  if (!createdIds.some(id => id.equals(stored._id))) createdIds.push(stored._id);
  if (!stored.password.startsWith('$2')) throw new Error('Admin-created password is not hashed');
  console.log('PASS admin-created user exists in MongoDB with a bcrypt hash');

  const wrongCurrent = await request('/users/change-password', 'PATCH', normalToken, {
    currentPassword: 'WrongPass9!',
    newPassword: 'ChangedPass2@',
  });
  assertStatus(wrongCurrent.status, 400, 'wrong current password');
  const changed = await request('/users/change-password', 'PATCH', normalToken, {
    currentPassword: 'CallerPass1!',
    newPassword: 'ChangedPass2@',
  });
  assertStatus(changed.status, 200, 'change password');
  const oldLogin = await request('/auth/login', 'POST', undefined, {
    email: normalUser.email,
    password: 'CallerPass1!',
  });
  assertStatus(oldLogin.status, 401, 'old password login');
  const newLogin = await request('/auth/login', 'POST', undefined, {
    email: normalUser.email,
    password: 'ChangedPass2@',
  });
  assertStatus(newLogin.status, 200, 'new password login');

};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (createdIds.length) await User.deleteMany({ _id: { $in: createdIds } });
    await mongoose.disconnect();
  });
