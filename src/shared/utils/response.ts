import { Response } from 'express';

interface ApiSuccessResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiErrorResponse {
  success: boolean;
  message: string;
  errors?: string[] | object;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Operation successful',
  statusCode: number = 200
): void => {
  const response: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
  };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: string[] | object
): void => {
  const response: ApiErrorResponse = {
    success: false,
    message,
    ...(errors && { errors }),
  };
  res.status(statusCode).json(response);
};