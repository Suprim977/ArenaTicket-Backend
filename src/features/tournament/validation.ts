import { z } from 'zod';

export const createTournamentSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  date: z.string().or(z.date()),
  location: z.string().min(3),
  prizePool: z.number().min(0),
  maxTeams: z.number().min(1),
});