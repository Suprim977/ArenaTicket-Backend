import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File size must not exceed 3MB' : err.message;
  }

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  if (err instanceof ZodError) {
    statusCode = 400;
    const issue = err.issues[0];
    const fieldName = issue?.path[issue.path.length - 1];
    message = issue?.code === 'invalid_type' && fieldName
      ? `Missing field: ${String(fieldName)}`
      : issue?.message || 'Invalid request data';
  }

  if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON request body';
  }

  // MongoDB's unique index error is expected for an existing registration email.
  if ((err as { code?: number }).code === 11000) {
    statusCode = 409;
    const keyPattern = (err as { keyPattern?: Record<string, number> }).keyPattern || {};
    message = keyPattern.countryCode || keyPattern.phoneNumber
      ? 'Phone number already registered for this country code'
      : 'Email already registered';
  }

  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    const validationError = Object.values(err.errors)[0];
    message = validationError?.message || 'Invalid request data';
  }

  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  }

  if (err.name === 'MongoServerSelectionError') {
    statusCode = 503;
    message = 'Database is unavailable';
  }

  if (statusCode === 500) {
    console.error('Unhandled API error', {
      method: req.method,
      path: req.originalUrl,
      errorName: err.name,
      message: err.message,
    });
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};
