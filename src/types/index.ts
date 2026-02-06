import { z } from 'zod';

// ============ User & Auth Types ============

export const registerSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Password minimo 8 caratteri'),
  name: z.string().min(2, 'Nome minimo 2 caratteri'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const profileSchema = z.object({
  ftp: z.number().min(100).max(500).default(200),
  weight: z.number().min(40).max(120),
  powerZones: z.array(z.object({
    name: z.string(),
    min: z.number(),
    max: z.number(),
  })).optional(),
  heartRateZones: z.array(z.object({
    name: z.string(),
    min: z.number(),
    max: z.number(),
  })).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

// ============ Power Zones (Coggan) ============

export interface PowerZone {
  name: string;
  min: number;
  max: number;
  color: string;
}

export function calculateCogganZones(ftp: number): PowerZone[] {
  return [
    { name: 'Z1 - Active Recovery', min: 0, max: Math.round(ftp * 0.55), color: '#94A3B8' },
    { name: 'Z2 - Endurance', min: Math.round(ftp * 0.56), max: Math.round(ftp * 0.75), color: '#3B82F6' },
    { name: 'Z3 - Tempo', min: Math.round(ftp * 0.76), max: Math.round(ftp * 0.90), color: '#10B981' },
    { name: 'Z4 - Threshold', min: Math.round(ftp * 0.91), max: Math.round(ftp * 1.05), color: '#F59E0B' },
    { name: 'Z5 - VO2max', min: Math.round(ftp * 1.06), max: Math.round(ftp * 1.20), color: '#EF4444' },
    { name: 'Z6 - Anaerobic', min: Math.round(ftp * 1.21), max: Math.round(ftp * 1.50), color: '#8B5CF6' },
    { name: 'Z7 - Neuromuscular', min: Math.round(ftp * 1.51), max: 2500, color: '#EC4899' },
  ];
}

// ============ Activity Types ============

export interface ActivitySummary {
  _id?: string;
  userId: string;
  name: string;
  activityDate: Date;
  duration: number; // seconds
  distance: number; // km
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
  powerCurve: Record<string, number>; // { "5s": 850, "1min": 420, ... }
  zoneDistribution: number[]; // % per zone
  fileUrl: string;
  hasGps: boolean;
  createdAt: Date;
}

export interface ActivityStream {
  _id?: string;
  activityId: string;
  timestamps: number[];
  power: number[];
  heartRate: number[];
  speed: number[];
  cadence: number[];
  altitude: number[];
  latitude: number[];
  longitude: number[];
}

// ============ Fitness Tracking Types ============

export interface FitnessData {
  _id?: string;
  userId: string;
  date: Date;
  tss: number;
  ctl: number; // Chronic Training Load (fitness)
  atl: number; // Acute Training Load (fatigue)
  tsb: number; // Training Stress Balance (form)
}

// ============ API Response ============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta: {
    timestamp: string;
    version: string;
  };
}

export function apiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: { timestamp: new Date().toISOString(), version: '1.0' },
  };
}

export function apiError(error: string, status = 400): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error,
    meta: { timestamp: new Date().toISOString(), version: '1.0' },
  };
}

// ============ User Types ============

export interface UserProfile {
  ftp: number;
  weight: number;
  powerZones: PowerZone[];
  heartRateZones: { name: string; min: number; max: number }[];
}

export interface User {
  _id?: string;
  email: string;
  name: string;
  passwordHash: string;
  profile: UserProfile;
  role: 'user' | 'premium' | 'coach' | 'admin';
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
