import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not configured');
    }

    const connection = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: host=${connection.connection.host} database=${connection.connection.name}`);
    console.log(`User collection: ${connection.connection.collection('users').collectionName}`);
    
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};
