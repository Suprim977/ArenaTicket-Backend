import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { EVENT_UPLOADS_ROOT } from '../config/paths';
import { Event } from '../models/Event';
import { User } from '../models/User';

type ApiBody = {
  message?: string;
  data?: { _id?: string; imageUrl?: string };
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

const imageBytes = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01, 0xff, 0xd9,
]);

const addEventFields = (form: FormData, slug: string): void => {
  form.append('title', 'Event Image Audit');
  form.append('slug', slug);
  form.append('category', 'audit');
  form.append('date', new Date(Date.now() + 86400000).toISOString());
  form.append('location', 'Audit Arena');
  form.append('description', 'Temporary event used to audit event image uploads.');
  form.append('prizePool', '1000');
  form.append('format', '5v5');
  form.append('availability', 'true');
  form.append('ticketPrices', JSON.stringify({ normal: 600, vip: 1500 }));
  form.append('tiers', JSON.stringify([
    { name: 'Normal', price: 600, capacity: 20 },
    { name: 'VIP', price: 1500, capacity: 10 },
  ]));
};

const assertMissing = async (filePath: string, label: string): Promise<void> => {
  try {
    await fs.access(filePath);
    throw new Error(label);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    console.log(`PASS ${label}`);
  }
};

const run = async (): Promise<void> => {
  await connectDatabase();
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');

  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const admin = await User.create({
    firstName: 'Event',
    lastName: 'ImageAudit',
    countryCode: '+977',
    phoneNumber: `93${suffix.slice(-8)}`,
    gender: 'other',
    email: `event-image-audit-${suffix}@example.com`,
    password: 'AuditPass1!',
    role: 'admin',
  });
  const token = jwt.sign({ userId: admin._id.toString() }, secret);
  let eventId: string | undefined;
  const localFiles = new Set<string>();
  const origin = 'http://localhost:8089';

  try {
    const createForm = new FormData();
    addEventFields(createForm, `event-image-${suffix}`);
    createForm.append('eventImage', new Blob([imageBytes], { type: 'image/jpeg' }), 'banner.jpg');
    const createResponse = await fetch(`${origin}/api/v1/events`, {
      method: 'POST',
      signal: globalThis.AbortSignal.timeout(15_000),
      headers: { authorization: `Bearer ${token}` },
      body: createForm,
    });
    const created = await createResponse.json() as ApiBody;
    assert(createResponse.status === 201, 'Admin creates an event with eventImage');
    eventId = created.data?._id;
    const firstImage = created.data?.imageUrl;
    assert(typeof eventId === 'string', 'Created event response includes its ID');
    assert(
      typeof firstImage === 'string' && firstImage.startsWith('/uploads/events/'),
      'Create returns a stable imageUrl path',
    );
    const firstFile = path.resolve(EVENT_UPLOADS_ROOT, firstImage.slice('/uploads/events/'.length));
    localFiles.add(firstFile);
    assert((await fs.stat(firstFile)).isFile(), 'Created event image is saved in uploads/events');
    assert((await fetch(`${origin}${firstImage}`, { signal: globalThis.AbortSignal.timeout(10_000) })).status === 200, 'Created event image URL returns HTTP 200');
    const fetched = await (await fetch(`${origin}/api/v1/events/${eventId}`, { signal: globalThis.AbortSignal.timeout(10_000) })).json() as ApiBody;
    assert(fetched.data?.imageUrl === firstImage, 'GET event returns the stored imageUrl');

    const replacementForm = new FormData();
    replacementForm.append('eventImage', new Blob([imageBytes], { type: 'image/webp' }), 'replacement.webp');
    const replacementResponse = await fetch(`${origin}/api/v1/events/${eventId}`, {
      method: 'PATCH',
      signal: globalThis.AbortSignal.timeout(15_000),
      headers: { authorization: `Bearer ${token}` },
      body: replacementForm,
    });
    const replaced = await replacementResponse.json() as ApiBody;
    const secondImage = replaced.data?.imageUrl;
    assert(
      replacementResponse.status === 200
        && typeof secondImage === 'string'
        && secondImage.endsWith('.webp')
        && secondImage !== firstImage,
      'Admin replaces an event image',
    );
    const secondFile = path.resolve(EVENT_UPLOADS_ROOT, secondImage.slice('/uploads/events/'.length));
    localFiles.add(secondFile);
    await assertMissing(firstFile, 'Replacing an event image removes the old local file');
    assert((await fetch(`${origin}${secondImage}`, { signal: globalThis.AbortSignal.timeout(10_000) })).status === 200, 'Replacement image URL returns HTTP 200');

    const invalidForm = new FormData();
    invalidForm.append('eventImage', new Blob(['script'], { type: 'text/javascript' }), 'event.js');
    const invalidResponse = await fetch(`${origin}/api/v1/events/${eventId}`, {
      method: 'PATCH',
      signal: globalThis.AbortSignal.timeout(15_000),
      headers: { authorization: `Bearer ${token}` },
      body: invalidForm,
    });
    const invalidBody = await invalidResponse.json() as ApiBody;
    assert(
      invalidResponse.status === 400
        && invalidBody.message === 'Only JPG, JPEG, PNG and WEBP images are allowed.',
      'Unsupported event images receive the required readable error',
    );

    const oversizedForm = new FormData();
    oversizedForm.append(
      'eventImage',
      new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' }),
      'large.png',
    );
    const oversizedResponse = await fetch(`${origin}/api/v1/events/${eventId}`, {
      method: 'PATCH',
      signal: globalThis.AbortSignal.timeout(15_000),
      headers: { authorization: `Bearer ${token}` },
      body: oversizedForm,
    });
    const oversizedBody = await oversizedResponse.json() as ApiBody;
    assert(
      oversizedResponse.status === 400
        && oversizedBody.message === 'Event image must be 5 MB or smaller.',
      'Oversized event images receive the required readable error',
    );

    const deleteResponse = await fetch(`${origin}/api/v1/events/${eventId}`, {
      method: 'DELETE',
      signal: globalThis.AbortSignal.timeout(10_000),
      headers: { authorization: `Bearer ${token}` },
    });
    assert(deleteResponse.status === 200, 'Admin deletes the event');
    eventId = undefined;
    await assertMissing(secondFile, 'Deleting an event removes its local image');
  } finally {
    if (eventId) await Event.deleteOne({ _id: eventId });
    await User.deleteOne({ _id: admin._id });
    for (const file of localFiles) {
      await fs.unlink(file).catch(error => {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      });
    }
  }
};

run()
  .then(async () => {
    await mongoose.disconnect();
    console.log('Event-image audit passed.');
  })
  .catch(async error => {
    console.error('Event-image audit failed:', error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
