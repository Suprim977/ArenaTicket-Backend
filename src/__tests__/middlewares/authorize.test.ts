import { authorize } from '../../middlewares/authorize';

describe('authorize middleware', () => {
  const res: any = {};

  it('rejects unauthenticated requests', () => {
    const next = jest.fn();
    authorize('admin')({} as any, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, message: 'Authentication required' }));
  });

  it('rejects non-admins when admin is required', () => {
    const next = jest.fn();
    authorize('admin')({ user: { role: 'user' } } as any, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, message: 'Administrator access required.' }));
  });

  it('rejects unknown roles', () => {
    const next = jest.fn();
    authorize('admin', 'manager')({ user: { role: 'guest' } } as any, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('allows matching roles', () => {
    const next = jest.fn();
    authorize('user')({ user: { role: 'USER' } } as any, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
