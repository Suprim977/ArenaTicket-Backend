import { Document, Types } from 'mongoose';

export interface ITournament extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  date: Date;
  location: string;
  prizePool: number;
  maxTeams: number;
  currentTeams: number;
  image?: string;
  createdBy: Types.ObjectId;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}