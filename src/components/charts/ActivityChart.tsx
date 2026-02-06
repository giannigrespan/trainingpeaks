"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface StreamData {
  time: number;
  power?: number;
  heartRate?: number;
  speed?: number;
  cadence?: number;
}

interface ActivityChartProps {
  data: StreamData[];
  visibleStreams?: {
    power?: boolean;
    heartRate?: boolean;
    speed?: boolean;
    cadence?: boolean;
  };
  height?: number;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}min`;
}

export function ActivityChart({
  data,
  visibleStreams = { power: true, heartRate: true },
  height = 300,
}: ActivityChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--color-text-secondary)]">
        <p>Nessun dato disponibile</p>
      </div>
    );
  }

  // Downsample for performance: max 1000 points
  const step = Math.max(1, Math.floor(data.length / 1000));
  const sampled = data.filter((_, i) => i % step === 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={sampled} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="time"
          tickFormatter={formatTime}
          tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
          tickLine={false}
        />
        <YAxis
          yAxisId="power"
          tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="hr"
          orientation="right"
          tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
          tickLine={false}
          axisLine={false}
          hide={!visibleStreams.heartRate}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            fontSize: "13px",
          }}
          labelFormatter={(val) => formatTime(val as number)}
          formatter={(value: number, name: string) => {
            const units: Record<string, string> = {
              power: "W",
              heartRate: "bpm",
              speed: "km/h",
              cadence: "rpm",
            };
            return [`${Math.round(value)} ${units[name] || ""}`, name === "power" ? "Potenza" : name === "heartRate" ? "FC" : name === "speed" ? "Velocità" : "Cadenza"];
          }}
        />
        <Legend
          formatter={(value: string) => {
            const labels: Record<string, string> = {
              power: "Potenza (W)",
              heartRate: "FC (bpm)",
              speed: "Velocità (km/h)",
              cadence: "Cadenza (rpm)",
            };
            return labels[value] || value;
          }}
        />
        {visibleStreams.power && (
          <Line
            yAxisId="power"
            type="monotone"
            dataKey="power"
            stroke="var(--color-power)"
            strokeWidth={1.5}
            dot={false}
            name="power"
          />
        )}
        {visibleStreams.heartRate && (
          <Line
            yAxisId="hr"
            type="monotone"
            dataKey="heartRate"
            stroke="var(--color-hr)"
            strokeWidth={1.5}
            dot={false}
            name="heartRate"
          />
        )}
        {visibleStreams.speed && (
          <Line
            yAxisId="power"
            type="monotone"
            dataKey="speed"
            stroke="var(--color-speed)"
            strokeWidth={1.5}
            dot={false}
            name="speed"
          />
        )}
        {visibleStreams.cadence && (
          <Line
            yAxisId="power"
            type="monotone"
            dataKey="cadence"
            stroke="var(--color-cadence)"
            strokeWidth={1.5}
            dot={false}
            name="cadence"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
