import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorHandler } from './shared/middleware/errorHandler';
import { sendSuccess } from './shared/utils/response';
import authRoutes from './modules/auth/routes';

console.log('>>> Auth routes imported:', typeof authRoutes);

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (req: Request, res: Response) => {
  sendSuccess(res, { status: 'ok' }, 'Server is healthy');
});

console.log('>>> About to mount auth routes');
app.use('/api/v1/auth', authRoutes);
console.log('>>> Auth routes mounted');

app.use(errorHandler);

export default app;