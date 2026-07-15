import { z } from 'zod';

export const createTournamentSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  date: z.string().or(z.date()),
  location: z.string().min(3),
  prizePool: z.number().min(0),
  maxTeams: z.number().min(1),
});

const optionalPositiveNumber = () =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

      const parsedValue = typeof value === 'string' ? Number(value) : value;
      return parsedValue;
    },
    z.number().int().positive().optional()
  );

const optionalNonNegativeNumber = () =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

      const parsedValue = typeof value === 'string' ? Number(value) : value;
      return parsedValue;
    },
    z.number().nonnegative().optional()
  );

export const tournamentQuerySchema = z.object({
  search: z.string().trim().optional(),
  date: z.string().trim().optional(),
  location: z.string().trim().optional(),
  minPrize: optionalNonNegativeNumber(),
  maxPrize: optionalNonNegativeNumber(),
  page: optionalPositiveNumber(),
  limit: optionalPositiveNumber(),
  sortBy: z.enum(['date', 'createdAt', 'prizePool', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});