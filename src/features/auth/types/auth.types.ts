import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'USER' | 'ADMIN';
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface IAuthResponse {
  user: IUser;
  tokens: IAuthTokens;
}