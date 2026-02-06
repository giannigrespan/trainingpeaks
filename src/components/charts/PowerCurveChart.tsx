"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface PowerCurveChartProps {
  powerCurve: Record<string, number>;
  height?: number;
}

export function PowerCurveChart({ powerCurve, height = 250 }: PowerCurveChartProps) {
  const order = ["5s", "10s", "30s", "1min", "5min", "20min", "60min"];
  const colors = ["#EC4899", "#8B5CF6", "#6366F1", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

  const data = order
    .filter((key) => powerCurve[key] && powerCurve[key] > 0)
    .map((key, idx) => ({
      duration: key,
      power: powerCurve[key],
      color: colors[idx % colors.length],
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[var(--color-text-secondary)] text-sm">
        Nessun dato power curve
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="duration"
          tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
          tickLine={false}
          axisLine={false}
          label={{ value: "Watts", angle: -90, position: "insideLeft", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
          }}
          formatter={(value: number) => [`${value} W`, "Best Power"]}
        />
        <Bar dataKey="power" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
