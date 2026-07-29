process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.EMAIL_USER = process.env.EMAIL_USER || 'test@example.com';
process.env.EMAIL_PASS = process.env.EMAIL_PASS || 'test-password';
process.env.EMAIL_FROM = process.env.EMAIL_FROM || 'ArenaTicket <test@example.com>';
process.env.ADMIN_REGISTRATION_SECRET = process.env.ADMIN_REGISTRATION_SECRET || 'test-admin-secret';

jest.mock('../config/email', () => ({
  __esModule: true,
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});
