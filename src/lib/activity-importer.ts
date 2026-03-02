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
  const tss = calculateTSS(parsedData.duration, np, intensityFactor, ftp);
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
    timestamp: parsedData.timestamp,
    power: parsedData.power,
    heartRate: parsedData.heartRate,
    cadence: parsedData.cadence,
    speed: parsedData.speed,
    altitude: parsedData.altitude,
    distance: parsedData.distance,
    lat: parsedData.lat,
    lng: parsedData.lng,
    laps: lapElapsed,
  });

  return {
    activityId: activityResult.insertedId.toString(),
    ...activity,
  };
}
