"use client";

import { useMemo } from "react";
import { expandSteps, stepColor } from "@/lib/workout-utils";
import type { WorkoutStep } from "@/types/workout";

interface Props {
  steps: WorkoutStep[];
  height?: number;
  /** Current elapsed seconds (for the live playhead line in the player) */
  elapsedSeconds?: number;
}

/**
 * Renders the workout power profile as a bar chart using SVG.
 * Each expanded step is drawn as a filled rectangle whose height
 * represents powerPercent relative to the max power in the workout.
 */
export function WorkoutProfileChart({ steps, height = 80, elapsedSeconds }: Props) {
  const expanded = useMemo(() => expandSteps(steps), [steps]);
  const totalSec = useMemo(
    () => expanded.reduce((s, e) => s + e.durationSeconds, 0),
    [expanded]
  );

  if (totalSec === 0 || expanded.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-400"
      >
        Nessun blocco
      </div>
    );
  }

  const maxPower = Math.max(...expanded.map((s) => s.powerPercentEnd ?? s.powerPercent), 0.5);

  let cursor = 0;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${totalSec} ${maxPower * 100}`}
      preserveAspectRatio="none"
      className="rounded overflow-hidden"
      aria-label="Profilo workout"
    >
      {/* Background */}
      <rect width={totalSec} height={maxPower * 100} fill="rgb(24,24,27)" />

      {/* FTP reference line at 100% */}
      <line
        x1={0}
        y1={maxPower * 100 - 100}
        x2={totalSec}
        y2={maxPower * 100 - 100}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      {expanded.map((step, i) => {
        const x = cursor;
        const w = step.durationSeconds;
        cursor += w;

        const color = stepColor(step.type);
        const pStart = step.powerPercent;
        const pEnd = step.powerPercentEnd ?? pStart;

        const yStart = maxPower * 100 - pStart * 100;
        const yEnd = maxPower * 100 - pEnd * 100;
        const blockHeight = Math.max(pStart, pEnd) * 100;

        if (pStart === pEnd) {
          return (
            <rect
              key={i}
              x={x}
              y={yStart}
              width={w}
              height={blockHeight}
              fill={color}
              opacity={0.85}
            />
          );
        }
        // Ramp / gradient
        const id = `grad-${i}`;
        return (
          <g key={i}>
            <defs>
              <linearGradient id={id} x1="0" y1={yStart} x2="0" y2={yEnd} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={color} stopOpacity={0.85} />
                <stop offset="100%" stopColor={color} stopOpacity={0.85} />
              </linearGradient>
            </defs>
            <polygon
              points={`${x},${maxPower * 100} ${x},${yStart} ${x + w},${yEnd} ${x + w},${maxPower * 100}`}
              fill={`url(#${id})`}
            />
          </g>
        );
      })}

      {/* Playhead */}
      {elapsedSeconds != null && elapsedSeconds > 0 && elapsedSeconds < totalSec && (
        <line
          x1={elapsedSeconds}
          y1={0}
          x2={elapsedSeconds}
          y2={maxPower * 100}
          stroke="white"
          strokeWidth={Math.max(totalSec / 200, 1)}
          opacity={0.9}
        />
      )}
    </svg>
  );
}
