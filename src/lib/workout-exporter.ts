import { expandSteps } from "./workout-utils";
import type { Workout, WorkoutStep } from "@/types/workout";

/* ─── ZWO (Zwift XML) ─────────────────────────────────────────── */

function stepToZwo(step: WorkoutStep): string {
  const d = step.durationSeconds;
  const p = step.powerPercent.toFixed(3);
  const pEnd = (step.powerPercentEnd ?? step.powerPercent).toFixed(3);

  switch (step.type) {
    case "warmup":
      return `    <Warmup Duration="${d}" PowerLow="${p}" PowerHigh="${pEnd}"/>`;
    case "cooldown":
      return `    <Cooldown Duration="${d}" PowerLow="${p}" PowerHigh="${pEnd}"/>`;
    case "ramp":
      return `    <Ramp Duration="${d}" PowerLow="${p}" PowerHigh="${pEnd}"/>`;
    case "interval":
      return [
        `    <IntervalsT`,
        `      Repeat="${step.repeat ?? 1}"`,
        `      OnDuration="${d}"`,
        `      OffDuration="${step.offDurationSeconds ?? 120}"`,
        `      OnPower="${p}"`,
        `      OffPower="${(step.offPowerPercent ?? 0.5).toFixed(3)}"/>`,
      ].join(" ");
    case "free":
      return `    <FreeRide Duration="${d}" FlatRoad="0"/>`;
    default:
      return `    <SteadyState Duration="${d}" Power="${p}"/>`;
  }
}

export function exportZwo(workout: Workout): string {
  const blocks = workout.steps.map(stepToZwo).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
  <author>CycloPower</author>
  <name>${escapeXml(workout.name)}</name>
  <description>${escapeXml(workout.description ?? "")}</description>
  <sportType>bike</sportType>
  <workout>
${blocks}
  </workout>
</workout_file>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ─── MRC (TrainerRoad / ERG) ─────────────────────────────────── */

/**
 * Export to .mrc format using absolute watts.
 * Requires ftp to convert % → watts.
 */
export function exportMrc(workout: Workout, ftp: number): string {
  const expanded = expandSteps(workout.steps);
  const lines: string[] = [
    "[COURSE HEADER]",
    `DESCRIPTION = ${workout.name}`,
    `FILE NAME = ${workout.name.replace(/\s+/g, "_")}.mrc`,
    "MINUTES WATTS",
    "",
    "[COURSE DATA]",
  ];

  let currentMin = 0;

  for (const step of expanded) {
    const startMin = currentMin;
    const endMin = currentMin + step.durationSeconds / 60;

    const startW = Math.round(step.powerPercent * ftp);
    const endW = step.powerPercentEnd != null
      ? Math.round(step.powerPercentEnd * ftp)
      : startW;

    lines.push(`${startMin.toFixed(3)}\t${startW}`);
    if (endW !== startW) {
      lines.push(`${endMin.toFixed(3)}\t${endW}`);
    } else {
      lines.push(`${endMin.toFixed(3)}\t${endW}`);
    }
    currentMin = endMin;
  }

  lines.push("[END COURSE DATA]");
  return lines.join("\n");
}
