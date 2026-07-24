import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Booking } from '../models/Booking';

const run = async (): Promise<void> => {
  await connectDatabase();
  const bookings = await Booking.collection.find({
    $or: [{ unitPrice: { $exists: false } }, { unitPrice: null }],
  }).toArray();

  if (bookings.length === 0) {
    console.log('No booking unit prices require migration.');
    return;
  }

  const operations = bookings.map(booking => ({
    updateOne: {
      filter: { _id: booking._id },
      update: {
        $set: {
          unitPrice: Number(booking.subtotal) / Number(booking.quantity),
        },
      },
    },
  }));
  const result = await Booking.collection.bulkWrite(operations);
  console.log(`Migrated unit prices for ${result.modifiedCount} booking(s).`);
};

run()
  .catch(error => {
    console.error('Booking unit-price migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
