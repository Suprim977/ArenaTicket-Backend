import mongoose from 'mongoose';
import { User } from '../features/user/model/user.model';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/arenaticket';

    const connection = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${connection.connection.host}`);

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@arenaticket.com').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        name: 'Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'ADMIN',
      });
      console.log(`Default admin user created: ${adminEmail}`);
    } else if (existingAdmin.role !== 'ADMIN') {
      existingAdmin.role = 'ADMIN';
      await existingAdmin.save();
      console.log(`Existing user promoted to admin: ${adminEmail}`);
    }
    
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};