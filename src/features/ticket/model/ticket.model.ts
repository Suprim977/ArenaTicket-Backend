import mongoose, { Document, Schema } from 'mongoose';

export interface ITicket extends Document {
	tournament: mongoose.Types.ObjectId;
	user: mongoose.Types.ObjectId;
	price: number;
	status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

const ticketSchema = new Schema<ITicket>(
	{
		tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		price: { type: Number, required: true, min: 0 },
		status: {
			type: String,
			enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
			default: 'CONFIRMED',
		},
	},
	{ timestamps: true }
);

export const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);
