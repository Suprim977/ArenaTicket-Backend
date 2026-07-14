import { z } from 'zod';

export const createPaymentDto = z.object({
  ticketId: z.string().min(1, 'Ticket ID is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  gateway: z.enum(['ESEWA', 'KHALTI', 'CONNECTIPS']),
});

export const verifyPaymentDto = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
  gateway: z.enum(['ESEWA', 'KHALTI']),
});

export type CreatePaymentDTO = z.infer<typeof createPaymentDto>;
export type VerifyPaymentDTO = z.infer<typeof verifyPaymentDto>;