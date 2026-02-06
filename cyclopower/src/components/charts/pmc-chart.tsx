"use client";

import { useEffect, useState } from "react";
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

interface PMCData {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  tss: number;
}

export function PMCChart() {
  const [data, setData] = useState<PMCData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/pmc?days=90")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg bg-gray-100" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        Carica delle attività per visualizzare il PMC
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(val) => {
            const d = new Date(val);
            return `${d.getDate()}/${d.getMonth() + 1}`;
          }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          labelFormatter={(val) => {
            const d = new Date(val as string);
            return d.toLocaleDateString("it-IT");
          }}
        />
        <Legend />
        <ReferenceLine y={0} stroke="#ccc" />
        <Line
          type="monotone"
          dataKey="ctl"
          name="CTL (Fitness)"
          stroke="#10B981"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="atl"
          name="ATL (Fatica)"
          stroke="#F59E0B"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="tsb"
          name="TSB (Forma)"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
