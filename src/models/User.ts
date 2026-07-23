import bcrypt from 'bcryptjs';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  balance: number;
  ticketsCount: number;
  eventsAttended: number;
  isActive: boolean;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  firstName: { type: String, required: [true, 'First name is required'], trim: true, minlength: 2, maxlength: 50 },
  lastName: { type: String, required: [true, 'Last name is required'], trim: true, minlength: 2, maxlength: 50 },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
  },
  password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user', required: true },
  balance: { type: Number, default: 0, min: 0 },
  ticketsCount: { type: Number, default: 0, min: 0 },
  eventsAttended: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser> | undefined) || mongoose.model<IUser>('User', userSchema);
