import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Event } from '../models/Event';

dotenv.config({ quiet: true });

const events = [
  {
    title: 'ArenaTicket Valorant Masters Kathmandu',
    slug: 'valorant-masters-kathmandu',
    category: 'valorant',
    date: new Date('2026-09-18T12:00:00+05:45'),
    location: 'Dasharath Stadium, Kathmandu',
    description: 'Nepal’s premier Valorant tournament featuring elite regional teams and a live championship final.',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e',
    prizePool: 1500000,
    format: 'Double Elimination • Best of 3',
    tiers: [
      { name: 'Standard', price: 1500, capacity: 800, available: 800 },
      { name: 'VIP', price: 4500, capacity: 150, available: 150 },
    ],
    relatedEvents: [],
  },
  {
    title: 'PUBG Mobile Nepal Championship',
    slug: 'pubg-mobile-nepal-championship',
    category: 'pubg-mobile',
    date: new Date('2026-10-10T11:00:00+05:45'),
    location: 'Bhrikutimandap Exhibition Hall, Kathmandu',
    description: 'A full-day PUBG Mobile championship with Nepal’s strongest squads competing for the national crown.',
    imageUrl: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6',
    prizePool: 2000000,
    format: 'League Stage • Grand Finals',
    tiers: [
      { name: 'Standard', price: 1200, capacity: 1200, available: 1200 },
      { name: 'VIP', price: 3500, capacity: 200, available: 200 },
    ],
    relatedEvents: [],
  },
  {
    title: 'Dota 2 Himalayan Invitational',
    slug: 'dota-2-himalayan-invitational',
    category: 'dota-2',
    date: new Date('2026-11-07T13:00:00+05:45'),
    location: 'Pokhara Event Center, Pokhara',
    description: 'An international Dota 2 invitational bringing top South Asian teams to Pokhara for a weekend LAN.',
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420',
    prizePool: 3000000,
    format: 'Groups • Single Elimination Playoffs',
    tiers: [
      { name: 'Standard', price: 1800, capacity: 600, available: 600 },
      { name: 'VIP', price: 5000, capacity: 100, available: 100 },
    ],
    relatedEvents: [],
  },
];

const seed = async (): Promise<void> => {
  try {
    await connectDatabase();
    for (const event of events) {
      await Event.updateOne({ slug: event.slug }, { $set: event }, { upsert: true, runValidators: true });
    }
    const seeded = await Event.find({ slug: { $in: events.map(event => event.slug) } });
    await Promise.all(seeded.map(event =>
      Event.updateOne({ _id: event._id }, { relatedEvents: seeded.filter(item => !item._id.equals(event._id)).map(item => item._id) }),
    ));
    console.log(`Seeded ${seeded.length} ArenaTicket events`);
  } finally {
    await mongoose.disconnect();
  }
};

seed().catch(error => {
  console.error('Event seeding failed:', error);
  process.exitCode = 1;
});
