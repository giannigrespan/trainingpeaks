/**
 * Core power metrics calculations for cycling analytics.
 * Based on Dr. Andy Coggan's methodology.
 */

/**
 * Calculate Normalized Power (NP)
 * 1. Rolling 30-second average of power stream
 * 2. Raise each value to 4th power
 * 3. Calculate arithmetic mean
 * 4. Take 4th root
 */
export function calculateNormalizedPower(powerData: number[]): number {
  if (powerData.length < 30) return calculateAvgPower(powerData);

  // Step 1: 30-second rolling average
  const rollingAvg: number[] = [];
  let windowSum = 0;

  for (let i = 0; i < powerData.length; i++) {
    windowSum += powerData[i];
    if (i >= 30) {
      windowSum -= powerData[i - 30];
    }
    if (i >= 29) {
      rollingAvg.push(windowSum / 30);
    }
  }

  // Step 2 & 3: Raise to 4th power and calculate mean
  let sum = 0;
  for (const val of rollingAvg) {
    sum += Math.pow(val, 4);
  }
  const mean = sum / rollingAvg.length;

  // Step 4: 4th root
  return Math.round(Math.pow(mean, 0.25));
}

/**
 * Calculate average power (excluding zeros for coasting)
 */
export function calculateAvgPower(powerData: number[]): number {
  const nonZero = powerData.filter(p => p > 0);
  if (nonZero.length === 0) return 0;
  return Math.round(nonZero.reduce((sum, p) => sum + p, 0) / nonZero.length);
}

/**
 * Calculate Intensity Factor (IF)
 * IF = NP / FTP
 */
export function calculateIntensityFactor(np: number, ftp: number): number {
  if (ftp === 0) return 0;
  return Math.round((np / ftp) * 1000) / 1000;
}

/**
 * Calculate Training Stress Score (TSS)
 * TSS = (duration_sec × NP × IF) / (FTP × 3600) × 100
 */
export function calculateTSS(durationSec: number, np: number, ftp: number): number {
  if (ftp === 0) return 0;
  const intensityFactor = np / ftp;
  const tss = (durationSec * np * intensityFactor) / (ftp * 3600) * 100;
  return Math.round(tss * 10) / 10;
}

/**
 * Calculate Variability Index (VI)
 * VI = NP / Avg Power (1.0 = perfect pacing)
 */
export function calculateVariabilityIndex(np: number, avgPower: number): number {
  if (avgPower === 0) return 0;
  return Math.round((np / avgPower) * 100) / 100;
}

/**
 * Calculate Power Curve - Mean Maximal Power for given durations
 * Returns best average power for each duration window
 */
export function calculatePowerCurve(
  powerData: number[],
  durations: number[] = [5, 10, 30, 60, 300, 1200, 3600]
): Record<string, number> {
  const curve: Record<string, number> = {};
  const labels: Record<number, string> = {
    5: '5s',
    10: '10s',
    30: '30s',
    60: '1min',
    300: '5min',
    1200: '20min',
    3600: '60min',
  };

  for (const duration of durations) {
    if (powerData.length < duration) {
      curve[labels[duration] || `${duration}s`] = 0;
      continue;
    }

    let maxAvg = 0;
    let windowSum = 0;

    // Initialize first window
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

    curve[labels[duration] || `${duration}s`] = Math.round(maxAvg);
  }

  return curve;
}

/**
 * Calculate zone distribution (% time in each zone)
 * Based on Coggan power zones relative to FTP
 */
export function calculateZoneDistribution(powerData: number[], ftp: number): number[] {
  const zones = [0, 0, 0, 0, 0, 0]; // Z1-Z6
  const thresholds = [0.55, 0.75, 0.90, 1.05, 1.20]; // Zone boundaries as % of FTP
  const total = powerData.length;

  if (total === 0) return zones;

  for (const p of powerData) {
    const ratio = p / ftp;
    if (ratio <= thresholds[0]) zones[0]++;
    else if (ratio <= thresholds[1]) zones[1]++;
    else if (ratio <= thresholds[2]) zones[2]++;
    else if (ratio <= thresholds[3]) zones[3]++;
    else if (ratio <= thresholds[4]) zones[4]++;
    else zones[5]++;
  }

  // Convert to percentages
  return zones.map(z => Math.round((z / total) * 1000) / 10);
}

/**
 * Calculate all activity metrics at once
 */
export function calculateAllMetrics(
  powerData: number[],
  ftp: number,
  durationSec: number
): {
  avgPower: number;
  normalizedPower: number;
  intensityFactor: number;
  tss: number;
  variabilityIndex: number;
  powerCurve: Record<string, number>;
  zoneDistribution: number[];
} {
  const avgPower = calculateAvgPower(powerData);
  const normalizedPower = calculateNormalizedPower(powerData);
  const intensityFactor = calculateIntensityFactor(normalizedPower, ftp);
  const tss = calculateTSS(durationSec, normalizedPower, ftp);
  const variabilityIndex = calculateVariabilityIndex(normalizedPower, avgPower);
  const powerCurve = calculatePowerCurve(powerData);
  const zoneDistribution = calculateZoneDistribution(powerData, ftp);

  return {
    avgPower,
    normalizedPower,
    intensityFactor,
    tss,
    variabilityIndex,
    powerCurve,
    zoneDistribution,
  };
}
