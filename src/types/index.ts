export interface User {
  _id?: string;
  email: string;
  name: string;
  password?: string;
  ftp: number;
  weight: number;
  powerZones: PowerZones;
  hrZones: HRZones;
  createdAt: Date;
  updatedAt: Date;
}

export interface PowerZones {
  z1: { min: number; max: number }; // Active Recovery
  z2: { min: number; max: number }; // Endurance
  z3: { min: number; max: number }; // Tempo
  z4: { min: number; max: number }; // Threshold
  z5: { min: number; max: number }; // VO2max
}

export interface HRZones {
  z1: { min: number; max: number };
  z2: { min: number; max: number };
  z3: { min: number; max: number };
  z4: { min: number; max: number };
  z5: { min: number; max: number };
}

export interface Activity {
  _id?: string;
  userId: string;
  name: string;
  activityDate: Date;
  sport: string;
  duration: number; // seconds
  distance: number; // meters
  elevationGain: number; // meters
  avgPower: number;
  maxPower: number;
  normalizedPower: number;
  intensityFactor: number;
  tss: number;
  avgHR: number;
  maxHR: number;
  avgCadence: number;
  avgSpeed: number; // m/s
  maxSpeed: number;
  calories: number;
  powerCurve: PowerCurvePoint[];
  startLocation?: { lat: number; lng: number };
  fileUrl?: string;
  createdAt: Date;
}

export interface PowerCurvePoint {
  duration: number; // seconds
  power: number; // watts
}

export interface ActivityStream {
  _id?: string;
  activityId: string;
  timestamp: number[];
  power: number[];
  heartRate: number[];
  cadence: number[];
  speed: number[];
  altitude: number[];
  distance: number[];
  lat: number[];
  lng: number[];
}

export interface FitnessTracking {
  _id?: string;
  userId: string;
  date: Date;
  ctl: number; // Chronic Training Load (fitness)
  atl: number; // Acute Training Load (fatigue)
  tsb: number; // Training Stress Balance (form)
  tss: number; // Daily TSS
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    version: string;
  };
}
