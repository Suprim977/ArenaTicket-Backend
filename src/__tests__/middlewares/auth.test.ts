jest.mock('../../models/User', () => ({ User: { findById: jest.fn() } }));
jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));

import jwt from 'jsonwebtoken';
import { User } from '../../models/User';
import { authenticate } from '../../middlewares/auth';

describe('authenticate middleware', () => {
  const next = jest.fn();
  const res: any = {};

  beforeEach(() => {
    next.mockReset();
  });

  it('rejects missing token', async () => {
    await authenticate({ headers: {} } as any, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, message: 'Authentication required' }));
  });

  it('rejects missing jwt config', async () => {
    delete process.env.JWT_SECRET;
    await authenticate({ headers: { authorization: 'Bearer token' } } as any, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500, message: 'JWT configuration is missing' }));
  });

  it('rejects invalid token', async () => {
    process.env.JWT_SECRET = 'secret';
    (jwt.verify as jest.Mock).mockImplementationOnce(() => { throw new Error('bad'); });
    await authenticate({ headers: { authorization: 'Bearer token' } } as any, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, message: 'Invalid or expired token' }));
  });

  it('rejects unknown users', async () => {
    process.env.JWT_SECRET = 'secret';
    (jwt.verify as jest.Mock).mockReturnValueOnce({ userId: '123' });
    (User.findById as jest.Mock).mockResolvedValueOnce(null);
    await authenticate({ headers: { authorization: 'Bearer token' } } as any, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, message: 'User not found' }));
  });

  it('attaches the user', async () => {
    process.env.JWT_SECRET = 'secret';
    const user = { _id: '123', role: 'user' };
    (jwt.verify as jest.Mock).mockReturnValueOnce({ userId: '123' });
    (User.findById as jest.Mock).mockResolvedValueOnce(user);
    const req: any = { headers: { authorization: 'Bearer token' } };
    await authenticate(req, res, next);
    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalledWith();
  });
});
