import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string({ message: 'First name is required' }).trim().min(1, 'First name is required').max(50),
  lastName: z.string({ message: 'Last name is required' }).trim().min(1, 'Last name is required').max(50),
  countryCode: z.string({ message: 'Country code is required' }).trim()
    .regex(/^\+[1-9]\d{0,3}$/, 'Invalid country code'),
  phoneNumber: z.string({ message: 'Phone number is required' }).trim()
    .regex(/^\d{6,15}$/, 'Phone number must contain 6 to 15 digits'),
  gender: z.string({ message: 'Gender is required' }).trim().toLowerCase()
    .pipe(z.enum(['male', 'female', 'other'], { message: 'Gender must be male, female, or other' })),
  email: z.string({ message: 'Email is required' }).trim().toLowerCase().email('Invalid email address'),
  password: z.string({ message: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/\d/, 'Password must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
  confirmPassword: z.string({ message: 'Confirm password is required' }).min(1, 'Confirm password is required'),
}).strict().superRefine((data, context) => {
  if (data.countryCode === '+977' && !/^\d{10}$/.test(data.phoneNumber)) {
    context.addIssue({
      code: 'custom',
      path: ['phoneNumber'],
      message: 'Nepal phone number must be exactly 10 digits',
    });
  }
  if (data.password !== data.confirmPassword) {
    context.addIssue({
      code: 'custom',
      path: ['confirmPassword'],
      message: 'Confirm password must match password',
    });
  }
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50).optional(),
    email: z.string().email('Invalid email address').optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  }),
});
