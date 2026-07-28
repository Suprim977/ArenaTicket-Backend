import dotenv from 'dotenv';

dotenv.config();

const required = (value: string | undefined, fallback: string, name: string) => {
  const resolved = value?.trim() || fallback;
  if (!resolved) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return resolved;
};

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = Number(process.env.PORT || 8089);
export const MONGO_URI = required(
  process.env.MONGO_URI || process.env.MONGODB_URI,
  'mongodb://127.0.0.1:27017/arenaticket',
  'MONGO_URI'
);
export const CLIENT_URL = required(process.env.CLIENT_URL, 'http://localhost:3000', 'CLIENT_URL');
export const CORS_ORIGIN = process.env.CORS_ORIGIN || CLIENT_URL;
export const JWT_SECRET = required(process.env.JWT_SECRET, 'replace-with-a-long-random-secret', 'JWT_SECRET');
export const EMAIL_USER = required(process.env.EMAIL_USER, 'your-gmail-address@gmail.com', 'EMAIL_USER');
export const EMAIL_PASS = required(process.env.EMAIL_PASS, 'your-gmail-app-password', 'EMAIL_PASS');
export const EMAIL_FROM = process.env.EMAIL_FROM || `ArenaTicket <${EMAIL_USER}>`;
