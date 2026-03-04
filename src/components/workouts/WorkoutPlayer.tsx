"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Pause, Play, Square, Bluetooth, BluetoothOff } from "lucide-react";
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
  elapsed: number;           // total seconds elapsed
  stepIndex: number;         // index in expandedSteps
  stepElapsed: number;       // seconds elapsed in current step
  power: number;
  cadence: number;
  speed: number;
  avgPower: number;
  powerHistory: number[];    // last 60s of power samples
  powerStream: number[];     // full recording (1/s)
}

function calcStepTarget(step: WorkoutStep, stepElapsed: number, ftp: number): number {
  if (step.powerPercentEnd != null && step.type !== "steady") {
    // Linear interpolation for ramps
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

  // Receive BLE data
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

  // Tick every second
  const tick = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "running") return prev;

      const newElapsed = prev.elapsed + 1;
      const newPowerStream = [...prev.powerStream, prev.power];
      const newHistory = [...prev.powerHistory, prev.power].slice(-60);
      const avgPower = newPowerStream.length > 0
        ? Math.round(newPowerStream.reduce((a, b) => a + b, 0) / newPowerStream.length)
        : 0;

      // Advance step
      let { stepIndex, stepElapsed } = prev;
      stepElapsed += 1;
      while (stepIndex < expandedSteps.length && stepElapsed >= expandedSteps[stepIndex].durationSeconds) {
        stepElapsed -= expandedSteps[stepIndex].durationSeconds;
        stepIndex++;
      }

      if (stepIndex >= expandedSteps.length || newElapsed >= totalSec) {
        // Done
        bleRef.current?.stop().catch(() => {});
        return { ...prev, phase: "done", elapsed: totalSec, powerStream: newPowerStream, avgPower };
      }

      // Send ERG target to trainer
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

  // Cleanup BLE on unmount
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
  const stepRemaining = currentStep
    ? currentStep.durationSeconds - state.stepElapsed
    : 0;
  const progress = totalSec > 0 ? (state.elapsed / totalSec) * 100 : 0;
  const stepProgress = currentStep
    ? (state.stepElapsed / currentStep.durationSeconds) * 100
    : 0;

  /* ── DONE ─────────────────────────────────────── */
  if (state.phase === "done") {
    const np = calculateNormalizedPower(state.powerStream);
    const tss = Math.round((state.elapsed * np * (np / ftp)) / (ftp * 3600) * 100);
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="text-4xl">✅</div>
        <div>
          <h2 className="text-xl font-bold">Workout completato!</h2>
          <p className="text-zinc-500 text-sm mt-1">{workout.name}</p>
        </div>
        <div className="grid grid-cols-3 gap-6 text-center">
          <Stat label="NP" value={`${np}W`} />
          <Stat label="TSS" value={tss.toString()} />
          <Stat label="Durata" value={formatDuration(state.elapsed)} />
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSave}>Salva come attività</Button>
          <Button variant="outline" onClick={onClose}>Chiudi</Button>
        </div>
      </div>
    );
  }

  /* ── READY ─────────────────────────────────────── */
  if (state.phase === "ready") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">{workout.name}</h2>
          <p className="text-sm text-zinc-500">{formatDuration(totalSec)} · TSS ~{workout.estimatedTSS}</p>
        </div>
        <WorkoutProfileChart steps={workout.steps} height={100} />

        <div className="space-y-3">
          {/* BLE connection */}
          {!bleConnected ? (
            <div className="space-y-2">
              <Button className="w-full gap-2" onClick={connectBle}>
                <Bluetooth className="h-4 w-4" />
                Connetti Rullo Bluetooth
              </Button>
              {bleError && <p className="text-xs text-red-500">{bleError}</p>}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <Bluetooth className="h-4 w-4" />
                {bleDeviceName}
              </div>
              <button onClick={disconnectBle} className="text-zinc-400 hover:text-zinc-600">
                <BluetoothOff className="h-4 w-4" />
              </button>
            </div>
          )}

          <Button
            className="w-full gap-2"
            onClick={() => startWorkout(bleConnected)}
          >
            <Play className="h-4 w-4" />
            {bleConnected ? "Avvia con rullo" : "Avvia (simulazione)"}
          </Button>
        </div>
      </div>
    );
  }

  /* ── RUNNING / PAUSED ──────────────────────────── */
  const powerDiff = state.power - targetWatts;

  return (
    <div className="space-y-4">
      {/* Profile with playhead */}
      <WorkoutProfileChart steps={workout.steps} height={80} elapsedSeconds={state.elapsed} />

      {/* Total progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{formatDuration(state.elapsed)}</span>
          <span>{formatDuration(totalSec)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Current step */}
      {currentStep && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ borderLeft: `4px solid ${stepColor(currentStep.type)}`, background: "rgba(0,0,0,0.03)" }}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{stepLabel(currentStep.type)}</span>
            <span className="text-sm font-mono">{formatDuration(stepRemaining)} rimanenti</span>
          </div>
          <div className="h-1 rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${stepProgress}%`, backgroundColor: stepColor(currentStep.type) }}
            />
          </div>

          {/* Power numbers */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="text-center">
              <p className="text-xs text-zinc-400 mb-0.5">Target</p>
              <p className="text-3xl font-bold tabular-nums">{targetWatts}W</p>
              <p className="text-xs text-zinc-400">{Math.round(currentStep.powerPercent * 100)}% FTP</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-400 mb-0.5">Attuale</p>
              <p className={`text-3xl font-bold tabular-nums ${bleConnected ? "" : "text-zinc-400"}`}>
                {bleConnected ? state.power : "—"}W
              </p>
              {bleConnected && state.power > 0 && (
                <p className={`text-xs font-medium ${powerDiff > 10 ? "text-green-500" : powerDiff < -10 ? "text-red-500" : "text-zinc-400"}`}>
                  {powerDiff > 0 ? "+" : ""}{powerDiff}W
                </p>
              )}
            </div>
          </div>

          {/* Cadence / speed */}
          {bleConnected && (
            <div className="flex justify-center gap-6 text-sm text-zinc-500">
              <span>Cadenza: <strong>{state.cadence} rpm</strong></span>
              <span>Velocità: <strong>{state.speed.toFixed(1)} km/h</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Next step */}
      {nextStep && (
        <p className="text-xs text-zinc-400 text-center">
          Prossimo: <strong>{stepLabel(nextStep.type)}</strong> · {Math.round(nextStep.powerPercent * 100)}% FTP · {formatDuration(nextStep.durationSeconds)}
        </p>
      )}

      {/* Controls */}
      <div className="flex gap-2 justify-center">
        {state.phase === "running" ? (
          <Button variant="outline" onClick={pause} className="gap-2">
            <Pause className="h-4 w-4" /> Pausa
          </Button>
        ) : (
          <Button onClick={resume} className="gap-2">
            <Play className="h-4 w-4" /> Riprendi
          </Button>
        )}
        <Button variant="outline" onClick={stop} className="gap-2 text-red-500 hover:text-red-600">
          <Square className="h-4 w-4" /> Termina
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
