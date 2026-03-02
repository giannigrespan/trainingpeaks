"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PowerCurvePoint } from "@/types";

interface StreamData {
  power: number[];
  heartRate: number[];
  cadence: number[];
  speed: number[];
  altitude: number[];
  laps?: number[];
}

const COLORS = {
  power: "#8B5CF6",
  heartRate: "#EF4444",
  speed: "#3B82F6",
  cadence: "#F59E0B",
  altitude: "#6B7280",
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ActivityCharts({ streams, laps }: { streams: StreamData; laps?: number[] }) {
  // Lap markers: elapsed seconds map directly to chart x (time = original index ≈ elapsed seconds)
  const lapMarkers = laps ?? [];

  // Sample data to reduce rendering load (every 5th point)
  const step = Math.max(1, Math.floor(streams.power.length / 500));
  const chartData = [];
  for (let i = 0; i < streams.power.length; i += step) {
    chartData.push({
      time: i,
      power: streams.power[i] || 0,
      heartRate: streams.heartRate[i] || 0,
      cadence: streams.cadence[i] || 0,
      speed: Math.round((streams.speed[i] || 0) * 10) / 10,
      altitude: Math.round(streams.altitude[i] || 0),
    });
  }

  return (
    <Tabs defaultValue="power" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="power">Potenza</TabsTrigger>
        <TabsTrigger value="hr">FC</TabsTrigger>
        <TabsTrigger value="speed">Velocità</TabsTrigger>
        <TabsTrigger value="altitude">Altimetria</TabsTrigger>
      </TabsList>

      <TabsContent value="power">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} tickFormatter={formatTime} />
            <YAxis tick={{ fontSize: 11 }} unit="W" />
            <Tooltip labelFormatter={(val) => formatTime(val as number)} formatter={(val) => [`${val}W`, "Potenza"]} />
            <Line type="monotone" dataKey="power" stroke={COLORS.power} strokeWidth={1.5} dot={false} />
            {lapMarkers.map((x, i) => (
              <ReferenceLine key={i} x={x} stroke="#94A3B8" strokeDasharray="4 2" label={{ value: `G${i + 1}`, position: "top", fontSize: 10, fill: "#94A3B8" }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </TabsContent>

      <TabsContent value="hr">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} tickFormatter={formatTime} />
            <YAxis tick={{ fontSize: 11 }} unit="bpm" />
            <Tooltip labelFormatter={(val) => formatTime(val as number)} formatter={(val) => [`${val}bpm`, "FC"]} />
            <Line type="monotone" dataKey="heartRate" stroke={COLORS.heartRate} strokeWidth={1.5} dot={false} />
            {lapMarkers.map((x, i) => (
              <ReferenceLine key={i} x={x} stroke="#94A3B8" strokeDasharray="4 2" label={{ value: `G${i + 1}`, position: "top", fontSize: 10, fill: "#94A3B8" }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </TabsContent>

      <TabsContent value="speed">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} tickFormatter={formatTime} />
            <YAxis tick={{ fontSize: 11 }} unit="km/h" />
            <Tooltip labelFormatter={(val) => formatTime(val as number)} formatter={(val) => [`${val}km/h`, "Velocità"]} />
            <Line type="monotone" dataKey="speed" stroke={COLORS.speed} strokeWidth={1.5} dot={false} />
            {lapMarkers.map((x, i) => (
              <ReferenceLine key={i} x={x} stroke="#94A3B8" strokeDasharray="4 2" label={{ value: `G${i + 1}`, position: "top", fontSize: 10, fill: "#94A3B8" }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </TabsContent>

      <TabsContent value="altitude">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} tickFormatter={formatTime} />
            <YAxis tick={{ fontSize: 11 }} unit="m" />
            <Tooltip labelFormatter={(val) => formatTime(val as number)} formatter={(val) => [`${val}m`, "Quota"]} />
            <Line type="monotone" dataKey="altitude" stroke={COLORS.altitude} strokeWidth={1.5} dot={false} fill="#f3f4f6" />
            {lapMarkers.map((x, i) => (
              <ReferenceLine key={i} x={x} stroke="#94A3B8" strokeDasharray="4 2" label={{ value: `G${i + 1}`, position: "top", fontSize: 10, fill: "#94A3B8" }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </TabsContent>
    </Tabs>
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

export function PowerCurveChart({
  powerCurve,
}: {
  powerCurve: PowerCurvePoint[];
}) {
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
            <Cell
              key={`cell-${index}`}
              fill={POWER_CURVE_COLORS[index] || "#8B5CF6"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
