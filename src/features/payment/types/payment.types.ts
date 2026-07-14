export interface ICreatePayment {
  userId: string;
  ticketId?: string;
  tournamentId?: string;
  amount: number;
  gateway: 'ESEWA' | 'KHALTI' | 'CONNECTIPS';
}

export interface IVerifyPayment {
  transactionId: string;
  gateway: 'ESEWA' | 'KHALTI';
}

export interface eSewaResponse {
  status: string;
  transaction_code: string;
  message: string;
}

export interface KhaltiResponse {
  idx: string;
  mobile: string;
  transaction_code: string;
  message: string;
}