import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/arenaticket';

    const connection = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${connection.connection.host}`);
    
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};