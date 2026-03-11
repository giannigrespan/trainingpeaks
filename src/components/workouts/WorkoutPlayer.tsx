"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Pause, Play, Square, Bluetooth, BluetoothOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FTMSClient } from "@/lib/ble/ftms";
import { expandSteps, formatDuration, stepLabel, stepColor } from "@/lib/workout-utils";
import { WorkoutProfileChart } from "./WorkoutProfileChart";
import { calculateNormalizedPower } from "@/lib/cycling-metrics";
import type { BikeData, Workout, WorkoutStep } from "@/types/workout";

interface Props {
  workout: Workout;
  ftp: number;
  onSave: (powerStream: number[], durationSeconds: number, np: number, tss: number) => void;
  onClose: () => void;
}

type Phase = "ready" | "running" | "paused" | "done";

interface LiveState {
  phase: Phase;
  elapsed: number;
  stepIndex: number;
  stepElapsed: number;
  power: number;
  cadence: number;
  speed: number;
  avgPower: number;
  powerHistory: number[];
  powerStream: number[];
}

function calcStepTarget(step: WorkoutStep, stepElapsed: number, ftp: number): number {
  if (step.powerPercentEnd != null && step.type !== "steady") {
    const progress = stepElapsed / step.durationSeconds;
    return Math.round(
      (step.powerPercent + (step.powerPercentEnd - step.powerPercent) * progress) * ftp
    );
  }
  return Math.round(step.powerPercent * ftp);
}

