import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  ticketId?: mongoose.Types.ObjectId;
  tournamentId?: mongoose.Types.ObjectId;
  amount: number;
  gateway: 'ESEWA' | 'KHALTI' | 'CONNECTIPS';
  transactionId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket' },
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament' },
    amount: { type: Number, required: true },
    gateway: {
      type: String,
      enum: ['ESEWA', 'KHALTI', 'CONNECTIPS'],
      required: true,
    },
    transactionId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);