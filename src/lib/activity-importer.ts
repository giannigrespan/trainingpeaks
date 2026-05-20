import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  calculateNormalizedPower,
  calculateIntensityFactor,
  calculateTSS,
  calculatePowerCurve,
} from "@/lib/cycling-metrics";
import { parseFitFile } from "@/lib/fit-parser";
import type { StravaActivity, StravaStreams } from "@/lib/strava-client";

export interface ImportOptions {
  userId: string;
  name?: string;
  wahooWorkoutId?: string;
}

/** Keep 1 sample every STREAM_STEP seconds to reduce storage ~80% */
const STREAM_STEP = 5;

// Physiological upper bounds — values beyond these are hardware glitches
const MAX_POWER_W  = 3000; // exceeds any human record; UCI world record ~2400W
const MAX_HR_BPM   = 220;
const MAX_CADENCE  = 200;  // no cyclist spins above this
const MAX_SPEED_KMH = 150; // covers downhill racing

function sanitizeStream(arr: number[], max: number): number[] {
  return arr.map(v => (v > 0 && v <= max ? v : 0));
}

function downsample<T>(arr: T[]): T[] {
  return arr.filter((_, i) => i % STREAM_STEP === 0);
}

export async function importFitBuffer(buffer: Buffer, options: ImportOptions) {
  const parsedData = parseFitFile(buffer);

  // Clamp streams to physiological bounds — guards against power meter spikes
  // and any sentinel values the parser may have missed (e.g. device firmware bugs)
  parsedData.power     = sanitizeStream(parsedData.power,     MAX_POWER_W);
  parsedData.heartRate = sanitizeStream(parsedData.heartRate, MAX_HR_BPM);
  parsedData.cadence   = sanitizeStream(parsedData.cadence,   MAX_CADENCE);
  parsedData.speed     = sanitizeStream(parsedData.speed,     MAX_SPEED_KMH);

  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(options.userId) });
  const ftp = user?.ftp || 200;

  const powerData = parsedData.power.filter((p: number) => p > 0);
  const np = calculateNormalizedPower(powerData);
  const intensityFactor = calculateIntensityFactor(np, ftp);
  // Use movingTime for TSS so pauses don't inflate training load
  const rawTss = calculateTSS(parsedData.movingTime, np, intensityFactor, ftp);
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
    movingTime: parsedData.movingTime,
    distance: parsedData.totalDistance,
    elevationGain: parsedData.elevationGain,
    avgPower: Math.round(
      powerData.reduce((s: number, v: number) => s + v, 0) / (powerData.length || 1)
    ),
    maxPower: powerData.reduce((max: number, v: number) => (v > max ? v : max), 0),
    normalizedPower: np,
    intensityFactor,
    tss,
    avgHR: (() => {
      const movingHR = parsedData.heartRate.filter((_: number, i: number) => parsedData.speed[i] > 0 && parsedData.heartRate[i] > 0);
      return movingHR.length > 0
        ? Math.round(movingHR.reduce((s: number, v: number) => s + v, 0) / movingHR.length)
        : Math.round(parsedData.heartRate.filter((v: number) => v > 0).reduce((s: number, v: number) => s + v, 0) / (parsedData.heartRate.filter((v: number) => v > 0).length || 1));
    })(),
    maxHR: parsedData.heartRate.reduce((max: number, v: number) => (v > max ? v : max), 0),
    avgCadence: (() => {
      const movingCadence = parsedData.cadence.filter((_: number, i: number) => parsedData.speed[i] > 0 && parsedData.cadence[i] > 0);
      return movingCadence.length > 0
        ? Math.round(movingCadence.reduce((s: number, v: number) => s + v, 0) / movingCadence.length)
        : Math.round(parsedData.cadence.filter((v: number) => v > 0).reduce((s: number, v: number) => s + v, 0) / (parsedData.cadence.filter((v: number) => v > 0).length || 1));
    })(),
    avgSpeed:
      parsedData.totalDistance > 0 && parsedData.movingTime > 0
        ? parsedData.totalDistance / parsedData.movingTime
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

