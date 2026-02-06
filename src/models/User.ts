import mongoose, { Schema, Document } from 'mongoose';
import type { UserProfile } from '@/types';

export interface IUser extends Document {
  email: string;
  name: string;
  passwordHash: string;
  profile: UserProfile;
  role: 'user' | 'premium' | 'coach' | 'admin';
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PowerZoneSchema = new Schema({
  name: { type: String, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  color: { type: String },
}, { _id: false });

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  profile: {
    ftp: { type: Number, default: 200, min: 100, max: 500 },
    weight: { type: Number, default: 70, min: 40, max: 120 },
    powerZones: [PowerZoneSchema],
    heartRateZones: [{ name: String, min: Number, max: Number }],
  },
  role: { type: String, enum: ['user', 'premium', 'coach', 'admin'], default: 'user' },
  emailVerified: { type: Boolean, default: false },
}, { timestamps: true });

UserSchema.index({ email: 1 }, { unique: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
