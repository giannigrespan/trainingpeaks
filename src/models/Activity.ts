import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  activityDate: Date;
  duration: number;
  distance: number;
  avgPower: number;
  maxPower: number;
  normalizedPower: number;
  intensityFactor: number;
  tss: number;
  variabilityIndex: number;
  avgHeartRate: number;
  maxHeartRate: number;
  avgCadence: number;
  avgSpeed: number;
  elevationGain: number;
  powerCurve: Map<string, number>;
  zoneDistribution: number[];
  fileUrl: string;
  hasGps: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  activityDate: { type: Date, required: true },
  duration: { type: Number, required: true }, // seconds
  distance: { type: Number, default: 0 }, // km
  avgPower: { type: Number, default: 0 },
  maxPower: { type: Number, default: 0 },
  normalizedPower: { type: Number, default: 0 },
  intensityFactor: { type: Number, default: 0 },
  tss: { type: Number, default: 0 },
  variabilityIndex: { type: Number, default: 0 },
  avgHeartRate: { type: Number, default: 0 },
  maxHeartRate: { type: Number, default: 0 },
  avgCadence: { type: Number, default: 0 },
  avgSpeed: { type: Number, default: 0 },
  elevationGain: { type: Number, default: 0 },
  powerCurve: { type: Map, of: Number, default: {} },
  zoneDistribution: [{ type: Number }],
  fileUrl: { type: String, default: '' },
  hasGps: { type: Boolean, default: false },
}, { timestamps: true });

ActivitySchema.index({ userId: 1, activityDate: -1 });

export default mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);
