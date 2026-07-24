import 'dotenv/config';
import { promises as fs } from 'fs';
import { AddressInfo } from 'net';
import { Server } from 'http';
import path from 'path';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../app';
import { connectDatabase } from '../config/database';
import { USER_UPLOADS_ROOT } from '../config/paths';
import { User } from '../models/User';

type ApiBody = {
  success?: boolean;
  message?: string;
  data?: {
    profilePicture?: string | null;
    user?: {
      profilePicture?: string | null;
    };
  };
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

const run = async (): Promise<void> => {
  await connectDatabase();
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');

  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const user = await User.create({
    firstName: 'Profile',
    lastName: 'Audit',
    countryCode: '+977',
    phoneNumber: `94${suffix.slice(-8)}`,
    gender: 'other',
    email: `profile-audit-${suffix}@example.com`,
    password: 'AuditPass1!',
  });
  const token = jwt.sign({ userId: user._id.toString() }, secret);
  let uploadedAbsolutePath: string | undefined;
  let server: Server | undefined;
  let origin = process.env.PROFILE_AUDIT_BASE_URL?.replace(/\/$/, '');
  if (!origin) {
    server = app.listen(0);
    await new Promise<void>((resolve, reject) => {
      server!.once('listening', resolve);
      server!.once('error', reject);
    });
    const port = (server.address() as AddressInfo).port;
    origin = `http://127.0.0.1:${port}`;
  }

  try {
    const form = new FormData();
    const jpegBytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
      0x49, 0x46, 0x00, 0x01, 0xff, 0xd9,
    ]);
    form.append('profilePicture', new Blob([jpegBytes], { type: 'image/jpeg' }), 'audit.jpg');
    const uploadResponse = await fetch(`${origin}/api/v1/users/profile/photo`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`,
        origin: 'http://localhost:3000',
      },
      body: form,
    });
    const uploadBody = await uploadResponse.json() as ApiBody;
    assert(uploadResponse.status === 200, 'Upload returns HTTP 200');
    assert(
      uploadResponse.headers.get('access-control-allow-origin') === 'http://localhost:3000',
      'CORS permits http://localhost:3000',
    );

    const profilePicture = uploadBody.data?.profilePicture;
    assert(
      typeof profilePicture === 'string' && /^\/uploads\/users\/[^/]+\.jpg$/i.test(profilePicture),
      'Upload response contains a browser-accessible profilePicture path',
    );
    assert(
      uploadBody.data?.user?.profilePicture === profilePicture,
      'Updated user contains the same profilePicture path',
    );
    console.log(`Returned profilePicture: ${profilePicture}`);

    uploadedAbsolutePath = path.resolve(
      USER_UPLOADS_ROOT,
      profilePicture.slice('/uploads/users/'.length),
    );
    assert(
      uploadedAbsolutePath.startsWith(`${USER_UPLOADS_ROOT}${path.sep}`),
      'Resolved test upload remains inside uploads/users',
    );
    const fileStats = await fs.stat(uploadedAbsolutePath);
    assert(fileStats.isFile(), 'Uploaded file exists physically in uploads/users');

    const exactImageUrl = `${origin}${profilePicture}`;
    console.log(`Verifying exact URL: ${exactImageUrl}`);
    const imageResponse = await fetch(exactImageUrl);
    assert(imageResponse.status === 200, 'Exact returned profilePicture URL returns HTTP 200');
    assert(
      ['image/jpeg', 'image/png', 'image/webp'].includes(
        imageResponse.headers.get('content-type')?.split(';')[0] ?? '',
      ),
      'Static response has a supported image Content-Type',
    );

    const firstUploadedPath = uploadedAbsolutePath;
    const replacementForm = new FormData();
    replacementForm.append('profilePicture', new Blob([jpegBytes], { type: 'image/jpeg' }), 'replacement.jpg');
    const replacementResponse = await fetch(`${origin}/api/v1/users/profile/photo`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: replacementForm,
    });
    const replacementBody = await replacementResponse.json() as ApiBody;
    const replacementPicture = replacementBody.data?.profilePicture;
    assert(
      replacementResponse.status === 200
        && typeof replacementPicture === 'string'
        && replacementPicture !== profilePicture,
      'A profile picture can be replaced',
    );
    uploadedAbsolutePath = path.resolve(
      USER_UPLOADS_ROOT,
      replacementPicture.slice('/uploads/users/'.length),
    );
    await assertFileMissing(firstUploadedPath);

    const missingResponse = await fetch(`${origin}/api/v1/users/profile/photo`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: new FormData(),
    });
    const missingBody = await missingResponse.json() as ApiBody;
    assert(
      missingResponse.status === 400 && Boolean(missingBody.message),
      'Missing profilePicture returns a readable HTTP 400',
    );

    const invalidForm = new FormData();
    invalidForm.append('profilePicture', new Blob(['not an image'], { type: 'text/plain' }), 'audit.txt');
    const invalidResponse = await fetch(`${origin}/api/v1/users/profile/photo`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: invalidForm,
    });
    assert(invalidResponse.status === 400, 'Invalid MIME type is rejected');

    const deleteResponse = await fetch(`${origin}/api/v1/users/profile/photo`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });
    const deleteBody = await deleteResponse.json() as ApiBody;
    assert(deleteResponse.status === 200, 'Removing a profile picture returns HTTP 200');
    assert(
      deleteBody.data?.profilePicture === null
        && deleteBody.data?.user?.profilePicture === null,
      'Removing a profile picture clears profilePicture',
    );
    const removedUser = await User.findById(user._id);
    assert(removedUser?.profilePicture === null, 'Database profilePicture is cleared');
    await assertFileMissing(uploadedAbsolutePath);
  } finally {
    if (uploadedAbsolutePath) {
      await fs.unlink(uploadedAbsolutePath).catch(error => {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      });
    }
    await User.deleteOne({ _id: user._id });
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close(error => error ? reject(error) : resolve());
      });
    }
  }
};

const assertFileMissing = async (filePath: string): Promise<void> => {
  try {
    await fs.access(filePath);
    throw new Error('Removed profile picture still exists on disk');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    console.log('PASS Removing a profile picture deletes its local file');
  }
};

run()
  .then(async () => {
    await mongoose.disconnect();
    console.log('Profile-picture audit passed.');
  })
  .catch(async error => {
    console.error('Profile-picture audit failed:', error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
