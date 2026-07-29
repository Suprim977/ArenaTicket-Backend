import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");

const envResult = dotenv.config({
  path: envPath,
});

if (envResult.error) {
  throw new Error(`Failed to load environment file at ${envPath}`);
}

const required = (
  value: string | undefined,
  fallback: string,
  name: string
): string => {
  const resolved = value?.trim() || fallback;

  if (!resolved) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return resolved;
};

export const NODE_ENV = process.env.NODE_ENV || "development";

export const PORT = Number(process.env.PORT || 8089);

export const BASE_URL =
  process.env.BASE_URL || `http://localhost:${PORT}`;

export const MONGO_URI = required(
  process.env.MONGO_URI || process.env.MONGODB_URI,
  "mongodb://127.0.0.1:27017/arenaticket",
  "MONGO_URI"
);

export const CLIENT_URL = required(
  process.env.CLIENT_URL || process.env.FRONTEND_URL,
  "http://localhost:3000",
  "CLIENT_URL"
);

export const FRONTEND_URL =
  process.env.FRONTEND_URL || CLIENT_URL;

export const CORS_ORIGIN =
  process.env.CORS_ORIGIN || CLIENT_URL;

export const JWT_SECRET = required(
  process.env.JWT_SECRET,
  "",
  "JWT_SECRET"
);

export const JWT_ACCESS_EXPIRY =
  process.env.JWT_ACCESS_EXPIRY || "15m";

export const JWT_REFRESH_EXPIRY =
  process.env.JWT_REFRESH_EXPIRY || "7d";

export const EMAIL_USER = required(
  process.env.EMAIL_USER || process.env.SMTP_USER,
  "your-gmail-address@gmail.com",
  "EMAIL_USER"
);

export const EMAIL_PASS = required(
  process.env.EMAIL_PASS || process.env.SMTP_PASS,
  "your-gmail-app-password",
  "EMAIL_PASS"
);

export const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  `ArenaTicket <${EMAIL_USER}>`;

export const ADMIN_REGISTRATION_SECRET = required(
  process.env.ADMIN_REGISTRATION_SECRET,
  "",
  "ADMIN_REGISTRATION_SECRET"
);

export const ESEWA_SECRET_KEY =
  process.env.ESEWA_SECRET_KEY || "";

export const ESEWA_MERCHANT_CODE =
  process.env.ESEWA_MERCHANT_CODE || "EPAYTEST";

export const KHALTI_SECRET_KEY =
  process.env.KHALTI_SECRET_KEY || "";

export const KHALTI_MERCHANT_CODE =
  process.env.KHALTI_MERCHANT_CODE || "";

export const PAYMENT_WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET || "";
