"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  BarChart,
  Bar,
  Cell,
  Brush,
} from "recharts";
import type { PowerCurvePoint } from "@/types";

interface StreamData {
  power: number[];
  heartRate: number[];
  cadence: number[];
  speed: number[];
  altitude: number[];
  laps?: number[];
  samplingRate?: number;
}

const SERIES_CONFIG = [
  { key: "power",     label: "Potenza",      unit: "W",   color: "#8B5CF6" },
  { key: "heartRate", label: "FC",           unit: "bpm", color: "#EF4444" },
  { key: "speed",     label: "Velocità",     unit: "km/h",color: "#3B82F6" },
  { key: "cadence",   label: "Cadenza",      unit: "rpm", color: "#F59E0B" },
  { key: "altitude",  label: "Altitudine",   unit: "m",   color: "#6B7280" },
  { key: "tss",       label: "TSS Cumulato", unit: "",    color: "#10B981" },
] as const;

type SeriesKey = (typeof SERIES_CONFIG)[number]["key"];
type ChartPoint = { time: number } & Record<SeriesKey, number>;

function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    setIsDark(el.classList.contains("dark"));
    const obs = new MutationObserver(() =>
      setIsDark(el.classList.contains("dark"))
    );
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getYAxisId(key: SeriesKey, powerActive: boolean, activeSeries: SeriesKey[]): string {
  if (key === "power") return "left";
  if (key === "tss") return "right-tss";
  if (!powerActive) {
    const others = activeSeries.filter((k) => k !== "power" && k !== "tss");
    if (others[0] === key) return "left";
  }
  return `right-${key}`;
}

function computeNP(powers: number[], windowSamples: number): number {
  const w = Math.max(1, windowSamples);
  if (powers.length < w) {
    const valid = powers.filter((p) => p > 0);
    return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  }
  const rolling: number[] = [];
  for (let i = w - 1; i < powers.length; i++) {
    let sum = 0;
    for (let j = i - w + 1; j <= i; j++) sum += powers[j];
    rolling.push(sum / w);
  }
  const fourth = rolling.reduce((s, v) => s + v ** 4, 0) / rolling.length;
  return Math.round(fourth ** 0.25);
}

