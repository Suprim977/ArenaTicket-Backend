import { z } from 'zod';

export const createTicketSchema = z.object({
  tournamentId: z.string().min(1),
  quantity: z.number().min(1),
});