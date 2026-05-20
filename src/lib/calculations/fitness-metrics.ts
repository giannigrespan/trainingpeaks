import { startOfDay, differenceInDays, addDays } from 'date-fns';

interface DailyTSS {
  date: Date;
  tss: number;
}

interface FitnessPoint {
  date: Date;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

const CTL_TAU = 42;
const ATL_TAU = 7;

export function calculateFitnessTimeSeries(
  dailyTSS: DailyTSS[],
  startCTL = 0,
  startATL = 0
): FitnessPoint[] {
  if (dailyTSS.length === 0) return [];

  const sorted = [...dailyTSS].sort((a, b) => a.date.getTime() - b.date.getTime());

  const tssMap = new Map<string, number>();
  for (const entry of sorted) {
    const key = startOfDay(entry.date).toISOString();
    tssMap.set(key, (tssMap.get(key) ?? 0) + entry.tss);
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
    const tss = tssMap.get(key) ?? 0;

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

export function updateFitnessFromDate(
  existingData: FitnessPoint[],
  newTSS: DailyTSS[],
  fromDate: Date
): FitnessPoint[] {
  const fromDay = startOfDay(fromDate);

  const existingBefore = existingData.filter(
    d => startOfDay(d.date).getTime() < fromDay.getTime()
  );

  const lastBefore = existingBefore[existingBefore.length - 1];
  const startCTL = lastBefore?.ctl ?? 0;
  const startATL = lastBefore?.atl ?? 0;

  const existingFrom = existingData
    .filter(d => startOfDay(d.date).getTime() >= fromDay.getTime())
    .map(d => ({ date: d.date, tss: d.tss }));

  const merged = new Map<string, DailyTSS>();
  for (const entry of [...existingFrom, ...newTSS]) {
    const key = startOfDay(entry.date).toISOString();
    const existing = merged.get(key);
    if (existing) {
      existing.tss += entry.tss;
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
 * Single source of truth for TSB zone thresholds across the entire app.
 * Returns Italian label, chart hex color, and Tailwind text class.
 */
export function getTSBInterpretation(tsb: number): {
  label: string;
  hexColor: string;
  twColor: string;
} {
  if (tsb > 25)   return { label: 'Transizione',    hexColor: '#94A3B8', twColor: 'text-gray-400' };
  if (tsb > 10)   return { label: 'Fresco',         hexColor: '#10B981', twColor: 'text-emerald-500' };
  if (tsb >= -10) return { label: 'Forma ottimale', hexColor: '#3B82F6', twColor: 'text-blue-500' };
  if (tsb >= -30) return { label: 'Affaticato',     hexColor: '#F59E0B', twColor: 'text-amber-500' };
  return           { label: 'Sovraccarico',          hexColor: '#EF4444', twColor: 'text-red-500' };
}
