import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

// Import routes from features
import authRoutes from './features/auth/auth.route';
import tournamentRoutes from './features/tournament/tournament.route';
import ticketRoutes from './features/ticket/ticket.route';
import userRoutes from './features/user/user.route';
import adminRoutes from './features/admin/admin.route';

// Import middleware
import { errorHandler } from './middlewares/errorHandler';
import { sendSuccess } from './utils/response';

const app: Application = express();

// Security & Performance middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check route
app.get('/health', (req: Request, res: Response) => {
  sendSuccess(res, { status: 'ok', timestamp: new Date() }, 'Server is healthy');
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tournaments', tournamentRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);

// Error handling
app.use(errorHandler);

export default app;