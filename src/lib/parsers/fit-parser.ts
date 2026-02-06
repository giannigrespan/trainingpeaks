/**
 * FIT file parser - extracts cycling data streams from Garmin/Wahoo/etc devices
 */
import FitParser from 'fit-file-parser';

export interface ParsedActivity {
  name: string;
  activityDate: Date;
  duration: number; // seconds
  distance: number; // km
  elevationGain: number;
  streams: {
    timestamps: number[];
    power: number[];
    heartRate: number[];
    speed: number[];
    cadence: number[];
    altitude: number[];
    latitude: number[];
    longitude: number[];
  };
}

export async function parseFitFile(buffer: Buffer): Promise<ParsedActivity> {
  return new Promise((resolve, reject) => {
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'km',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'cascade',
    });

    fitParser.parse(buffer, (error: Error | null, data: FitParseResult) => {
      if (error) {
        reject(new Error(`FIT parse error: ${error.message}`));
        return;
      }

      try {
        const result = extractStreams(data);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  });
}

interface FitRecord {
  timestamp?: Date;
  power?: number;
  heart_rate?: number;
  speed?: number;
  cadence?: number;
  altitude?: number;
  position_lat?: number;
  position_long?: number;
  enhanced_speed?: number;
  enhanced_altitude?: number;
  elapsed_time?: number;
}

interface FitSession {
  sport?: string;
  start_time?: Date;
  total_elapsed_time?: number;
  total_timer_time?: number;
  total_distance?: number;
  total_ascent?: number;
}

interface FitParseResult {
  activity?: {
    sessions?: FitSession[];
    events?: unknown[];
  };
  records?: FitRecord[];
  sessions?: FitSession[];
}

function extractStreams(data: FitParseResult): ParsedActivity {
  const records = data.records || [];
  const session = data.activity?.sessions?.[0] || data.sessions?.[0];

  const timestamps: number[] = [];
  const power: number[] = [];
  const heartRate: number[] = [];
  const speed: number[] = [];
  const cadence: number[] = [];
  const altitude: number[] = [];
  const latitude: number[] = [];
  const longitude: number[] = [];

  let startTime: Date | null = null;

  for (const record of records) {
    if (!record.timestamp) continue;

    if (!startTime) startTime = new Date(record.timestamp);

    const elapsed = (new Date(record.timestamp).getTime() - startTime.getTime()) / 1000;
    timestamps.push(elapsed);
    power.push(record.power || 0);
    heartRate.push(record.heart_rate || 0);
    speed.push(record.enhanced_speed || record.speed || 0);
    cadence.push(record.cadence || 0);
    altitude.push(record.enhanced_altitude || record.altitude || 0);

    if (record.position_lat != null && record.position_long != null) {
      latitude.push(record.position_lat);
      longitude.push(record.position_long);
    }
  }

  const activityDate = session?.start_time || startTime || new Date();
  const duration = session?.total_timer_time || session?.total_elapsed_time ||
    (timestamps.length > 0 ? timestamps[timestamps.length - 1] : 0);
  const distance = session?.total_distance || 0;
  const elevationGain = session?.total_ascent || calculateElevationGain(altitude);

  const sport = session?.sport || 'cycling';

  return {
    name: `${sport.charAt(0).toUpperCase() + sport.slice(1)} - ${new Date(activityDate).toLocaleDateString('it-IT')}`,
    activityDate: new Date(activityDate),
    duration: Math.round(duration),
    distance: Math.round(distance * 100) / 100,
    elevationGain: Math.round(elevationGain),
    streams: {
      timestamps,
      power,
      heartRate,
      speed,
      cadence,
      altitude,
      latitude,
      longitude,
    },
  };
}

function calculateElevationGain(altitude: number[]): number {
  let gain = 0;
  for (let i = 1; i < altitude.length; i++) {
    const diff = altitude[i] - altitude[i - 1];
    if (diff > 0) gain += diff;
  }
  return gain;
}
