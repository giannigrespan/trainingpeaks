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
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface PMCDataPoint {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  tss: number;
}

interface PMCChartProps {
  data: PMCDataPoint[];
  height?: number;
}

export function PMCChart({ data, height = 350 }: PMCChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--color-text-secondary)]">
        <p>Carica attività per vedere il grafico PMC</p>
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    dateLabel: format(new Date(d.date), "dd MMM", { locale: it }),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formattedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            fontSize: "13px",
          }}
          formatter={(value: number, name: string) => {
            const labels: Record<string, string> = {
              ctl: "CTL (Fitness)",
              atl: "ATL (Fatica)",
              tsb: "TSB (Forma)",
            };
            return [value.toFixed(1), labels[name] || name];
          }}
          labelFormatter={(label) => label}
        />
        <Legend
          formatter={(value: string) => {
            const labels: Record<string, string> = {
              ctl: "CTL (Fitness)",
              atl: "ATL (Fatica)",
              tsb: "TSB (Forma)",
            };
            return labels[value] || value;
          }}
        />
        <ReferenceLine y={0} stroke="var(--color-border)" strokeDasharray="3 3" />
        <Line
          type="monotone"
          dataKey="ctl"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={false}
          name="ctl"
        />
        <Line
          type="monotone"
          dataKey="atl"
          stroke="#EF4444"
          strokeWidth={2}
          dot={false}
          name="atl"
        />
        <Line
          type="monotone"
          dataKey="tsb"
          stroke="#10B981"
          strokeWidth={2}
          dot={false}
          name="tsb"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
