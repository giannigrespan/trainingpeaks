"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface PMCData {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  tss: number;
}

const DAYS_OPTIONS = [30, 90, 180, 365];

export function PMCChart() {
  const [data, setData] = useState<PMCData[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/pmc?days=${days}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return <div className="h-72 animate-pulse rounded-lg bg-gray-100" />;
  }

  const hasData = data.some((d) => d.tss > 0);

  if (!hasData) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-500">
        Carica delle attività per visualizzare il PMC
      </div>
    );
  }

  // Show only every N-th tick to avoid clutter
  const tickInterval = days <= 30 ? 3 : days <= 90 ? 6 : days <= 180 ? 14 : 30;

  return (
    <div className="space-y-3">
      {/* Legend / selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded" style={{ background: "#10B981" }} />
            CTL – Fitness (42gg)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded" style={{ background: "#F59E0B" }} />
            ATL – Fatica (7gg)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded" style={{ background: "#3B82F6" }} />
            TSB – Forma
          </span>
        </div>
        <div className="flex gap-1">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                days === d
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {d}gg
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            interval={tickInterval}
            tickFormatter={(val) => {
              const d = new Date(val);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }}
          />
          {/* Left axis: CTL/ATL/TSB */}
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
          {/* Right axis: TSS bars */}
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip
            labelFormatter={(val) => new Date(val as string).toLocaleDateString("it-IT")}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                tss: "TSS",
                ctl: "CTL (Fitness)",
                atl: "ATL (Fatica)",
                tsb: "TSB (Forma)",
              };
              return [Math.round(value as number), labels[name as string] ?? name];
            }}
          />
          <Legend
            wrapperStyle={{ display: "none" }}
          />
          <ReferenceLine yAxisId="left" y={0} stroke="#CBD5E1" />

          {/* TSS bars (background) */}
          <Bar
            yAxisId="right"
            dataKey="tss"
            name="tss"
            fill="#94A3B8"
            opacity={0.6}
            radius={[2, 2, 0, 0]}
          />

          {/* CTL - Fitness */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="ctl"
            name="ctl"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
          />
          {/* ATL - Fatigue */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="atl"
            name="atl"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={false}
          />
          {/* TSB - Form */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="tsb"
            name="tsb"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      {data.length > 0 && (() => {
        const last = data[data.length - 1];
        return (
          <div className="grid grid-cols-3 gap-3 border-t pt-3">
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums text-emerald-600">{last.ctl}</p>
              <p className="text-xs text-gray-500">CTL (Fitness)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums text-amber-600">{last.atl}</p>
              <p className="text-xs text-gray-500">ATL (Fatica)</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold tabular-nums ${last.tsb >= 0 ? "text-blue-600" : "text-red-500"}`}>
                {last.tsb > 0 ? "+" : ""}{last.tsb}
              </p>
              <p className="text-xs text-gray-500">TSB (Forma)</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
