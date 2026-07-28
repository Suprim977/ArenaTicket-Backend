import dotenv from 'dotenv';
dotenv.config({ quiet: true });

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

import app from './app';
import { connectDatabase } from './config/database';
import { PORT } from './config/index';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
