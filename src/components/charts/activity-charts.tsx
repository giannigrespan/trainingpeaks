"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import type { PowerCurvePoint } from "@/types";

interface StreamData {
  power: number[];
  heartRate: number[];
  cadence: number[];
  speed: number[];
  altitude: number[];
  laps?: number[];
}

const SERIES_CONFIG = [
  { key: "power",     label: "Potenza",   unit: "W",    color: "#8B5CF6" },
  { key: "heartRate", label: "FC",        unit: "bpm",  color: "#EF4444" },
  { key: "speed",     label: "Velocità",  unit: "km/h", color: "#3B82F6" },
  { key: "cadence",   label: "Cadenza",   unit: "rpm",  color: "#F59E0B" },
  { key: "altitude",  label: "Altitudine",unit: "m",    color: "#6B7280" },
] as const;

type SeriesKey = (typeof SERIES_CONFIG)[number]["key"];

type ChartPoint = { time: number } & Record<SeriesKey, number>;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ActivityCharts({ streams, laps }: { streams: StreamData; laps?: number[] }) {
  const [active, setActive] = useState<Set<SeriesKey>>(new Set<SeriesKey>(["power"]));
  const lapMarkers = laps ?? [];

  const step = Math.max(1, Math.floor((streams.power.length || 1) / 500));

  const rawData = useMemo<ChartPoint[]>(() => {
    const data: ChartPoint[] = [];
    for (let i = 0; i < streams.power.length; i += step) {
      data.push({
        time: i,
        power:     streams.power[i]     || 0,
        heartRate: streams.heartRate[i] || 0,
        cadence:   streams.cadence[i]   || 0,
        speed:     Math.round((streams.speed[i] || 0) * 10) / 10,
        altitude:  Math.round(streams.altitude[i] || 0),
      });
    }
    return data;
  }, [streams, step]);

  const maxValues = useMemo(() => {
    const result = {} as Record<SeriesKey, number>;
    for (const { key } of SERIES_CONFIG) {
      const vals = (streams[key as keyof StreamData] as number[]).filter((v) => v > 0);
      result[key] = vals.length > 0 ? Math.max(...vals) : 1;
    }
    return result;
  }, [streams]);

  const multiMode = active.size > 1;

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!multiMode) return rawData;
    return rawData.map((d) => {
      const norm = { time: d.time } as ChartPoint;
      for (const { key } of SERIES_CONFIG) {
        norm[key] = maxValues[key] > 0
          ? Math.round((d[key] / maxValues[key]) * 1000) / 10
          : 0;
      }
      return norm;
    });
  }, [rawData, multiMode, maxValues]);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = ({ active: on, payload, label }: any) => {
    if (!on || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded p-2 text-xs shadow">
        <div className="font-medium mb-1">{formatTime(label as number)}</div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any) => {
          const cfg = SERIES_CONFIG.find((s) => s.key === entry.dataKey);
          if (!cfg) return null;
          const actual = multiMode
            ? Math.round((entry.value * maxValues[entry.dataKey as SeriesKey]) / 100 * 10) / 10
            : entry.value;
          return (
            <div key={entry.dataKey} style={{ color: cfg.color }}>
              {cfg.label}: {actual} {cfg.unit}
            </div>
          );
        })}
      </div>
    );
  };

  const singleSeries = SERIES_CONFIG.find((s) => active.has(s.key));
  const yAxisUnit = multiMode ? "%" : (singleSeries?.unit ?? "");

  return (
    <div className="w-full space-y-3">
      {/* Series toggles */}
      <div className="flex flex-wrap gap-2">
        {SERIES_CONFIG.map(({ key, label, color }) => {
          const isActive = active.has(key);
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? "text-white border-transparent"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
              style={isActive ? { backgroundColor: color, borderColor: color } : {}}
            >
              {label}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} tickFormatter={formatTime} />
          <YAxis
            tick={{ fontSize: 11 }}
            unit={yAxisUnit}
            domain={multiMode ? [0, 100] : ["auto", "auto"]}
          />
          <Tooltip content={renderTooltip} />
          {SERIES_CONFIG.filter((s) => active.has(s.key)).map(({ key, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={1.5}
              dot={false}
            />
          ))}
          {lapMarkers.map((x, i) => (
            <ReferenceLine
              key={i}
              x={x}
              stroke="#94A3B8"
              strokeDasharray="4 2"
              label={{ value: `G${i + 1}`, position: "top", fontSize: 10, fill: "#94A3B8" }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const POWER_CURVE_COLORS = [
  "#EF4444",
  "#F59E0B",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#3B82F6",
  "#8B5CF6",
  "#8B5CF6",
  "#6B7280",
];

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
  const data = powerCurve.map((p) => ({
    label: DURATION_LABELS[p.duration] || `${p.duration}s`,
    power: p.power,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit="W" />
        <Tooltip formatter={(val) => [`${val}W`, "Best Power"]} />
        <Bar dataKey="power" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={POWER_CURVE_COLORS[index] || "#8B5CF6"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
