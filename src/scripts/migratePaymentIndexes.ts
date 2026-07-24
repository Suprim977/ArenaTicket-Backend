import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';

const LEGACY_INDEX = 'transactionId_1';

const run = async (): Promise<void> => {
  await connectDatabase();
  const payments = mongoose.connection.collection('payments');
  const indexes = await payments.indexes();
  if (!indexes.some(index => index.name === LEGACY_INDEX)) {
    console.log('No legacy payment index requires migration.');
    return;
  }
  await payments.dropIndex(LEGACY_INDEX);
  console.log(`Removed legacy payment index ${LEGACY_INDEX}.`);
};

run()
  .catch(error => {
    console.error('Payment index migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
