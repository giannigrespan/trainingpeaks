import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  calculateNormalizedPower,
  calculateIntensityFactor,
  calculateTSS,
  calculatePowerCurve,
} from "@/lib/cycling-metrics";
import { parseFitFile } from "@/lib/fit-parser";

export interface ImportOptions {
  userId: string;
  name?: string;
  wahooWorkoutId?: string;
}

/** Keep 1 sample every STREAM_STEP seconds to reduce storage ~80% */
const STREAM_STEP = 5;

function downsample<T>(arr: T[]): T[] {
  return arr.filter((_, i) => i % STREAM_STEP === 0);
}

export async function importFitBuffer(buffer: Buffer, options: ImportOptions) {
  const parsedData = parseFitFile(buffer);

  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(options.userId) });
  const ftp = user?.ftp || 200;

  const powerData = parsedData.power.filter((p: number) => p > 0);
  const np = calculateNormalizedPower(powerData);
  const intensityFactor = calculateIntensityFactor(np, ftp);
  const rawTss = calculateTSS(parsedData.duration, np, intensityFactor, ftp);
  // Cap at 500 TSS (a 10h ultra-endurance event is ~400-450) to guard against
  // corrupt FIT duration values (e.g. 0xFFFFFFFF sentinel in session message)
  const tss = Math.min(rawTss, 500);
  const powerCurve = calculatePowerCurve(powerData);

  const activityName =
    options.name ||
    `Allenamento ${new Date(parsedData.startTime || new Date()).toLocaleDateString("it-IT")}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activity: Record<string, any> = {
    userId: options.userId,
    name: activityName,
    activityDate: parsedData.startTime || new Date(),
    sport: "cycling",
    duration: parsedData.duration,
    distance: parsedData.totalDistance,
    elevationGain: parsedData.elevationGain,
    avgPower: Math.round(
      powerData.reduce((s: number, v: number) => s + v, 0) / (powerData.length || 1)
    ),
    maxPower: powerData.reduce((max: number, v: number) => (v > max ? v : max), 0),
    normalizedPower: np,
    intensityFactor,
    tss,
    avgHR: Math.round(
      parsedData.heartRate.reduce((s: number, v: number) => s + v, 0) /
        (parsedData.heartRate.length || 1)
    ),
    maxHR: parsedData.heartRate.reduce((max: number, v: number) => (v > max ? v : max), 0),
    avgCadence: Math.round(
      parsedData.cadence.reduce((s: number, v: number) => s + v, 0) /
        (parsedData.cadence.length || 1)
    ),
    avgSpeed:
      parsedData.totalDistance > 0 && parsedData.duration > 0
        ? parsedData.totalDistance / parsedData.duration
        : 0,
    maxSpeed: parsedData.speed.reduce((max: number, v: number) => (v > max ? v : max), 0),
    calories: parsedData.calories || 0,
    powerCurve,
    createdAt: new Date(),
  };

  if (options.wahooWorkoutId) {
    activity.wahooWorkoutId = options.wahooWorkoutId;
  }

  const activityResult = await db.collection("activities").insertOne(activity);

  const activityStartUnix = parsedData.startTime
    ? parsedData.startTime.getTime() / 1000
    : 0;
  const lapElapsed = parsedData.laps
    .map((ts: number) => Math.round(ts - activityStartUnix))
    .filter((s: number) => s > 0);

  await db.collection("activity_streams").insertOne({
    activityId: activityResult.insertedId.toString(),
    // activityDate drives the TTL index (auto-delete after 18 months)
    activityDate: parsedData.startTime || new Date(),
    // samplingRate tells the chart how many seconds each array index represents
    samplingRate: STREAM_STEP,
    timestamp: downsample(parsedData.timestamp),
    power:     downsample(parsedData.power),
    heartRate: downsample(parsedData.heartRate),
    cadence:   downsample(parsedData.cadence),
    speed:     downsample(parsedData.speed),
    altitude:  downsample(parsedData.altitude),
    distance:  downsample(parsedData.distance),
    lat:       downsample(parsedData.lat),
    lng:       downsample(parsedData.lng),
    laps: lapElapsed, // elapsed-seconds markers, not a 1Hz series — no downsample
  });

  return {
    activityId: activityResult.insertedId.toString(),
    ...activity,
  };
}
