import mongoose, { Schema, Document } from 'mongoose';

export interface IFitnessTracking extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

const FitnessTrackingSchema = new Schema<IFitnessTracking>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  tss: { type: Number, default: 0 },
  ctl: { type: Number, default: 0 },
  atl: { type: Number, default: 0 },
  tsb: { type: Number, default: 0 },
});

FitnessTrackingSchema.index({ userId: 1, date: -1 }, { unique: true });

export default mongoose.models.FitnessTracking || mongoose.model<IFitnessTracking>('FitnessTracking', FitnessTrackingSchema);
