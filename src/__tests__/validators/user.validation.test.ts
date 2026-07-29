import { changePasswordSchema, updateProfileSchema } from '../../features/user/validation/validation';

describe('user validation', () => {
  it('rejects empty profile updates', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a simple profile update', () => {
    expect(updateProfileSchema.safeParse({ firstName: 'Jane' }).success).toBe(true);
  });

  it('rejects invalid country codes', () => {
    expect(updateProfileSchema.safeParse({ countryCode: '977' }).success).toBe(false);
  });

  it('rejects invalid gender values', () => {
    expect(updateProfileSchema.safeParse({ gender: 'unknown' }).success).toBe(false);
  });

  it('rejects invalid Nepal phone lengths', () => {
    expect(updateProfileSchema.safeParse({ countryCode: '+977', phoneNumber: '123456789' }).success).toBe(false);
  });

  it('accepts valid password change payload', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'Password1!', newPassword: 'Password1!' }).success).toBe(true);
  });

  it('rejects missing current password', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'Password1!' }).success).toBe(false);
  });
});
