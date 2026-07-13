import mongoose, { Document, Schema } from 'mongoose';

export interface ITournament extends Document {
  title: string;
  description: string;
  date: Date;
  location: string;
  prizePool: number;
  maxTeams: number;
  createdBy: mongoose.Types.ObjectId;
}

const tournamentSchema = new Schema<ITournament>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    prizePool: { type: Number, required: true, min: 0 },
    maxTeams: { type: Number, required: true, min: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Tournament = mongoose.model<ITournament>('Tournament', tournamentSchema);