export function ActivityCharts({
  streams,
  laps,
  ftp,
}: {
  streams: StreamData;
  laps?: number[];
  ftp?: number;
}) {
  const isDark = useDarkMode();
  const [active, setActive] = useState<Set<SeriesKey>>(new Set<SeriesKey>(["power"]));
  const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const lapMarkers = laps ?? [];
  const samplingRate = streams.samplingRate ?? 1;
  const step = Math.max(1, Math.floor((streams.power.length || 1) / 600));

  const gridColor  = isDark ? "#374151" : "#f0f0f0";
  const brushFill  = isDark ? "#1f2937" : "#f8fafc";
  const brushStroke= isDark ? "#374151" : "#e2e8f0";
  const altFill    = isDark ? "rgba(107,114,128,0.30)" : "rgba(107,114,128,0.15)";
  const axisColor  = isDark ? "#9ca3af" : "#6b7280";

  const rawData = useMemo<ChartPoint[]>(() => {
    const data: ChartPoint[] = [];
    const ftpVal = ftp ?? 0;
    const dt = step * samplingRate;
    let cumTSS = 0;
    for (let i = 0; i < streams.power.length; i += step) {
      const pw = streams.power[i] || 0;
      if (ftpVal > 0) cumTSS += (pw / ftpVal) ** 2 * dt / 3600 * 100;
      data.push({
        time: i * samplingRate,
        power: pw,
        heartRate: streams.heartRate[i] || 0,
        cadence: streams.cadence[i] || 0,
        speed: Math.round((streams.speed[i] || 0) * 10) / 10,
        altitude: Math.round(streams.altitude[i] || 0),
        tss: Math.round(cumTSS * 10) / 10,
      });
    }
    return data;
  }, [streams, step, samplingRate, ftp]);

  const selectionStats = useMemo(() => {
    if (!brushRange) return null;
    const { startIndex, endIndex } = brushRange;
    const slice = rawData.slice(startIndex, endIndex + 1);
    if (slice.length < 2) return null;
    const dt = step * samplingRate;
    const duration = slice.length * dt;
    const powers = slice.map((p) => p.power);
    const validPowers = powers.filter((p) => p > 0);
    const avgPower = validPowers.length
      ? Math.round(validPowers.reduce((a, b) => a + b, 0) / validPowers.length)
      : 0;
    const npWin = Math.max(1, Math.round(30 / (step * samplingRate)));
    const np = computeNP(powers, npWin);
    const cadences = slice.map((p) => p.cadence).filter((c) => c > 0);
    const avgCadence = cadences.length
      ? Math.round(cadences.reduce((a, b) => a + b, 0) / cadences.length)
      : 0;
    let ascent = 0;
    for (let i = 1; i < slice.length; i++) {
      const diff = slice[i].altitude - slice[i - 1].altitude;
      if (diff > 0) ascent += diff;
    }
    const vam = duration > 0 ? Math.round((ascent / duration) * 3600) : 0;
    const kj = Math.round((avgPower * duration) / 1000);
    const if_ = ftp && ftp > 0 && np > 0 ? Math.round((np / ftp) * 100) / 100 : null;
    const tss =
      ftp && ftp > 0 && if_ != null
        ? Math.round(((duration * np * if_) / (ftp * 3600)) * 100)
        : null;
    return { duration, avgPower, np, avgCadence, vam, kj, tss };
  }, [brushRange, rawData, step, samplingRate, ftp]);

  const toggle = (key: SeriesKey) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const activeSeries = SERIES_CONFIG.filter((s) => active.has(s.key));
  const powerActive = active.has("power");

  const rightAxisSeries = activeSeries.filter((s) => {
    if (s.key === "power") return false;
    if (s.key === "tss") return true;
    if (!powerActive) {
      const others = activeSeries.filter((a) => a.key !== "power" && a.key !== "tss");
      if (others[0]?.key === s.key) return false;
    }
    return true;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = ({ active: on, payload, label }: any) => {
    if (!on || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded p-2 text-xs shadow">
        <div className="font-medium mb-1 text-gray-900 dark:text-gray-100">{formatTime(label as number)}</div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any) => {
          const cfg = SERIES_CONFIG.find((s) => s.key === entry.dataKey);
          if (!cfg) return null;
          return (
            <div key={entry.dataKey} style={{ color: cfg.color }}>
              {cfg.label}: {entry.value} {cfg.unit}
            </div>
          );
        })}
      </div>
    );
  };

  const leftAxisSeries = powerActive
    ? SERIES_CONFIG.find((s) => s.key === "power")!
    : activeSeries.find((s) => s.key !== "tss") ?? activeSeries[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBrushChange = (range: any) => {
    if (
      range?.startIndex != null &&
      range?.endIndex != null &&
      range.startIndex !== range.endIndex
    ) {
      setBrushRange({ startIndex: range.startIndex, endIndex: range.endIndex });
    } else {
      setBrushRange(null);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Series toggles */}
      <div className="flex flex-wrap gap-2">
        {SERIES_CONFIG.map(({ key, label, color }) => {
          if (key === "tss" && !ftp) return null;
          const isActive = active.has(key);
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? "text-white border-transparent"
                  : "bg-white dark:bg-zinc-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-zinc-600 hover:border-gray-400 dark:hover:border-zinc-400"
              }`}
              style={isActive ? { backgroundColor: color, borderColor: color } : {}}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 items-start">
        <div className="flex-1 min-w-0">
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart data={rawData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: axisColor }}
                tickFormatter={formatTime}
              />

              <YAxis
                yAxisId="left"
                unit={leftAxisSeries?.unit ?? ""}
                tick={{ fontSize: 11, fill: axisColor }}
                domain={["auto", "auto"]}
                width={45}
              />

              {rightAxisSeries.map(({ key, unit }) => (
                <YAxis
                  key={key}
                  yAxisId={`right-${key}`}
                  orientation="right"
                  unit={unit}
                  tick={{ fontSize: 11, fill: axisColor }}
                  domain={key === "tss" ? [0, "auto"] : ["auto", "auto"]}
                  width={40}
                />
              ))}

              <Tooltip content={renderTooltip} />

              {activeSeries.map(({ key, color }) =>
                key === "altitude" ? (
                  <Area
                    key={key}
                    yAxisId={getYAxisId(key, powerActive, activeSeries.map((s) => s.key))}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={1.5}
                    fill={altFill}
                    dot={false}
                    isAnimationActive={false}
                  />
                ) : (
                  <Line
                    key={key}
                    yAxisId={getYAxisId(key, powerActive, activeSeries.map((s) => s.key))}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                )
              )}

              {lapMarkers.map((x, i) => (
                <ReferenceLine
                  key={i}
                  yAxisId="left"
                  x={x}
                  stroke={isDark ? "#64748b" : "#94A3B8"}
                  strokeDasharray="4 2"
                  label={{ value: `G${i + 1}`, position: "top", fontSize: 10, fill: isDark ? "#64748b" : "#94A3B8" }}
                />
              ))}

              <Brush
                dataKey="time"
                height={28}
                stroke={brushStroke}
                fill={brushFill}
                travellerWidth={8}
                tickFormatter={formatTime}
                onChange={handleBrushChange}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {selectionStats && (
          <div className="w-44 shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Selezione
            </p>
            <StatRow label="Durata" value={formatTime(selectionStats.duration)} />
            <StatRow label="Potenza avg" value={`${selectionStats.avgPower} W`} />
            <StatRow label="NP" value={`${selectionStats.np} W`} />
            <StatRow label="Cadenza" value={`${selectionStats.avgCadence} rpm`} />
            <StatRow label="VAM" value={`${selectionStats.vam} m/h`} />
            <StatRow label="kJ" value={`${selectionStats.kj}`} />
            {selectionStats.tss != null && (
              <StatRow label="TSS" value={`${selectionStats.tss}`} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-1 text-xs">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="font-medium text-zinc-800 dark:text-zinc-100 tabular-nums">{value}</span>
    </div>
  );
}

// ─── Lap Analysis Chart ──────────────────────────────────────────────────────

interface LapMetric {
  lap: string;
  avgPower: number;
  avgCadence: number;
  duration: number;
}

function avgNonZero(arr: number[]): number {
  const vals = arr.filter((v) => v > 0);
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function LapAnalysisChart({
  streams,
  laps,
}: {
  streams: StreamData;
  laps: number[];
}) {
  const isDark = useDarkMode();
  const lapData = useMemo<LapMetric[]>(() => {
    const sr = streams.samplingRate ?? 1;
    const totalSec = streams.power.length * sr;
    const boundaries = [0, ...laps, totalSec];
    return boundaries.slice(0, -1).map((start, i) => {
      const end = boundaries[i + 1];
      const si = Math.round(start / sr);
      const ei = Math.min(Math.round(end / sr), streams.power.length);
      return {
        lap: `G${i + 1}`,
        avgPower: avgNonZero(streams.power.slice(si, ei)),
        avgCadence: avgNonZero(streams.cadence.slice(si, ei)),
        duration: Math.round(end - start),
      };
    });
  }, [streams, laps]);

  if (!lapData.length) return null;

  const gridColor = isDark ? "#374151" : "#f0f0f0";
  const axisColor = isDark ? "#9ca3af" : "#6b7280";

  const miniCharts: {
    label: string;
    key: keyof LapMetric;
    unit: string;
    color: string;
    formatter?: (v: number) => string;
  }[] = [
    { label: "Durata", key: "duration", unit: "", color: "#3B82F6", formatter: fmtDuration },
    { label: "Potenza Media", key: "avgPower", unit: "W", color: "#8B5CF6" },
    { label: "Cadenza Media", key: "avgCadence", unit: "rpm", color: "#F59E0B" },
  ];

  return (
    <div className="space-y-4">
      {miniCharts.map(({ label, key, unit, color, formatter }) => (
        <div key={key}>
          <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            {label}
          </p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={lapData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="lap" tick={{ fontSize: 11, fill: axisColor }} />
              <YAxis
                tick={{ fontSize: 11, fill: axisColor }}
                unit={unit}
                width={key === "duration" ? 42 : 40}
                tickFormatter={formatter}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "#1f2937" : "#ffffff",
                  borderColor: isDark ? "#374151" : "#e5e7eb",
                  color: isDark ? "#f3f4f6" : "#111827",
                  fontSize: 12,
                }}
                formatter={(val: number | undefined) =>
                  val == null
                    ? ["—", label]
                    : formatter
                    ? [formatter(val), label]
                    : [`${val}${unit}`, label]
                }
              />
              <Bar dataKey={key as string} fill={color} radius={[4, 4, 0, 0]}>
                {lapData.map((_, idx) => (
                  <Cell key={idx} fill={color} fillOpacity={0.85 - idx * 0.03} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}

// ─── Power Curve Chart ────────────────────────────────────────────────────────

const DURATION_LABELS: Record<number, string> = {
  1: "1s",
  5: "5s",
  10: "10s",
  30: "30s",
  60: "1min",
  300: "5min",
  600: "10min",
  1200: "20min",
  3600: "60min",
};

export function PowerCurveChart({ powerCurve }: { powerCurve: PowerCurvePoint[] }) {
  const isDark = useDarkMode();
  const gridColor = isDark ? "#374151" : "#f0f0f0";
  const axisColor = isDark ? "#9ca3af" : "#6b7280";

  const data = powerCurve.map((p) => ({
    label: DURATION_LABELS[p.duration] || `${p.duration}s`,
    power: p.power,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} />
        <YAxis tick={{ fontSize: 11, fill: axisColor }} unit="W" domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? "#1f2937" : "#ffffff",
            borderColor: isDark ? "#374151" : "#e5e7eb",
            color: isDark ? "#f3f4f6" : "#111827",
            fontSize: 12,
          }}
          formatter={(val: number | undefined) =>
            val != null ? [`${val}W`, "Best Power"] : ["—", "Best Power"]
          }
        />
        <Line
          type="monotone"
          dataKey="power"
          stroke="#8B5CF6"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#8B5CF6", strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
