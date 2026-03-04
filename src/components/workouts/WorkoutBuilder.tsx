"use client";

import { useState, useCallback } from "react";
import { v4 as uuid } from "uuid";
import { Trash2, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { stepLabel, stepColor, totalDuration, estimateTSS, formatDuration } from "@/lib/workout-utils";
import { WorkoutProfileChart } from "./WorkoutProfileChart";
import type { WorkoutStep, WorkoutStepType } from "@/types/workout";

const STEP_TYPES: WorkoutStepType[] = [
  "warmup", "steady", "interval", "recovery", "cooldown", "ramp", "free",
];

interface Props {
  initialSteps?: WorkoutStep[];
  onChange: (steps: WorkoutStep[]) => void;
}

function defaultStep(type: WorkoutStepType): WorkoutStep {
  const base: WorkoutStep = { id: uuid(), type, durationSeconds: 600, powerPercent: 0.65 };
  if (type === "warmup") return { ...base, powerPercent: 0.50, powerPercentEnd: 0.75 };
  if (type === "cooldown") return { ...base, powerPercent: 0.65, powerPercentEnd: 0.45 };
  if (type === "ramp") return { ...base, powerPercent: 0.55, powerPercentEnd: 1.00 };
  if (type === "interval") return { ...base, durationSeconds: 300, powerPercent: 1.05, repeat: 4, offDurationSeconds: 120, offPowerPercent: 0.50 };
  if (type === "recovery") return { ...base, durationSeconds: 120, powerPercent: 0.50 };
  if (type === "steady") return { ...base, powerPercent: 0.88 };
  return base;
}

function parseDurationInput(val: string): number {
  // Accept "mm:ss", "hh:mm:ss" or plain seconds
  const parts = val.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(val) || 0;
}

function durationToInput(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface StepCardProps {
  step: WorkoutStep;
  index: number;
  total: number;
  onUpdate: (id: string, patch: Partial<WorkoutStep>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}

function StepCard({ step, index, total, onUpdate, onDelete, onMove }: StepCardProps) {
  const color = stepColor(step.type);

  return (
    <div
      className="flex gap-3 items-start rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3"
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
    >
      <div className="flex flex-col gap-0.5">
        <button onClick={() => onMove(step.id, -1)} disabled={index === 0} className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30">
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onMove(step.id, 1)} disabled={index === total - 1} className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30">
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {/* Tipo */}
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <select
            value={step.type}
            onChange={(e) => onUpdate(step.id, { type: e.target.value as WorkoutStepType })}
            className="h-8 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs text-zinc-900 dark:text-zinc-100"
          >
            {STEP_TYPES.map((t) => (
              <option key={t} value={t}>{stepLabel(t)}</option>
            ))}
          </select>
        </div>

        {/* Durata */}
        <div className="space-y-1">
          <Label className="text-xs">Durata (mm:ss)</Label>
          <Input
            className="h-8 text-xs"
            defaultValue={durationToInput(step.durationSeconds)}
            onBlur={(e) => onUpdate(step.id, { durationSeconds: parseDurationInput(e.target.value) })}
          />
        </div>

        {/* Potenza */}
        <div className="space-y-1">
          <Label className="text-xs">Potenza (%FTP)</Label>
          <Input
            className="h-8 text-xs"
            type="number"
            min={0}
            max={300}
            value={Math.round(step.powerPercent * 100)}
            onChange={(e) => onUpdate(step.id, { powerPercent: (parseInt(e.target.value) || 0) / 100 })}
          />
        </div>

        {/* Potenza fine (ramp/warmup/cooldown) */}
        {(step.type === "ramp" || step.type === "warmup" || step.type === "cooldown") && (
          <div className="space-y-1">
            <Label className="text-xs">Potenza fine (%FTP)</Label>
            <Input
              className="h-8 text-xs"
              type="number"
              min={0}
              max={300}
              value={Math.round((step.powerPercentEnd ?? step.powerPercent) * 100)}
              onChange={(e) => onUpdate(step.id, { powerPercentEnd: (parseInt(e.target.value) || 0) / 100 })}
            />
          </div>
        )}

        {/* Intervallo: ripetizioni, recupero */}
        {step.type === "interval" && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Ripetizioni</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                min={1}
                max={50}
                value={step.repeat ?? 1}
                onChange={(e) => onUpdate(step.id, { repeat: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Recupero (mm:ss)</Label>
              <Input
                className="h-8 text-xs"
                defaultValue={durationToInput(step.offDurationSeconds ?? 120)}
                onBlur={(e) => onUpdate(step.id, { offDurationSeconds: parseDurationInput(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Potenza recupero (%FTP)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                min={0}
                max={100}
                value={Math.round((step.offPowerPercent ?? 0.5) * 100)}
                onChange={(e) => onUpdate(step.id, { offPowerPercent: (parseInt(e.target.value) || 0) / 100 })}
              />
            </div>
          </>
        )}
      </div>

      <button onClick={() => onDelete(step.id)} className="p-1 text-zinc-400 hover:text-red-500 transition-colors">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function WorkoutBuilder({ initialSteps = [], onChange }: Props) {
  const [steps, setSteps] = useState<WorkoutStep[]>(initialSteps);

  const update = useCallback((updated: WorkoutStep[]) => {
    setSteps(updated);
    onChange(updated);
  }, [onChange]);

  const addStep = (type: WorkoutStepType) => update([...steps, defaultStep(type)]);

  const updateStep = (id: string, patch: Partial<WorkoutStep>) =>
    update(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const deleteStep = (id: string) => update(steps.filter((s) => s.id !== id));

  const moveStep = (id: string, dir: -1 | 1) => {
    const idx = steps.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const next = [...steps];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    update(next);
  };

  const dur = totalDuration(steps);
  const tss = estimateTSS(steps);

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="space-y-2">
        <WorkoutProfileChart steps={steps} height={100} />
        <div className="flex gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <span>Durata: <strong className="text-zinc-900 dark:text-zinc-100">{formatDuration(dur)}</strong></span>
          <span>TSS stimato: <strong className="text-zinc-900 dark:text-zinc-100">~{tss}</strong></span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={i}
            total={steps.length}
            onUpdate={updateStep}
            onDelete={deleteStep}
            onMove={moveStep}
          />
        ))}
      </div>

      {/* Add buttons */}
      <div className="flex flex-wrap gap-2">
        {STEP_TYPES.map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => addStep(type)}
          >
            <Plus className="h-3 w-3" />
            {stepLabel(type)}
          </Button>
        ))}
      </div>
    </div>
  );
}
