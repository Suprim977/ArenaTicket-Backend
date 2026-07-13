import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const connection = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${connection.connection.host}`);
    
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};