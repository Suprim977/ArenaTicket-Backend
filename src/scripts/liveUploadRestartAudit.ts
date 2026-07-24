import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { EVENT_UPLOADS_ROOT, USER_UPLOADS_ROOT } from '../config/paths';
import { Event } from '../models/Event';
import { User } from '../models/User';

const origin = 'http://localhost:8089';
const stateFile = path.resolve(process.cwd(), '.live-upload-audit-state.json');
const jpeg = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01, 0xff, 0xd9,
]);

type State = {
  eventId: string;
  userId: string;
  adminId: string;
  eventImageUrl: string;
  profileImageUrl: string;
};
type Body = {
  message?: string;
  data?: {
    _id?: string;
    imageUrl?: string;
    profilePicture?: string | null;
    user?: { profilePicture?: string | null };
  };
};

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
  console.log(`PASS ${message}`);
}

const auth = (token: string): Record<string, string> => ({
  authorization: `Bearer ${token}`,
});

const eventForm = (slug: string): FormData => {
  const form = new FormData();
  form.append('title', 'Live Upload Restart Audit');
  form.append('slug', slug);
  form.append('category', 'audit');
  form.append('date', new Date(Date.now() + 86400000).toISOString());
  form.append('location', 'Live Audit Arena');
  form.append('description', 'Persistent event for the live upload and restart audit.');
  form.append('prizePool', '1000');
  form.append('format', '5v5');
  form.append('availability', 'true');
  form.append('ticketPrices', JSON.stringify({ normal: 600, vip: 1500 }));
  form.append('tiers', JSON.stringify([
    { name: 'Normal', price: 600, capacity: 20 },
    { name: 'VIP', price: 1500, capacity: 10 },
  ]));
  return form;
};

const json = async (response: globalThis.Response): Promise<Body> =>
  response.json() as Promise<Body>;

