export type WorkoutStepType =
  | "warmup"
  | "steady"
  | "interval"
  | "recovery"
  | "cooldown"
  | "ramp"
  | "free";

export interface WorkoutStep {
  id: string;
  type: WorkoutStepType;
  durationSeconds: number;
  powerPercent: number;       // % FTP as decimal, e.g. 1.05 = 105%
  powerPercentEnd?: number;   // for ramps/warmup/cooldown
  repeat?: number;            // for intervals
  offDurationSeconds?: number;
  offPowerPercent?: number;
  label?: string;
}

export interface Workout {
  _id?: string;
  userId: string;
  name: string;
  description?: string;
  sport: "cycling";
  steps: WorkoutStep[];
  totalDurationSeconds: number;
  estimatedTSS: number;
  source: "builder" | "zwo" | "mrc";
  createdAt?: string;
  updatedAt?: string;
}

export interface BikeData {
  instantPower: number;
  cadence: number;
  speed: number;
}
