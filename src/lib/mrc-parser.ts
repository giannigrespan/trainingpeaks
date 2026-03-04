import { v4 as uuid } from "uuid";
import type { WorkoutStep } from "@/types/workout";

export interface ParsedMrc {
  name: string;
  description: string;
  steps: WorkoutStep[];
}

/**
 * Parse a .mrc or .erg file into WorkoutStep[].
 * Format: two-column [COURSE DATA] section with "minutes watts".
 * Adjacent segments with identical watts are merged into one step.
 */
export function parseMrc(text: string): ParsedMrc {
  const lines = text.split(/\r?\n/);

  let name = "Workout importato";
  let description = "";
  let inHeader = false;
  let inData = false;

  const points: { minutes: number; watts: number }[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("[COURSE HEADER]")) { inHeader = true; inData = false; continue; }
    if (line.startsWith("[COURSE DATA]")) { inData = true; inHeader = false; continue; }
    if (line.startsWith("[")) { inHeader = false; inData = false; continue; }

    if (inHeader) {
      const [key, ...rest] = line.split("=");
      const val = rest.join("=").trim();
      if (key.trim().toUpperCase() === "DESCRIPTION") name = val || name;
      if (key.trim().toUpperCase() === "FILE NAME") description = val;
    }

    if (inData) {
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      const min = parseFloat(parts[0]);
      const w = parseFloat(parts[1]);
      if (!isNaN(min) && !isNaN(w)) {
        points.push({ minutes: min, watts: w });
      }
    }
  }

  if (points.length < 2) return { name, description, steps: [] };

  // Group consecutive same-watts segments into steps
  const steps: WorkoutStep[] = [];
  let segStart = points[0].minutes;
  let segWatts = points[0].watts;

  const flush = (endMin: number) => {
    const durSec = Math.round((endMin - segStart) * 60);
    if (durSec < 1) return;
    // Guess step type from position
    const fraction = segStart / points[points.length - 1].minutes;
    let type: WorkoutStep["type"] = "steady";
    if (fraction < 0.15) type = "warmup";
    else if (fraction > 0.85) type = "cooldown";

    steps.push({
      id: uuid(),
      type,
      durationSeconds: durSec,
      // Store absolute watts — caller can convert to % FTP if FTP is known
      powerPercent: segWatts,
    });
  };

  for (let i = 1; i < points.length; i++) {
    if (points[i].watts !== segWatts) {
      flush(points[i].minutes);
      segStart = points[i].minutes;
      segWatts = points[i].watts;
    }
  }
  flush(points[points.length - 1].minutes);

  return { name, description, steps };
}

/**
 * Convert absolute-watt MRC steps to % FTP steps.
 * Called after import if user's FTP is known.
 */
export function mrcStepsToFtpPercent(steps: WorkoutStep[], ftp: number): WorkoutStep[] {
  if (ftp <= 0) return steps;
  return steps.map((s) => ({ ...s, powerPercent: Math.round((s.powerPercent / ftp) * 1000) / 1000 }));
}
