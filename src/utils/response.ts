import { Response } from 'express';

export const sendSuccess = (res: Response, data: unknown, message: string, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};
