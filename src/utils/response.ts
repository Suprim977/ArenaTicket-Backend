import { Response } from 'express';

export const sendSuccess = (res: Response, data: any, message: string, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};