import { z } from 'zod';

export const loginDto = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginDTO = z.infer<typeof loginDto>;