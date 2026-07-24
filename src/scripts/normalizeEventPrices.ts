import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Event } from '../models/Event';

const NORMAL_PRICE = 600;
const VIP_PRICE = 1500;

const run = async (): Promise<void> => {
  await connectDatabase();
  const events = await Event.find();
  for (const event of events) {
    event.set('ticketPrices', { normal: NORMAL_PRICE, vip: VIP_PRICE });
    for (const tier of event.tiers) {
      if (/^(normal|standard)$/i.test(tier.name)) tier.price = NORMAL_PRICE;
      if (/^vip$/i.test(tier.name)) tier.price = VIP_PRICE;
    }
    await event.save();
  }
  console.log(`Normalized ticket prices for ${events.length} event(s).`);
};

run()
  .catch(error => {
    console.error('Event price normalization failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
