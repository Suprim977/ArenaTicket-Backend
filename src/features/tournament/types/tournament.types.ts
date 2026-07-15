import { Document, Types } from 'mongoose';
import { ITournament as TournamentDocument } from '../model/tournament.model';

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
  bannerUrl?: string;
  createdBy: Types.ObjectId;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

export interface ITournamentQueryParams {
  search?: string;
  date?: string;
  location?: string;
  minPrize?: number;
  maxPrize?: number;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'createdAt' | 'prizePool' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ITournamentListResponse {
  data: TournamentDocument[];
  pagination: IPaginationMeta;
}