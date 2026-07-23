import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional(),
}).strict().refine(
  (data) => data.firstName !== undefined || data.lastName !== undefined,
  { message: 'At least one of firstName or lastName is required' }
);

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});