const setup = async (): Promise<void> => {
  await connectDatabase();
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const admin = await User.create({
    firstName: 'Live', lastName: 'Admin', countryCode: '+977',
    phoneNumber: `92${suffix.slice(-8)}`, gender: 'other',
    email: `live-admin-${suffix}@example.com`, password: 'AuditPass1!', role: 'admin',
  });
  const user = await User.create({
    firstName: 'Live', lastName: 'User', countryCode: '+977',
    phoneNumber: `91${suffix.slice(-8)}`, gender: 'other',
    email: `live-user-${suffix}@example.com`, password: 'AuditPass1!',
  });
  const adminToken = jwt.sign({ userId: admin._id.toString() }, secret);
  const userToken = jwt.sign({ userId: user._id.toString() }, secret);

  const createForm = eventForm(`live-upload-${suffix}`);
  createForm.append('eventImage', new Blob([jpeg], { type: 'image/jpeg' }), 'first.jpg');
  const createResponse = await fetch(`${origin}/api/v1/events`, {
    method: 'POST', headers: auth(adminToken), body: createForm,
  });
  const created = await json(createResponse);
  assert(createResponse.status === 201, 'live multipart event creation returns 201');
  assert(typeof created.data?._id === 'string', 'created event returns an ID');
  assert(
    typeof created.data.imageUrl === 'string'
      && created.data.imageUrl.startsWith('/uploads/events/'),
    'event stores a backend-relative imageUrl',
  );
  const eventId = created.data._id;
  const firstUrl = created.data.imageUrl;
  const firstFile = path.resolve(EVENT_UPLOADS_ROOT, firstUrl.slice('/uploads/events/'.length));
  assert((await fs.stat(firstFile)).isFile(), 'first event image exists under uploads/events');
  assert((await fetch(`${origin}${firstUrl}`)).status === 200, 'first event image URL returns 200');
  const fetched = await json(await fetch(`${origin}/api/v1/events/${eventId}`));
  assert(fetched.data?.imageUrl === firstUrl, 'GET event returns the stored imageUrl');

  const replace = new FormData();
  replace.append('eventImage', new Blob([jpeg], { type: 'image/webp' }), 'second.webp');
  const replaceResponse = await fetch(`${origin}/api/v1/events/${eventId}`, {
    method: 'PATCH', headers: auth(adminToken), body: replace,
  });
  const replaced = await json(replaceResponse);
  assert(
    replaceResponse.status === 200
      && typeof replaced.data?.imageUrl === 'string'
      && replaced.data.imageUrl.endsWith('.webp'),
    'event image replacement succeeds',
  );
  const eventImageUrl = replaced.data.imageUrl;
  assert(eventImageUrl !== firstUrl, 'replacement updates imageUrl');
  await fs.access(firstFile).then(
    () => { throw new Error('old event image was not removed'); },
    error => assert((error as NodeJS.ErrnoException).code === 'ENOENT', 'old event image is removed safely'),
  );
  assert((await fetch(`${origin}${eventImageUrl}`)).status === 200, 'replacement event image URL returns 200');

  const noImageResponse = await fetch(`${origin}/api/v1/events/${eventId}`, {
    method: 'PATCH',
    headers: { ...auth(adminToken), 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Live Upload Restart Audit Updated' }),
  });
  const noImage = await json(noImageResponse);
  assert(noImageResponse.status === 200 && noImage.data?.imageUrl === eventImageUrl, 'edit without eventImage retains imageUrl');

  const invalid = new FormData();
  invalid.append('eventImage', new Blob(['script'], { type: 'text/javascript' }), 'bad.js');
  const invalidResponse = await fetch(`${origin}/api/v1/events/${eventId}`, {
    method: 'PATCH', headers: auth(adminToken), body: invalid,
  });
  assert(invalidResponse.status === 400, 'unsupported event image is rejected');

  const oversized = new FormData();
  oversized.append('eventImage', new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' }), 'large.png');
  const oversizedResponse = await fetch(`${origin}/api/v1/events/${eventId}`, {
    method: 'PATCH', headers: auth(adminToken), body: oversized,
  });
  assert(oversizedResponse.status === 400, 'event image above 5 MB is rejected');

  const profile = new FormData();
  profile.append('profilePicture', new Blob([jpeg], { type: 'image/jpeg' }), 'profile.jpg');
  const profileResponse = await fetch(`${origin}/api/v1/users/profile/photo`, {
    method: 'PATCH', headers: auth(userToken), body: profile,
  });
  const uploadedProfile = await json(profileResponse);
  const profileImageUrl = uploadedProfile.data?.profilePicture;
  assert(
    profileResponse.status === 200
      && typeof profileImageUrl === 'string'
      && profileImageUrl.startsWith('/uploads/users/'),
    'profile upload stores a backend-relative path',
  );
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const profileGet = await json(await fetch(`${origin}/api/v1/users/profile`, { headers: auth(userToken) }));
    assert(profileGet.data?.user?.profilePicture === profileImageUrl, `GET profile attempt ${attempt} returns the same path`);
  }
  assert((await fetch(`${origin}${profileImageUrl}`)).status === 200, 'profile image URL returns 200');

  const state: State = {
    eventId, userId: user._id.toString(), adminId: admin._id.toString(),
    eventImageUrl, profileImageUrl,
  };
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2), 'utf8');
  console.log(`EVENT_IMAGE_URL=${eventImageUrl}`);
  console.log(`PROFILE_IMAGE_URL=${profileImageUrl}`);
};

const verify = async (): Promise<void> => {
  await connectDatabase();
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8')) as State;
  const event = await Event.findById(state.eventId);
  const user = await User.findById(state.userId);
  assert(event?.imageUrl === state.eventImageUrl, 'event imageUrl remains in MongoDB after restart');
  assert(user?.profilePicture === state.profileImageUrl, 'profilePicture remains in MongoDB after restart');
  assert((await fetch(`${origin}${state.eventImageUrl}`)).status === 200, 'event image URL returns 200 after restart');
  assert((await fetch(`${origin}${state.profileImageUrl}`)).status === 200, 'profile image URL returns 200 after restart');
};

const cleanup = async (): Promise<void> => {
  await connectDatabase();
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8')) as State;
  await Event.deleteOne({ _id: state.eventId });
  await User.deleteMany({ _id: { $in: [state.userId, state.adminId] } });
  const eventFile = path.resolve(EVENT_UPLOADS_ROOT, state.eventImageUrl.slice('/uploads/events/'.length));
  const userFile = path.resolve(USER_UPLOADS_ROOT, state.profileImageUrl.slice('/uploads/users/'.length));
  await Promise.all([fs.unlink(eventFile), fs.unlink(userFile)].map(promise =>
    promise.catch(error => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    })
  ));
  await fs.unlink(stateFile);
  console.log('PASS live audit data cleaned up');
};

const mode = process.argv[2];
const action = mode === 'setup' ? setup : mode === 'verify' ? verify : mode === 'cleanup' ? cleanup : undefined;
if (!action) throw new Error('Use setup, verify, or cleanup');
action()
  .then(() => mongoose.disconnect())
  .catch(async error => {
    console.error(error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
