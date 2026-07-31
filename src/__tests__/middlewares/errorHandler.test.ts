import mongoose from 'mongoose';
import { z } from 'zod';
import multer from 'multer';
import { AppError, errorHandler } from '../../middlewares/errorHandler';

describe('errorHandler', () => {
  const req: any = { method: 'GET', originalUrl: '/test' };
  const res: any = { statusCode: 200, status(code: number) { this.statusCode = code; return this; }, json: jest.fn() };
  const next = jest.fn();

  it('handles AppError', () => {
    errorHandler(new AppError('Nope', 403), req, res, next);
    expect(res.statusCode).toBe(403);
  });

  it('handles zod errors', () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: 'bad' });
    if (!result.success) errorHandler(result.error, req, res, next);
    expect(res.statusCode).toBe(400);
  });

  it('handles duplicate email errors', () => {
    errorHandler(Object.assign(new Error('dup'), { code: 11000, keyPattern: { email: 1 } }), req, res, next);
    expect(res.statusCode).toBe(409);
  });

  it('handles validation errors', () => {
    const err = new mongoose.Error.ValidationError();
    err.addError('name', new mongoose.Error.ValidatorError({ path: 'name', message: 'Name required' }));
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(400);
  });

  it('handles cast errors', () => {
    errorHandler(new mongoose.Error.CastError('ObjectId', 'bad-id', 'id'), req, res, next);
    expect(res.statusCode).toBe(400);
  });

  it('handles syntax errors', () => {
    const err = new SyntaxError('bad json') as SyntaxError & { body?: string };
    err.body = '{}';
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(400);
  });

  it('handles multer file size errors for events', () => {
    const err = new multer.MulterError('LIMIT_FILE_SIZE');
    errorHandler(err, { ...req, originalUrl: '/api/v1/events' }, res, next);
    expect(res.statusCode).toBe(400);
  });

  it('falls back to 500', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new Error('boom'), req, res, next);
    expect(res.statusCode).toBe(500);
    consoleErrorSpy.mockRestore();
  });
});