export async function importStravaActivity(
  summary: StravaActivity,
  streams: StravaStreams,
  options: { userId: string; stravaActivityId: string }
) {
  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(options.userId) });
  const ftp = user?.ftp || 200;

  const len = streams.time?.data.length ?? 0;
  const emptyArr = () => new Array<number>(len).fill(0);

  // Power: watts stream in W, clamp to physiological max
  const rawPower = streams.watts?.data ?? emptyArr();
  const power = rawPower.map((v) =>
    v > 0 && v <= MAX_POWER_W ? v : 0
  );

  // Heart rate: bpm
  const heartRate = (streams.heartrate?.data ?? emptyArr()).map((v) =>
    v > 0 && v <= MAX_HR_BPM ? v : 0
  );

  // Cadence: rpm
  const cadence = (streams.cadence?.data ?? emptyArr()).map((v) =>
    v > 0 && v <= MAX_CADENCE ? v : 0
  );

  // Speed: Strava velocity_smooth in m/s → convert to km/h (consistent with FIT parser)
  const speed = (streams.velocity_smooth?.data ?? emptyArr()).map((v) => {
    const kmh = v * 3.6;
    return kmh > 0 && kmh <= MAX_SPEED_KMH ? kmh : 0;
  });

  const altitude = streams.altitude?.data ?? emptyArr();
  const distance = streams.distance?.data ?? emptyArr();
  const lat = (streams.latlng?.data ?? []).map(([lat]) => lat);
  const lng = (streams.latlng?.data ?? []).map(([, lng]) => lng);

  // Timestamps: absolute Unix seconds
  const startUnix = Math.floor(new Date(summary.start_date).getTime() / 1000);
  const timestamp = (streams.time?.data ?? []).map((t) => startUnix + t);

  const powerData = power.filter((p) => p > 0);
  const np = calculateNormalizedPower(powerData);
  const intensityFactor = calculateIntensityFactor(np, ftp);
  const rawTss = calculateTSS(summary.moving_time, np, intensityFactor, ftp);
  const tss = Math.min(rawTss, 500);
  const powerCurve = calculatePowerCurve(powerData);

  const movingHR = heartRate.filter((_, i) => speed[i] > 0 && heartRate[i] > 0);
  const avgHR =
    movingHR.length > 0
      ? Math.round(movingHR.reduce((s, v) => s + v, 0) / movingHR.length)
      : Math.round(
          heartRate.filter((v) => v > 0).reduce((s, v) => s + v, 0) /
            (heartRate.filter((v) => v > 0).length || 1)
        );

  const movingCadence = cadence.filter((_, i) => speed[i] > 0 && cadence[i] > 0);
  const avgCadence =
    movingCadence.length > 0
      ? Math.round(movingCadence.reduce((s, v) => s + v, 0) / movingCadence.length)
      : Math.round(
          cadence.filter((v) => v > 0).reduce((s, v) => s + v, 0) /
            (cadence.filter((v) => v > 0).length || 1)
        );

  const activity = {
    userId: options.userId,
    stravaActivityId: options.stravaActivityId,
    name: summary.name,
    activityDate: new Date(summary.start_date),
    sport: "cycling",
    duration: summary.elapsed_time,
    movingTime: summary.moving_time,
    distance: summary.distance,
    elevationGain: summary.total_elevation_gain,
    avgPower: Math.round(
      powerData.reduce((s, v) => s + v, 0) / (powerData.length || 1)
    ),
    maxPower: powerData.reduce((max, v) => (v > max ? v : max), 0),
    normalizedPower: np,
    intensityFactor,
    tss,
    avgHR,
    maxHR: heartRate.reduce((max, v) => (v > max ? v : max), 0),
    avgCadence,
    avgSpeed:
      summary.distance > 0 && summary.moving_time > 0
        ? summary.distance / summary.moving_time
        : 0,
    maxSpeed: summary.max_speed * 3.6, // m/s → km/h
    calories: summary.calories ?? 0,
    powerCurve,
    createdAt: new Date(),
  };

  const activityResult = await db.collection("activities").insertOne(activity);

  await db.collection("activity_streams").insertOne({
    activityId: activityResult.insertedId.toString(),
    activityDate: new Date(summary.start_date),
    samplingRate: STREAM_STEP, // downsample 1Hz Strava streams to 1 per 5s
    timestamp: downsample(timestamp),
    power: downsample(power),
    heartRate: downsample(heartRate),
    cadence: downsample(cadence),
    speed: downsample(speed),
    altitude: downsample(altitude),
    distance: downsample(distance),
    lat: downsample(lat),
    lng: downsample(lng),
    laps: [],
  });

  return {
    activityId: activityResult.insertedId.toString(),
    ...activity,
  };
}
