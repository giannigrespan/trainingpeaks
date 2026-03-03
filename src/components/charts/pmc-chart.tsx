"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { PMCLegend } from "./pmc-legend";

interface PMCData {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  tss: number;
  hasTSS: boolean;
}

function getTSBInterpretation(tsb: number): string {
  if (tsb > 25)  return "Transizione";
  if (tsb > 10)  return "Fresco";
  if (tsb >= -10) return "Forma ottimale";
  if (tsb >= -30) return "Affaticato";
  return "Sovraccarico";
}

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
    return <div className="h-72 animate-pulse rounded-lg bg-gray-100 dark:bg-zinc-800" />;
  }

  const hasData = data.some((d) => d.tss > 0);

  if (!hasData) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-500">
        Carica delle attività per visualizzare il PMC
      </div>
    );
  }

  const tickInterval = days <= 30 ? 3 : days <= 90 ? 6 : days <= 180 ? 14 : 30;

  // Left axis: CTL + ATL (always ≥ 0)
  const leftMax = Math.max(...data.map((d) => Math.max(d.ctl, d.atl)));
  const leftDomain: [number, number] = [0, Math.ceil(leftMax * 1.1) || 10];

  // Right axis: TSB (negative/positive) + TSS scatter dots
  const tsbMin = Math.min(...data.map((d) => d.tsb), -5);
  const tssMax = Math.max(...data.map((d) => d.tss), 1);
  const rightMin = Math.floor(tsbMin - 5);
  const rightMax = Math.ceil(tssMax * 1.1);
  const rightDomain: [number, number] = [rightMin, rightMax];

  return (
    <div className="space-y-3">
      <PMCLegend days={days} onDaysChange={setDays} />

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            interval={tickInterval}
            tickFormatter={(val) => {
              const d = new Date(val);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }}
          />

          {/* Left axis: CTL, ATL */}
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            domain={leftDomain}
            width={36}
          />
          {/* Right axis: TSB + TSS */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            domain={rightDomain}
            width={40}
          />

          {/* TSB Zone backgrounds (right axis) */}
          <ReferenceArea yAxisId="right" y1={rightMin} y2={-30} fill="rgba(239,68,68,0.07)" ifOverflow="extendDomain" />
          <ReferenceArea yAxisId="right" y1={-30} y2={-10} fill="rgba(251,191,36,0.08)" ifOverflow="extendDomain" />
          <ReferenceArea yAxisId="right" y1={-10} y2={10} fill="rgba(59,130,246,0.07)" ifOverflow="extendDomain" />
          <ReferenceArea yAxisId="right" y1={10} y2={25} fill="rgba(16,185,129,0.07)" ifOverflow="extendDomain" />
          <ReferenceArea yAxisId="right" y1={25} y2={rightMax} fill="rgba(156,163,175,0.05)" ifOverflow="extendDomain" />

          <ReferenceLine yAxisId="right" y={0} stroke="#CBD5E1" strokeDasharray="4 2" />

          <Tooltip
            labelFormatter={(val) => {
              const d = new Date(val as string);
              return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
            }}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                tss: "TSS",
                ctl: "CTL (Fitness)",
                atl: "ATL (Fatica)",
                tsb: "TSB (Forma)",
              };
              const rounded = Math.round(value as number);
              if (name === "tsb") {
                return [`${rounded} — ${getTSBInterpretation(rounded)}`, labels[name as string] ?? name];
              }
              return [rounded, labels[name as string] ?? name];
            }}
            contentStyle={{ fontSize: 12 }}
          />

          {/* CTL — area blu semitrasparente, asse sinistro */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="ctl"
            name="ctl"
            stroke="#3B82F6"
            strokeWidth={2}
            fill="#3B82F6"
            fillOpacity={0.15}
            dot={false}
            isAnimationActive={false}
          />

          {/* ATL — linea magenta, asse sinistro */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="atl"
            name="atl"
            stroke="#EC4899"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />

          {/* TSB — linea gialla, asse destro */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="tsb"
            name="tsb"
            stroke="#F59E0B"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />

          {/* TSS — puntini rossi solo nei giorni con allenamento, asse destro */}
          <Line
            yAxisId="right"
            dataKey="tss"
            name="tss"
            stroke="transparent"
            strokeWidth={0}
            dot={(props: { cx: number; cy: number; payload: PMCData }) => {
              if (!props.payload.hasTSS) return <g key={`tss-empty-${props.payload.date}`} />;
              return (
                <circle
                  key={`tss-dot-${props.payload.date}`}
                  cx={props.cx}
                  cy={props.cy}
                  r={3}
                  fill="#EF4444"
                  stroke="white"
                  strokeWidth={0.5}
                />
              );
            }}
            activeDot={{ r: 4, fill: "#EF4444" }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      {data.length > 0 && (() => {
        const last = data[data.length - 1];
        return (
          <div className="grid grid-cols-3 gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums text-blue-600">{last.ctl.toFixed(1)}</p>
              <p className="text-xs text-zinc-500">CTL (Fitness)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums text-pink-500">{last.atl.toFixed(1)}</p>
              <p className="text-xs text-zinc-500">ATL (Fatica)</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold tabular-nums text-amber-500`}>
                {last.tsb > 0 ? "+" : ""}{last.tsb.toFixed(1)}
              </p>
              <p className="text-xs text-zinc-500">TSB ({getTSBInterpretation(last.tsb)})</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
