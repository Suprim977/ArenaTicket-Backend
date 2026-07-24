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
  venue?: string;
  stadium?: string;
  time?: string;
  description: string;
  imageUrl: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  availability: boolean;
  ticketPrices: {
    normal: number;
    vip: number;
  };
  prizePool: number;
  format: string;
  tiers: IEventTier[];
  relatedEvents: Types.ObjectId[];
}

const tierSchema = new Schema<IEventTier>({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0.01 },
  capacity: { type: Number, required: true, min: 1 },
  available: { type: Number, required: true, min: 0 },
}, { _id: false });

const eventSchema = new Schema<IEvent>({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  category: { type: String, trim: true, lowercase: true, index: true },
  date: { type: Date, required: true, index: true },
  location: { type: String, required: true, trim: true },
  venue: { type: String, trim: true },
  stadium: { type: String, trim: true },
  time: { type: String, trim: true },
  description: { type: String, required: true, trim: true },
  imageUrl: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'published',
    index: true,
  },
  availability: { type: Boolean, default: true },
  ticketPrices: {
    normal: { type: Number, required: true, min: 0.01, default: 600 },
    vip: { type: Number, required: true, min: 0.01, default: 1500 },
  },
  prizePool: { type: Number, required: true, min: 0 },
  format: { type: String, required: true, trim: true },
  tiers: { type: [tierSchema], required: true, validate: [(value: IEventTier[]) => value.length > 0, 'At least one tier is required'] },
  relatedEvents: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
}, { timestamps: true, versionKey: false });

eventSchema.index({ title: 'text', description: 'text', location: 'text' });

export const Event: Model<IEvent> =
  (mongoose.models.Event as Model<IEvent> | undefined) || mongoose.model<IEvent>('Event', eventSchema);
