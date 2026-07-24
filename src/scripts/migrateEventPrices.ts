import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Event } from '../models/Event';

type LegacyTier = {
  name: string;
  price: number;
};

const run = async (): Promise<void> => {
  await connectDatabase();
  const legacyEvents = await Event.collection.find({
    $or: [
      { ticketPrices: { $exists: false } },
      { ticketPrices: null },
    ],
  }).toArray();

  if (legacyEvents.length === 0) {
    console.log('No legacy event prices require migration.');
    return;
  }

  const operations = legacyEvents.map(event => {
    const tiers = (event.tiers ?? []) as LegacyTier[];
    const normal = tiers.find(tier => /^(normal|standard)$/i.test(tier.name))?.price ?? 600;
    const vip = tiers.find(tier => /^vip$/i.test(tier.name))?.price ?? 1500;
    return {
      updateOne: {
        filter: { _id: event._id },
        update: { $set: { ticketPrices: { normal, vip } } },
      },
    };
  });

  const result = await Event.collection.bulkWrite(operations);
  console.log(`Migrated ticket prices for ${result.modifiedCount} event(s).`);
};

run()
  .catch(error => {
    console.error('Event price migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
