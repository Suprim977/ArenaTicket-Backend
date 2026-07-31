jest.mock('../../features/auth/repository/auth.repository', () => {
  const createUser = jest.fn();
  const findByEmail = jest.fn();
  return {
    AuthRepository: jest.fn().mockImplementation(() => ({
      createUser,
      findByEmail,
      findByPhone: jest.fn(),
      setPasswordResetToken: jest.fn(),
      consumePasswordResetToken: jest.fn(),
    })),
  };
});

import jwt from 'jsonwebtoken';
import { AuthService } from '../../features/auth/services/auth.service';

describe('admin auth token contract', () => {
  const service = new AuthService();

  beforeEach(() => {
    process.env.JWT_SECRET = 'unit-test-secret';
    process.env.ADMIN_REGISTRATION_SECRET = 'unit-admin-secret';
    jest.restoreAllMocks();
  });

  it('returns a usable admin access token on admin login', async () => {
    const user = {
      _id: { toString: () => 'admin-1' },
      comparePassword: jest.fn().mockResolvedValue(true),
      isActive: true,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      countryCode: '+1',
      phoneNumber: '9000000000',
      gender: 'other',
      email: 'admin@example.com',
      profilePicture: null,
      balance: 0,
      ticketsCount: 0,
      eventsAttended: 0,
    };

    (service as any).authRepository.findByEmail.mockResolvedValueOnce(user);

    const result = await service.loginAdmin('admin@example.com', 'Password1!');

    expect(result.user.role).toBe('admin');
    expect(result.token).toBe(result.tokens.accessToken);
    expect(jwt.verify(result.token, 'unit-test-secret')).toEqual(
      expect.objectContaining({ userId: 'admin-1' }),
    );
  });
});
