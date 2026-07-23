import bcrypt from 'bcryptjs';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  countryCode: string;
  phoneNumber: string;
  gender: 'male' | 'female' | 'other';
  email: string;
  password: string;
  role: 'user' | 'admin';
  balance: number;
  ticketsCount: number;
  eventsAttended: number;
  isActive: boolean;
  profilePicture: string | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  firstName: { type: String, required: [true, 'First name is required'], trim: true, minlength: 2, maxlength: 50 },
  lastName: { type: String, required: [true, 'Last name is required'], trim: true, minlength: 2, maxlength: 50 },
  countryCode: {
    type: String,
    required: [true, 'Country code is required'],
    trim: true,
    match: [/^\+[1-9]\d{0,3}$/, 'Invalid country code'],
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\d{6,15}$/, 'Invalid phone number'],
  },
  gender: {
    type: String,
    enum: {
      values: ['male', 'female', 'other'],
      message: 'Gender must be male, female, or other',
    },
    required: [true, 'Gender is required'],
  },
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
  profilePicture: { type: String, default: null },
}, { timestamps: true, versionKey: false });

userSchema.index(
  { countryCode: 1, phoneNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      countryCode: { $type: 'string' },
      phoneNumber: { $type: 'string' },
    },
  }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser> | undefined) || mongoose.model<IUser>('User', userSchema);
