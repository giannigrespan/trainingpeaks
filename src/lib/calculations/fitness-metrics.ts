/**
 * Fitness metrics calculations: CTL, ATL, TSB
 * Based on exponentially weighted moving averages (Banister model)
 */

import { startOfDay, differenceInDays, addDays } from 'date-fns';

interface DailyTSS {
  date: Date;
  tss: number;
}

interface FitnessPoint {
  date: Date;
  tss: number;
  ctl: number; // Chronic Training Load (fitness) - tau 42 days
  atl: number; // Acute Training Load (fatigue) - tau 7 days
  tsb: number; // Training Stress Balance (form) = CTL - ATL
}

const CTL_TAU = 42;
const ATL_TAU = 7;

/**
 * Calculate CTL/ATL/TSB for a series of daily TSS values.
 * Fills in gaps (rest days with TSS=0).
 *
 * CTL_today = CTL_yesterday + (TSS_today - CTL_yesterday) / 42
 * ATL_today = ATL_yesterday + (TSS_today - ATL_yesterday) / 7
 * TSB_today = CTL_today - ATL_today
 */
export function calculateFitnessTimeSeries(
  dailyTSS: DailyTSS[],
  startCTL = 0,
  startATL = 0
): FitnessPoint[] {
  if (dailyTSS.length === 0) return [];

  // Sort by date
  const sorted = [...dailyTSS].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Create a map of date -> TSS for quick lookup
  const tssMap = new Map<string, number>();
  for (const entry of sorted) {
    const key = startOfDay(entry.date).toISOString();
    const existing = tssMap.get(key) || 0;
    tssMap.set(key, existing + entry.tss);
  }

  const firstDate = startOfDay(sorted[0].date);
  const lastDate = startOfDay(sorted[sorted.length - 1].date);
  const totalDays = differenceInDays(lastDate, firstDate) + 1;

  const results: FitnessPoint[] = [];
  let ctl = startCTL;
  let atl = startATL;

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(firstDate, i);
    const key = date.toISOString();
    const tss = tssMap.get(key) || 0;

    ctl = ctl + (tss - ctl) / CTL_TAU;
    atl = atl + (tss - atl) / ATL_TAU;
    const tsb = ctl - atl;

    results.push({
      date,
      tss,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
    });
  }

  return results;
}

/**
 * Incrementally update fitness data from a specific date.
 * Useful when a new activity is uploaded.
 */
export function updateFitnessFromDate(
  existingData: FitnessPoint[],
  newTSS: DailyTSS[],
  fromDate: Date
): FitnessPoint[] {
  const fromDay = startOfDay(fromDate);

  // Find the starting CTL/ATL from the day before
  const existingBefore = existingData.filter(
    d => startOfDay(d.date).getTime() < fromDay.getTime()
  );

  const lastBefore = existingBefore[existingBefore.length - 1];
  const startCTL = lastBefore?.ctl || 0;
  const startATL = lastBefore?.atl || 0;

  // Merge existing TSS from fromDate onward with new TSS
  const existingFrom = existingData
    .filter(d => startOfDay(d.date).getTime() >= fromDay.getTime())
    .map(d => ({ date: d.date, tss: d.tss }));

  const allTSS = [...existingFrom, ...newTSS];

  // Deduplicate by date, summing TSS
  const merged = new Map<string, DailyTSS>();
  for (const entry of allTSS) {
    const key = startOfDay(entry.date).toISOString();
    const existing = merged.get(key);
    if (existing) {
      existing.tss = entry.tss; // Use latest TSS value
    } else {
      merged.set(key, { date: startOfDay(entry.date), tss: entry.tss });
    }
  }

  const newTimeSeries = calculateFitnessTimeSeries(
    Array.from(merged.values()),
    startCTL,
    startATL
  );

  return [...existingBefore, ...newTimeSeries];
}

/**
 * Get TSB zone label and color
 */
export function getTSBZone(tsb: number): { label: string; color: string } {
  if (tsb > 25) return { label: 'Transition', color: '#94A3B8' };
  if (tsb > 10) return { label: 'Fresh', color: '#10B981' };
  if (tsb >= -10) return { label: 'Optimal', color: '#3B82F6' };
  if (tsb >= -30) return { label: 'Fatigued', color: '#F59E0B' };
  return { label: 'Overreaching', color: '#EF4444' };
}
