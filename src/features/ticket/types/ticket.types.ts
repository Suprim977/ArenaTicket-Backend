import { Document, Types } from 'mongoose';

export interface ITicket extends Document {
  _id: Types.ObjectId;
  tournament: Types.ObjectId;
  user: Types.ObjectId;
  quantity: number;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';
  paymentId?: string;
  bookedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}