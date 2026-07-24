import 'dotenv/config';
import { createHash } from 'crypto';
import { AddressInfo } from 'net';
import mongoose from 'mongoose';
import app from '../app';
import { connectDatabase } from '../config/database';
import { User } from '../models/User';

type Json = Record<string, unknown>;

function assert(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(label);
  console.log(`PASS ${label}`);
}

const run = async (): Promise<void> => {
  await connectDatabase();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const email = `password-reset-${suffix}@example.com`;
  const oldPassword = 'OldAudit1!';
  const newPassword = 'NewAudit2@';
  const user = await User.create({
    firstName: 'Password',
    lastName: 'Reset',
    countryCode: '+977',
    phoneNumber: `94${suffix.slice(-8)}`,
    gender: 'other',
    email,
    password: oldPassword,
  });
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  const server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  const request = async (path: string, body: Json) => {
    const response = await fetch(`${origin}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as Json };
  };

  try {
    const known = await request('/auth/forgot-password', { email });
    const unknown = await request('/auth/forgot-password', {
      email: `unknown-${suffix}@example.com`,
    });
    const safeMessage = 'If an account exists for this email, password reset instructions have been sent.';
    const knownDelivery = (known.body.data as {
      devDelivery: { resetToken: string; resetUrl: string; expiresInMinutes: number };
    }).devDelivery;
    const unknownDelivery = (unknown.body.data as {
      devDelivery: { resetToken: string; resetUrl: string; expiresInMinutes: number };
    }).devDelivery;
    assert(
      known.status === 200
        && unknown.status === 200
        && known.body.message === safeMessage
        && unknown.body.message === safeMessage
        && /^[a-f0-9]{64}$/.test(knownDelivery.resetToken)
        && /^[a-f0-9]{64}$/.test(unknownDelivery.resetToken)
        && knownDelivery.expiresInMinutes === 30
        && knownDelivery.resetUrl.includes('/reset-password?token='),
      'Known and unknown emails receive the same safe development response shape',
    );

    const malformed = await request('/auth/forgot-password', { email: 'not-an-email' });
    assert(malformed.status === 400, 'Malformed forgot-password email is rejected');

    const stored = await User.findById(user._id)
      .select('+passwordResetTokenHash +passwordResetExpiresAt')
      .lean();
    assert(
      stored?.passwordResetTokenHash === createHash('sha256')
        .update(knownDelivery.resetToken)
        .digest('hex')
        && stored.passwordResetTokenHash !== knownDelivery.resetToken
        && stored.passwordResetExpiresAt instanceof Date
        && stored.passwordResetExpiresAt.getTime() > Date.now(),
      'Only a hash of the secure reset token is stored with a future expiry',
    );

    const invalid = await request('/auth/reset-password', {
      token: 'a'.repeat(64),
      newPassword,
      confirmPassword: newPassword,
    });
    assert(
      invalid.status === 400
        && invalid.body.message === 'This password reset link is invalid or has expired.',
      'Invalid reset token is rejected with a safe message',
    );

    const mismatch = await request('/auth/reset-password', {
      token: knownDelivery.resetToken,
      newPassword,
      confirmPassword: 'Different2@',
    });
    assert(mismatch.status === 400, 'Password confirmation mismatch is rejected');

    const weak = await request('/auth/reset-password', {
      token: knownDelivery.resetToken,
      newPassword: 'weak',
      confirmPassword: 'weak',
    });
    assert(weak.status === 400, 'Weak reset password is rejected by registration rules');

    const expiring = await request('/auth/forgot-password', { email });
    const expiringToken = (expiring.body.data as {
      devDelivery: { resetToken: string };
    }).devDelivery.resetToken;
    await User.updateOne(
      { _id: user._id },
      { $set: { passwordResetExpiresAt: new Date(Date.now() - 1000) } },
    );
    const expired = await request('/auth/reset-password', {
      token: expiringToken,
      newPassword,
      confirmPassword: newPassword,
    });
    assert(
      expired.status === 400
        && expired.body.message === 'This password reset link is invalid or has expired.',
      'Expired reset token is rejected',
    );

    const fresh = await request('/auth/forgot-password', { email });
    const freshToken = (fresh.body.data as {
      devDelivery: { resetToken: string };
    }).devDelivery.resetToken;
    const reset = await request('/auth/reset-password', {
      token: freshToken,
      newPassword,
      confirmPassword: newPassword,
    });
    assert(reset.status === 200, 'Valid one-time token resets the password');

    const reused = await request('/auth/reset-password', {
      token: freshToken,
      newPassword: 'Another3#',
      confirmPassword: 'Another3#',
    });
    assert(
      reused.status === 400
        && reused.body.message === 'This password reset link is invalid or has expired.',
      'Consumed reset token cannot be reused',
    );

    const oldLogin = await request('/auth/login', { email, password: oldPassword });
    const newLogin = await request('/auth/login', { email, password: newPassword });
    assert(oldLogin.status === 401, 'Old password no longer logs in');
    assert(
      newLogin.status === 200
        && Boolean((newLogin.body.data as { token: string }).token),
      'New password logs in and returns a JWT',
    );

    const updated = await User.findById(user._id)
      .select('+password +passwordResetTokenHash +passwordResetExpiresAt')
      .lean();
    assert(
      Boolean(
        updated
        && updated.password.startsWith('$2')
        && updated.password !== newPassword
        && !updated.passwordResetTokenHash
        && !updated.passwordResetExpiresAt,
      ),
      'New password is bcrypt-hashed and reset-token fields are cleared',
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    await User.deleteOne({ _id: user._id });
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
};

run()
  .then(async () => {
    await mongoose.disconnect();
    console.log('Password-reset audit passed.');
  })
  .catch(async error => {
    console.error('Password-reset audit failed:', error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
