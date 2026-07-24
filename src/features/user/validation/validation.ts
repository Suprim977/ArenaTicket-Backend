import { z } from 'zod';
import { passwordSchema } from '../../auth/validation/validation';

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional(),
  countryCode: z.string().trim().regex(/^\+[1-9]\d{0,3}$/, 'Invalid country code').optional(),
  phoneNumber: z.string().trim().regex(/^\d{6,15}$/, 'Phone number must contain 6 to 15 digits').optional(),
  gender: z.string().trim().toLowerCase()
    .pipe(z.enum(['male', 'female', 'other'], { message: 'Gender must be male, female, or other' })).optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one profile field is required' }
).superRefine((data, context) => {
  if (data.countryCode === '+977' && data.phoneNumber && !/^\d{10}$/.test(data.phoneNumber)) {
    context.addIssue({ code: 'custom', path: ['phoneNumber'], message: 'Nepal phone number must be exactly 10 digits' });
  }
});

export const changePasswordSchema = z.object({
  currentPassword: z.string({ message: 'Current password is required' })
    .min(1, 'Current password is required'),
  newPassword: passwordSchema,
}).strict();
