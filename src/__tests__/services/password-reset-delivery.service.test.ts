import { PasswordResetDeliveryService } from '../../services/PasswordResetDeliveryService';

describe('PasswordResetDeliveryService', () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.FRONTEND_URL;
  });

  it('throws in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => new PasswordResetDeliveryService().assertConfigured()).toThrow('Password reset delivery is not configured');
  });

  it('creates a development delivery preview', () => {
    process.env.NODE_ENV = 'test';
    process.env.FRONTEND_URL = 'http://frontend.local/';
    const delivery = new PasswordResetDeliveryService().createDevelopmentDelivery('token-123', 15);
    expect(delivery.resetUrl).toBe('http://frontend.local/reset-password?token=token-123');
    expect(delivery.expiresInMinutes).toBe(15);
  });
});
