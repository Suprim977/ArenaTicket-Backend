import { forgotPasswordSchema, loginSchema, passwordSchema, registerSchema, resetPasswordSchema } from '../../features/auth/validation/validation';

describe('auth validation', () => {
  it.each([
    ['Password1!', true],
    ['password1!', false],
    ['PASSWORD1!', false],
    ['Password!', false],
    ['Password1', false],
  ])('password schema validates %s', (value, expected) => {
    expect(passwordSchema.safeParse(value).success).toBe(expected);
  });

  it('accepts valid registration payload', () => {
    expect(registerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      countryCode: '+977',
      phoneNumber: '9841234567',
      gender: 'male',
      email: 'john@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    }).success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    expect(registerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      countryCode: '+977',
      phoneNumber: '9841234567',
      gender: 'male',
      email: 'john@example.com',
      password: 'Password1!',
      confirmPassword: 'Password2!',
    }).success).toBe(false);
  });

  it('rejects invalid Nepal phone numbers', () => {
    expect(registerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      countryCode: '+977',
      phoneNumber: '123456789',
      gender: 'male',
      email: 'john@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    }).success).toBe(false);
  });

  it('accepts forgot password payload', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'john@example.com' }).success).toBe(true);
  });

  it('rejects invalid forgot password payload', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'bad' }).success).toBe(false);
  });

  it('accepts reset password payload', () => {
    expect(resetPasswordSchema.safeParse({
      token: 'a'.repeat(64),
      newPassword: 'Password1!',
      confirmPassword: 'Password1!',
    }).success).toBe(true);
  });

  it('rejects reset password mismatch', () => {
    expect(resetPasswordSchema.safeParse({
      token: 'a'.repeat(64),
      newPassword: 'Password1!',
      confirmPassword: 'Password2!',
    }).success).toBe(false);
  });

  it('accepts login payload', () => {
    expect(loginSchema.safeParse({ body: { email: 'john@example.com', password: 'secret' } }).success).toBe(true);
  });
});
