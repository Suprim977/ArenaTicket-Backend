import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface ITicket extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  bookingId: Types.ObjectId;
  eventId: Types.ObjectId;
  ticketNumber: string;
  ticketTier: 'normal' | 'vip';
  section: string;
  quantity: number;
  qrToken: string;
  qrCodeData: string;
  status: 'valid' | 'used' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true, index: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  ticketNumber: { type: String, required: true, unique: true, immutable: true, index: true },
  ticketTier: { type: String, enum: ['normal', 'vip'], required: true },
  section: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  qrToken: { type: String, required: true, unique: true, immutable: true, index: true },
  qrCodeData: { type: String, required: true, immutable: true },
  status: { type: String, enum: ['valid', 'used', 'cancelled'], default: 'valid', index: true },
}, { timestamps: true, versionKey: false });

export const Ticket: Model<ITicket> =
  (mongoose.models.Ticket as Model<ITicket> | undefined)
  || mongoose.model<ITicket>('Ticket', ticketSchema);
