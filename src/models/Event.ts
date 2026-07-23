import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IEventTier {
  name: string;
  price: number;
  capacity: number;
  available: number;
}

export interface IEvent extends Document {
  title: string;
  slug: string;
  category?: string;
  date: Date;
  location: string;
  description: string;
  imageUrl: string;
  prizePool: number;
  format: string;
  tiers: IEventTier[];
  relatedEvents: Types.ObjectId[];
}

const tierSchema = new Schema<IEventTier>({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  capacity: { type: Number, required: true, min: 1 },
  available: { type: Number, required: true, min: 0 },
}, { _id: false });

const eventSchema = new Schema<IEvent>({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  category: { type: String, trim: true, lowercase: true, index: true },
  date: { type: Date, required: true, index: true },
  location: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  imageUrl: { type: String, required: true, trim: true },
  prizePool: { type: Number, required: true, min: 0 },
  format: { type: String, required: true, trim: true },
  tiers: { type: [tierSchema], required: true, validate: [(value: IEventTier[]) => value.length > 0, 'At least one tier is required'] },
  relatedEvents: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
}, { timestamps: true, versionKey: false });

eventSchema.index({ title: 'text', description: 'text', location: 'text' });

export const Event: Model<IEvent> =
  (mongoose.models.Event as Model<IEvent> | undefined) || mongoose.model<IEvent>('Event', eventSchema);
