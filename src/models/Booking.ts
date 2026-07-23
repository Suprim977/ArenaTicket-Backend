import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IBooking extends Document {
  bookingRef: string;
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  tier: string;
  section: string;
  quantity: number;
  subtotal: number;
  totalAmount: number;
  paymentMethod: 'esewa' | 'khalti' | 'card';
  status: 'pending' | 'confirmed' | 'cancelled';
  qrCodeData?: string;
}

const bookingSchema = new Schema<IBooking>({
  bookingRef: { type: String, required: true, unique: true, immutable: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  tier: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['esewa', 'khalti', 'card'], required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending', index: true },
  qrCodeData: { type: String, select: true },
}, { timestamps: true, versionKey: false });

export const Booking: Model<IBooking> =
  (mongoose.models.Booking as Model<IBooking> | undefined) || mongoose.model<IBooking>('Booking', bookingSchema);
