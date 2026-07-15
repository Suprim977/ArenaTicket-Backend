import mongoose, { Document, Schema } from 'mongoose';

export interface ITicket extends Document {
	tournament: mongoose.Types.ObjectId;
	user: mongoose.Types.ObjectId;
	quantity: number;
	totalPrice: number;
	status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';
	bookedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
	{
		tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		quantity: { type: Number, required: true, min: 1 },
		totalPrice: { type: Number, required: true, min: 0 },
		status: {
			type: String,
			enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED'],
			default: 'CONFIRMED',
		},
		bookedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true }
);

export const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);
