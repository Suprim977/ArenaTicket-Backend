import { z } from 'zod';

export const createTournamentDto = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  date: z.string().min(1, 'Date is required'),
  prizePool: z.number().min(0, 'Prize pool must be a positive number'),
  maxTeams: z.number().min(1, 'Max teams must be at least 1'),
});

export type CreateTournamentDTO = z.infer<typeof createTournamentDto>;