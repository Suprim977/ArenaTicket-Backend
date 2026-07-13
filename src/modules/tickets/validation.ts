import { z } from 'zod';

export const createTicketSchema = z.object({
  tournamentId: z.string().min(1),
  price: z.number().min(0),
});