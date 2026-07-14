import { z } from 'zod';

export const bookTicketDto = z.object({
  tournamentId: z.string().min(1, 'Tournament ID is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
});

export type BookTicketDTO = z.infer<typeof bookTicketDto>;