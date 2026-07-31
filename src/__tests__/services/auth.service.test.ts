jest.mock('../../config/index', () => ({
  ADMIN_REGISTRATION_SECRET: 'test-admin-secret',
}));

import { AuthService } from '../../features/auth/services/auth.service';

describe('AuthService role separation', () => {
  const makeService = () => {
    const service = new AuthService();
    const repoMock = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      createUser: jest.fn(),
      setPasswordResetToken: jest.fn(),
      consumePasswordResetToken: jest.fn(),
    };
    (service as any).authRepository = repoMock;
    return { service, repoMock };
  };

  it('stores role user for normal registration', async () => {
    const { service, repoMock } = makeService();
    repoMock.findByEmail.mockResolvedValueOnce(null);
    repoMock.findByPhone.mockResolvedValueOnce(null);
    repoMock.createUser.mockResolvedValueOnce({
      _id: 'user-id',
      firstName: 'John',
      lastName: 'Doe',
      countryCode: '+977',
      phoneNumber: '9841234567',
      gender: 'male',
      email: 'john@example.com',
      role: 'user',
      isActive: true,
      balance: 0,
      ticketsCount: 0,
      eventsAttended: 0,
      profilePicture: null,
    });

    await expect(service.register({
      firstName: 'John',
      lastName: 'Doe',
      countryCode: '+977',
      phoneNumber: '9841234567',
      gender: 'male',
      email: 'john@example.com',
      password: 'Password1!',
    })).resolves.toMatchObject({ user: expect.objectContaining({ role: 'user' }) });
    expect(repoMock.createUser).toHaveBeenCalledWith(expect.objectContaining({ role: 'user' }));
  });

  it('stores role admin for admin registration', async () => {
    const { service, repoMock } = makeService();
    repoMock.findByEmail.mockResolvedValueOnce(null);
    repoMock.createUser.mockResolvedValueOnce({
      _id: 'admin-id',
      firstName: 'Admin',
      lastName: 'Test',
      countryCode: '+1',
      phoneNumber: '9000000000',
      gender: 'other',
      email: 'admin@example.com',
      role: 'admin',
      isActive: true,
      balance: 0,
      ticketsCount: 0,
      eventsAttended: 0,
      profilePicture: null,
    });

    await expect(service.registerAdmin({
      fullName: 'Admin Test',
      email: 'admin@example.com',
      password: 'Password1!',
      adminRegistrationCode: 'test-admin-secret',
    })).resolves.toMatchObject({ user: expect.objectContaining({ role: 'admin' }) });
    expect(repoMock.createUser).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }));
  });

  it('rejects admin accounts from normal login', async () => {
    const { service, repoMock } = makeService();
    repoMock.findByEmail.mockResolvedValueOnce({
      comparePassword: jest.fn().mockResolvedValue(true),
      isActive: true,
      role: 'admin',
      _id: { toString: () => 'admin-id' },
    });

    await expect(service.login('admin@example.com', 'Password1!')).rejects.toMatchObject({
      message: 'Admin accounts must use the admin login portal.',
      statusCode: 403,
    });
  });

  it('rejects user accounts from admin login', async () => {
    const { service, repoMock } = makeService();
    repoMock.findByEmail.mockResolvedValueOnce({
      comparePassword: jest.fn().mockResolvedValue(true),
      isActive: true,
      role: 'user',
      _id: { toString: () => 'user-id' },
    });

    await expect(service.loginAdmin('user@example.com', 'Password1!')).rejects.toMatchObject({
      message: 'User accounts must use the normal login portal.',
      statusCode: 403,
    });
  });
});
