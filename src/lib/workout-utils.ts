import type { WorkoutStep } from "@/types/workout";

/**
 * Expand an interval step into its on/off repetitions as flat steady steps
 * (used for chart rendering and MRC export)
 */
export function expandSteps(steps: WorkoutStep[]): WorkoutStep[] {
  const expanded: WorkoutStep[] = [];
  for (const step of steps) {
    if (step.type === "interval" && step.repeat && step.repeat > 1) {
      for (let i = 0; i < step.repeat; i++) {
        expanded.push({ ...step, id: `${step.id}-on-${i}`, repeat: undefined, type: "steady" });
        if (step.offDurationSeconds && step.offPowerPercent != null) {
          expanded.push({
            ...step,
            id: `${step.id}-off-${i}`,
            type: "recovery",
            durationSeconds: step.offDurationSeconds,
            powerPercent: step.offPowerPercent,
            repeat: undefined,
            offDurationSeconds: undefined,
            offPowerPercent: undefined,
          });
        }
      }
    } else {
      expanded.push(step);
    }
  }
  return expanded;
}

/** Total workout duration in seconds (accounting for repetitions) */
export function totalDuration(steps: WorkoutStep[]): number {
  return expandSteps(steps).reduce((sum, s) => sum + s.durationSeconds, 0);
}

/** Estimated TSS (FTP-relative: TSS = duration * IF² * 100 / 3600) */
export function estimateTSS(steps: WorkoutStep[]): number {
  let tss = 0;
  for (const step of steps) {
    const reps = step.repeat ?? 1;
    tss += reps * (step.durationSeconds * step.powerPercent ** 2 * 100) / 3600;
    if (step.offDurationSeconds && step.offPowerPercent != null) {
      tss +=
        reps *
        (step.offDurationSeconds * step.offPowerPercent ** 2 * 100) /
        3600;
    }
  }
  return Math.round(tss);
}

/** Format seconds to mm:ss or h:mm:ss */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}min`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Step type label in Italian */
export function stepLabel(type: WorkoutStep["type"]): string {
  const map: Record<string, string> = {
    warmup: "Riscaldamento",
    steady: "Steady State",
    interval: "Intervallo",
    recovery: "Recupero",
    cooldown: "Defaticamento",
    ramp: "Rampa",
    free: "Libero",
  };
  return map[type] ?? type;
}

/** Color for each step type (Tailwind bg classes) */
export function stepColor(type: WorkoutStep["type"]): string {
  const map: Record<string, string> = {
    warmup: "#F59E0B",
    steady: "#3B82F6",
    interval: "#EF4444",
    recovery: "#10B981",
    cooldown: "#8B5CF6",
    ramp: "#F97316",
    free: "#6B7280",
  };
  return map[type] ?? "#6B7280";
}
