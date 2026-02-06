/**
 * GPX file parser - extracts route and elevation data
 */
import type { ParsedActivity } from './fit-parser';

interface GpxPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
  extensions?: {
    power?: number;
    hr?: number;
    cad?: number;
  };
}

export async function parseGpxFile(content: string): Promise<ParsedActivity> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');

  const trackPoints = doc.querySelectorAll('trkpt');
  if (trackPoints.length === 0) {
    throw new Error('No track points found in GPX file');
  }

  const points: GpxPoint[] = [];
  for (const trkpt of trackPoints) {
    const lat = parseFloat(trkpt.getAttribute('lat') || '0');
    const lon = parseFloat(trkpt.getAttribute('lon') || '0');
    const eleNode = trkpt.querySelector('ele');
    const timeNode = trkpt.querySelector('time');

    // Try to extract extensions (power, hr, cadence)
    const powerNode = trkpt.querySelector('power') || trkpt.querySelector('ns3\\:Watts, Watts');
    const hrNode = trkpt.querySelector('hr') || trkpt.querySelector('ns3\\:hr');
    const cadNode = trkpt.querySelector('cad') || trkpt.querySelector('ns3\\:cad');

    points.push({
      lat,
      lon,
      ele: eleNode ? parseFloat(eleNode.textContent || '0') : undefined,
      time: timeNode?.textContent || undefined,
      extensions: {
        power: powerNode ? parseInt(powerNode.textContent || '0') : undefined,
        hr: hrNode ? parseInt(hrNode.textContent || '0') : undefined,
        cad: cadNode ? parseInt(cadNode.textContent || '0') : undefined,
      },
    });
  }

  const timestamps: number[] = [];
  const power: number[] = [];
  const heartRate: number[] = [];
  const speed: number[] = [];
  const cadence: number[] = [];
  const altitude: number[] = [];
  const latitude: number[] = [];
  const longitude: number[] = [];

  let startTime: number | null = null;
  let totalDistance = 0;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    if (point.time) {
      const time = new Date(point.time).getTime();
      if (!startTime) startTime = time;
      timestamps.push((time - startTime) / 1000);
    }

    power.push(point.extensions?.power || 0);
    heartRate.push(point.extensions?.hr || 0);
    cadence.push(point.extensions?.cad || 0);
    altitude.push(point.ele || 0);
    latitude.push(point.lat);
    longitude.push(point.lon);

    // Calculate speed from distance/time
    if (i > 0) {
      const dist = haversineDistance(
        points[i - 1].lat, points[i - 1].lon,
        point.lat, point.lon
      );
      totalDistance += dist;

      if (point.time && points[i - 1].time) {
        const dt = (new Date(point.time).getTime() - new Date(points[i - 1].time!).getTime()) / 1000;
        speed.push(dt > 0 ? (dist / dt) * 3.6 : 0); // km/h
      } else {
        speed.push(0);
      }
    } else {
      speed.push(0);
    }
  }

  const duration = timestamps.length > 0 ? timestamps[timestamps.length - 1] : 0;
  const activityDate = startTime ? new Date(startTime) : new Date();

  let elevationGain = 0;
  for (let i = 1; i < altitude.length; i++) {
    const diff = altitude[i] - altitude[i - 1];
    if (diff > 0) elevationGain += diff;
  }

  return {
    name: `Ride - ${activityDate.toLocaleDateString('it-IT')}`,
    activityDate,
    duration: Math.round(duration),
    distance: Math.round(totalDistance * 100) / 100,
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

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
