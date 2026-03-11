import type { PowerCurvePoint } from "@/types";

/**
 * Calculate Normalized Power (NP)
 * 1. Calculate 30-second rolling average of power
 * 2. Raise each value to the 4th power
 * 3. Take average of the 4th-power values
 * 4. Take the 4th root of result
 */
export function calculateNormalizedPower(powerData: number[]): number {
  if (powerData.length < 30) {
    return calculateAverage(powerData);
  }

  // 30-second rolling average
  const rollingAvg: number[] = [];
  for (let i = 29; i < powerData.length; i++) {
    let sum = 0;
    for (let j = i - 29; j <= i; j++) {
      sum += powerData[j];
    }
    rollingAvg.push(sum / 30);
  }

  // Raise to 4th power, average, then 4th root
  const fourthPowerAvg =
    rollingAvg.reduce((sum, val) => sum + Math.pow(val, 4), 0) /
    rollingAvg.length;

  return Math.round(Math.pow(fourthPowerAvg, 0.25));
}

/**
 * Calculate Intensity Factor (IF)
 * IF = NP / FTP
 */
export function calculateIntensityFactor(np: number, ftp: number): number {
  if (ftp <= 0) return 0;
  return Math.round((np / ftp) * 100) / 100;
}

/**
 * Calculate Training Stress Score (TSS)
 * TSS = (duration_seconds * NP * IF) / (FTP * 3600) * 100
 */
export function calculateTSS(
  durationSeconds: number,
  np: number,
  intensityFactor: number,
  ftp: number
): number {
  if (ftp <= 0) return 0;
  const tss =
    ((durationSeconds * np * intensityFactor) / (ftp * 3600)) * 100;
  return Math.round(tss);
}

/**
 * Calculate Power Curve - best average power for given durations
 */
export function calculatePowerCurve(powerData: number[]): PowerCurvePoint[] {
  const durations = [1, 5, 10, 30, 60, 180, 300, 600, 900, 1200, 3600];
  const curve: PowerCurvePoint[] = [];

  for (const duration of durations) {
    if (duration > powerData.length) break;

    let maxAvg = 0;
    let windowSum = 0;

    // Initialize window
    for (let i = 0; i < duration; i++) {
      windowSum += powerData[i];
    }
    maxAvg = windowSum / duration;

    // Slide window
    for (let i = duration; i < powerData.length; i++) {
      windowSum += powerData[i] - powerData[i - duration];
      const avg = windowSum / duration;
      if (avg > maxAvg) maxAvg = avg;
    }

    curve.push({ duration, power: Math.round(maxAvg) });
  }

  return curve;
}

/**
 * Calculate power zone distribution
 */
export function calculateZoneDistribution(
  powerData: number[],
  ftp: number
): { zone: string; percentage: number; seconds: number }[] {
  const zones = [
    { name: "Z1 Recovery", min: 0, max: 0.55 },
    { name: "Z2 Endurance", min: 0.55, max: 0.75 },
    { name: "Z3 Tempo", min: 0.75, max: 0.90 },
    { name: "Z4 Threshold", min: 0.90, max: 1.05 },
    { name: "Z5 VO2max", min: 1.05, max: 1.20 },
    { name: "Z6 Anaerobic", min: 1.20, max: Infinity },
  ];

  const counts = new Array(zones.length).fill(0);

  for (const power of powerData) {
    const ratio = power / ftp;
    for (let i = 0; i < zones.length; i++) {
      if (ratio >= zones[i].min && ratio < zones[i].max) {
        counts[i]++;
        break;
      }
    }
  }

  const total = powerData.length;
  return zones.map((zone, i) => ({
    zone: zone.name,
    percentage: Math.round((counts[i] / total) * 100),
    seconds: counts[i],
  }));
}

/**
 * Calculate CTL (Chronic Training Load) / ATL (Acute Training Load) / TSB
 * CTL = yesterday's CTL + (today's TSS - yesterday's CTL) / 42
 * ATL = yesterday's ATL + (today's TSS - yesterday's ATL) / 7
 * TSB = yesterday's CTL - yesterday's ATL
 */
export function calculatePMC(
  dailyTSS: { date: string; tss: number }[],
  initialCTL = 0,
  initialATL = 0
): { date: string; ctl: number; atl: number; tsb: number; tss: number }[] {
  let ctl = initialCTL;
  let atl = initialATL;

  return dailyTSS.map(({ date, tss }) => {
    ctl = ctl + (tss - ctl) / 42;
    atl = atl + (tss - atl) / 7;
    const tsb = ctl - atl;
    return {
      date,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
      tss,
    };
  });
}

/**
 * Generate default power zones from FTP
 */
export function generatePowerZones(ftp: number) {
  return {
    z1: { min: 0, max: Math.round(ftp * 0.55) },
    z2: { min: Math.round(ftp * 0.55), max: Math.round(ftp * 0.75) },
    z3: { min: Math.round(ftp * 0.75), max: Math.round(ftp * 0.90) },
    z4: { min: Math.round(ftp * 0.90), max: Math.round(ftp * 1.05) },
    z5: { min: Math.round(ftp * 1.05), max: Math.round(ftp * 1.20) },
    z6: { min: Math.round(ftp * 1.20), max: null },
  };
}

function calculateAverage(data: number[]): number {
  if (data.length === 0) return 0;
  return Math.round(data.reduce((sum, val) => sum + val, 0) / data.length);
}
