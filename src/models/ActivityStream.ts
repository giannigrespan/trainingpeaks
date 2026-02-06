import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityStream extends Document {
  activityId: mongoose.Types.ObjectId;
  timestamps: number[];
  power: number[];
  heartRate: number[];
  speed: number[];
  cadence: number[];
  altitude: number[];
  latitude: number[];
  longitude: number[];
}

const ActivityStreamSchema = new Schema<IActivityStream>({
  activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true, unique: true },
  timestamps: [{ type: Number }],
  power: [{ type: Number }],
  heartRate: [{ type: Number }],
  speed: [{ type: Number }],
  cadence: [{ type: Number }],
  altitude: [{ type: Number }],
  latitude: [{ type: Number }],
  longitude: [{ type: Number }],
});

ActivityStreamSchema.index({ activityId: 1 });

export default mongoose.models.ActivityStream || mongoose.model<IActivityStream>('ActivityStream', ActivityStreamSchema);
