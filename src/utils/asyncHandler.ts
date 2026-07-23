import { NextFunction, RequestHandler, Response } from 'express';

type AsyncController = (req: any, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (controller: AsyncController): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(controller(req, res, next)).catch(next);
  };
