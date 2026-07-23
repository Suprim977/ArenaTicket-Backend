import { randomBytes, randomInt } from 'crypto';

export const generateBookingRef = (): string => {
  const digits = randomInt(100000, 1000000);
  const suffix = randomBytes(2).toString('hex').slice(0, 2).toUpperCase();
  return `AT-${digits}-${suffix}`;
};
