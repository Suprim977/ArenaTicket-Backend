import { z } from 'zod';

export const updateProfileDto = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().optional(),
});

export type UpdateProfileDTO = z.infer<typeof updateProfileDto>;