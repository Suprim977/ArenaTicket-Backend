import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { PAYMENT_METHODS, PaymentMethod } from '../constants/payment';

export interface IPayment extends Document {
  bookingId: Types.ObjectId;
  userId: Types.ObjectId;
  method: PaymentMethod;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  transactionRef: string;
  ticketId?: Types.ObjectId;
  fulfilledAt?: Date;
  mockToken: string;
}

const paymentSchema = new Schema<IPayment>({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  method: { type: String, enum: PAYMENT_METHODS, required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending', index: true },
  transactionRef: { type: String, required: true, unique: true, index: true },
  ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', unique: true, sparse: true },
  fulfilledAt: { type: Date },
  mockToken: { type: String, required: true, unique: true, immutable: true, select: false },
}, { timestamps: true, versionKey: false });

paymentSchema.index({ bookingId: 1, status: 1 });

export const Payment: Model<IPayment> =
  (mongoose.models.Payment as Model<IPayment> | undefined) || mongoose.model<IPayment>('Payment', paymentSchema);
