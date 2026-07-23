import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IPayment extends Document {
  bookingId: Types.ObjectId;
  userId: Types.ObjectId;
  method: 'esewa' | 'khalti' | 'card';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  transactionRef: string;
}

const paymentSchema = new Schema<IPayment>({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  method: { type: String, enum: ['esewa', 'khalti', 'card'], required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending', index: true },
  transactionRef: { type: String, required: true, unique: true, index: true },
}, { timestamps: true, versionKey: false });

paymentSchema.index({ bookingId: 1, status: 1 });

export const Payment: Model<IPayment> =
  (mongoose.models.Payment as Model<IPayment> | undefined) || mongoose.model<IPayment>('Payment', paymentSchema);