export function WorkoutPlayer({ workout, ftp, onSave, onClose }: Props) {
  const expandedSteps = expandSteps(workout.steps);
  const totalSec = expandedSteps.reduce((s, e) => s + e.durationSeconds, 0);

  const bleRef = useRef<FTMSClient | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [bleConnected, setBleConnected] = useState(false);
  const [bleDeviceName, setBleDeviceName] = useState("");
  const [bleError, setBleError] = useState("");

  const [state, setState] = useState<LiveState>({
    phase: "ready",
    elapsed: 0,
    stepIndex: 0,
    stepElapsed: 0,
    power: 0,
    cadence: 0,
    speed: 0,
    avgPower: 0,
    powerHistory: [],
    powerStream: [],
  });

  const onBleData = useCallback((data: BikeData) => {
    setState((prev) => ({ ...prev, power: data.instantPower, cadence: data.cadence, speed: data.speed }));
  }, []);

  async function connectBle() {
    setBleError("");
    const client = new FTMSClient();
    try {
      await client.connect();
      client.onData(onBleData);
      client.onDisconnect(() => setBleConnected(false));
      bleRef.current = client;
      setBleConnected(true);
      setBleDeviceName(client.deviceName);
    } catch (e) {
      setBleError((e as Error).message);
    }
  }

  async function disconnectBle() {
    await bleRef.current?.disconnect();
    bleRef.current = null;
    setBleConnected(false);
  }

  const tick = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "running") return prev;

      const newElapsed = prev.elapsed + 1;
      const newPowerStream = [...prev.powerStream, prev.power];
      const newHistory = [...prev.powerHistory, prev.power].slice(-60);
      const avgPower = newPowerStream.length > 0
        ? Math.round(newPowerStream.reduce((a, b) => a + b, 0) / newPowerStream.length)
        : 0;

      let { stepIndex, stepElapsed } = prev;
      stepElapsed += 1;
      while (stepIndex < expandedSteps.length && stepElapsed >= expandedSteps[stepIndex].durationSeconds) {
        stepElapsed -= expandedSteps[stepIndex].durationSeconds;
        stepIndex++;
      }

      if (stepIndex >= expandedSteps.length || newElapsed >= totalSec) {
        bleRef.current?.stop().catch(() => {});
        return { ...prev, phase: "done", elapsed: totalSec, powerStream: newPowerStream, avgPower };
      }

      const currentStep = expandedSteps[stepIndex];
      const targetWatts = calcStepTarget(currentStep, stepElapsed, ftp);
      bleRef.current?.setTargetPower(targetWatts).catch(() => {});

      return {
        ...prev,
        elapsed: newElapsed,
        stepIndex,
        stepElapsed,
        powerStream: newPowerStream,
        powerHistory: newHistory,
        avgPower,
      };
    });
  }, [expandedSteps, ftp, totalSec]);

  function startWorkout(withBle = false) {
    if (!withBle && bleRef.current) {
      bleRef.current.start().catch(() => {});
    }
    setState((prev) => ({ ...prev, phase: "running" }));
  }

  function pause() {
    bleRef.current?.stop().catch(() => {});
    setState((prev) => ({ ...prev, phase: "paused" }));
  }

  function resume() {
    bleRef.current?.start().catch(() => {});
    setState((prev) => ({ ...prev, phase: "running" }));
  }

  function stop() {
    bleRef.current?.stop().catch(() => {});
    setState((prev) => ({ ...prev, phase: "done" }));
  }

  useEffect(() => {
    if (state.phase === "running") {
      timerRef.current = setInterval(tick, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.phase, tick]);

  useEffect(() => {
    return () => { bleRef.current?.disconnect().catch(() => {}); };
  }, []);

  function handleSave() {
    const np = calculateNormalizedPower(state.powerStream);
    const if_ = np / ftp;
    const tss = Math.round((state.elapsed * np * if_) / (ftp * 3600) * 100);
    onSave(state.powerStream, state.elapsed, np, tss);
  }

  const currentStep = expandedSteps[state.stepIndex];
  const nextStep = expandedSteps[state.stepIndex + 1];
  const targetWatts = currentStep ? calcStepTarget(currentStep, state.stepElapsed, ftp) : 0;
  const stepRemaining = currentStep ? currentStep.durationSeconds - state.stepElapsed : 0;
  const progress = totalSec > 0 ? (state.elapsed / totalSec) * 100 : 0;
  const stepProgress = currentStep ? (state.stepElapsed / currentStep.durationSeconds) * 100 : 0;
  const zoneColor = currentStep ? stepColor(currentStep.type) : "#6366f1";

  /* ── DONE ─────────────────────────────────────── */
  if (state.phase === "done") {
    const np = calculateNormalizedPower(state.powerStream);
    const tss = Math.round((state.elapsed * np * (np / ftp)) / (ftp * 3600) * 100);
    return (
      <div className="rounded-2xl bg-zinc-900 p-10 flex flex-col items-center gap-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Workout completato!</h2>
          <p className="text-zinc-400 text-sm mt-1">{workout.name}</p>
        </div>
        <div className="grid grid-cols-4 gap-6 w-full max-w-lg">
          <StatCard label="NP" value={`${np}W`} />
          <StatCard label="TSS" value={tss.toString()} />
          <StatCard label="Durata" value={formatDuration(state.elapsed)} />
          <StatCard label="Avg Power" value={`${state.avgPower}W`} />
        </div>
        <div className="flex gap-3">
          <Button size="lg" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
            Salva come attività
          </Button>
          <Button size="lg" variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white">
            Chiudi
          </Button>
        </div>
      </div>
    );
  }

  /* ── READY ─────────────────────────────────────── */
  if (state.phase === "ready") {
    return (
      <div className="rounded-2xl bg-zinc-900 overflow-hidden">
        <WorkoutProfileChart steps={workout.steps} height={180} />
        <div className="p-6 space-y-5">
          <div className="flex items-baseline gap-3">
            <p className="text-zinc-400 text-sm">{formatDuration(totalSec)}</p>
            <span className="text-zinc-600">·</span>
            <p className="text-zinc-400 text-sm">TSS stimato: ~{workout.estimatedTSS}</p>
          </div>

          <div className="space-y-3">
            {!bleConnected ? (
              <div className="space-y-2">
                <button
                  onClick={connectBle}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-3 text-sm font-medium transition-colors"
                >
                  <Bluetooth className="h-4 w-4 text-blue-400" />
                  Connetti Rullo Bluetooth
                </button>
                {bleError && <p className="text-xs text-red-400 text-center">{bleError}</p>}
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-emerald-800 bg-emerald-900/30 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <Bluetooth className="h-4 w-4" />
                  {bleDeviceName}
                </div>
                <button onClick={disconnectBle} className="text-zinc-500 hover:text-zinc-300">
                  <BluetoothOff className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              onClick={() => startWorkout(bleConnected)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white py-4 text-base font-semibold transition-colors"
            >
              <Play className="h-5 w-5" />
              {bleConnected ? "Avvia con rullo" : "Avvia (simulazione)"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── RUNNING / PAUSED ──────────────────────────── */
  const powerDiff = state.power - targetWatts;

  return (
    <div className="rounded-2xl bg-zinc-900 overflow-hidden">
      {/* Chart + progress */}
      <WorkoutProfileChart steps={workout.steps} height={160} elapsedSeconds={state.elapsed} />
      <div className="px-4 pt-2 pb-1">
        <div className="flex justify-between text-xs text-zinc-500 mb-1">
          <span>{formatDuration(state.elapsed)}</span>
          <span>{formatDuration(totalSec)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-700">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Current step */}
      {currentStep && (
        <div className="mx-4 my-3 rounded-xl bg-zinc-800" style={{ borderLeft: `4px solid ${zoneColor}` }}>
          {/* Step header */}
          <div className="flex justify-between items-center px-5 pt-4 pb-2">
            <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
              {stepLabel(currentStep.type)}
            </span>
            <span className="text-2xl font-mono font-bold text-white tabular-nums">
              {formatDuration(stepRemaining)}
            </span>
          </div>

          {/* Step progress bar */}
          <div className="mx-5 h-1.5 rounded-full bg-zinc-700 mb-4">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${stepProgress}%`, backgroundColor: zoneColor }}
            />
          </div>

          {/* Power numbers */}
          <div className="grid grid-cols-3 gap-0 divide-x divide-zinc-700 pb-4">
            <div className="text-center px-4">
              <p className="text-xs text-zinc-500 mb-1">Target</p>
              <p className="text-6xl font-black tabular-nums leading-none" style={{ color: zoneColor }}>
                {targetWatts}
              </p>
              <p className="text-xs text-zinc-500 mt-1">W · {Math.round(currentStep.powerPercent * 100)}% FTP</p>
            </div>
            <div className="text-center px-4">
              <p className="text-xs text-zinc-500 mb-1">Attuale</p>
              <p className={`text-6xl font-black tabular-nums leading-none ${bleConnected ? "text-white" : "text-zinc-600"}`}>
                {bleConnected ? state.power : "—"}
              </p>
              <p className="text-xs mt-1 h-4">
                {bleConnected && state.power > 0 && (
                  <span className={`font-semibold ${Math.abs(powerDiff) <= 10 ? "text-zinc-400" : powerDiff > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {powerDiff > 0 ? "+" : ""}{powerDiff}W
                  </span>
                )}
              </p>
            </div>
            <div className="text-center px-4">
              <p className="text-xs text-zinc-500 mb-1">Media</p>
              <p className="text-6xl font-black tabular-nums leading-none text-zinc-300">
                {state.avgPower || "—"}
              </p>
              <p className="text-xs text-zinc-500 mt-1">W</p>
            </div>
          </div>

          {/* Cadence / speed */}
          {bleConnected && (
            <div className="flex justify-center gap-8 text-sm text-zinc-400 pb-4">
              <span>Cadenza: <strong className="text-zinc-200">{state.cadence} rpm</strong></span>
              <span>Velocità: <strong className="text-zinc-200">{state.speed.toFixed(1)} km/h</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Next step */}
      <div className="px-4 pb-3 min-h-[24px]">
        {nextStep && (
          <p className="text-xs text-zinc-500 text-center">
            Prossimo: <span className="text-zinc-300 font-medium">{stepLabel(nextStep.type)}</span>
            {" · "}{Math.round(nextStep.powerPercent * 100)}% FTP
            {" · "}{formatDuration(nextStep.durationSeconds)}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3 px-4 pb-5 justify-center">
        {state.phase === "running" ? (
          <button
            onClick={pause}
            className="flex items-center gap-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white px-8 py-3 font-semibold transition-colors"
          >
            <Pause className="h-5 w-5" /> Pausa
          </button>
        ) : (
          <button
            onClick={resume}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 font-semibold transition-colors"
          >
            <Play className="h-5 w-5" /> Riprendi
          </button>
        )}
        <button
          onClick={stop}
          className="flex items-center gap-2 rounded-xl border border-rose-700 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 px-8 py-3 font-semibold transition-colors"
        >
          <Square className="h-5 w-5" /> Termina
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-800 p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
