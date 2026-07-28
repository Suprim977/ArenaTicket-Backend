import mongoose from 'mongoose';
import { MONGO_URI } from './index';

export const connectDatabase = async (): Promise<void> => {
  try {
    const connection = await mongoose.connect(MONGO_URI);
    console.log(`MongoDB connected: host=${connection.connection.host} database=${connection.connection.name}`);
    console.log(`User collection: ${connection.connection.collection('users').collectionName}`);
    
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};
