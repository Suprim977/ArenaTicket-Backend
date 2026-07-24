export const PAYMENT_METHODS = ['esewa', 'khalti', 'card'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];
