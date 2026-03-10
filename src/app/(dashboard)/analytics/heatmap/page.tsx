"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Activity } from "lucide-react";
import type { HeatmapCell } from "@/app/api/analytics/heatmap/route";

// HeatmapMap uses Leaflet which requires browser APIs — load client-side only
const HeatmapMap = dynamic(
  () => import("@/components/charts/heatmap-map").then((m) => m.HeatmapMap),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-zinc-400 text-sm">Caricamento mappa…</div> }
);

interface HeatmapData {
  cells: HeatmapCell[];
  maxCount: number;
  totalActivities: number;
  totalCells: number;
}

export default function HeatmapPage() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/heatmap")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res);
        else setError(res.error ?? "Errore nel caricamento");
      })
      .catch(() => setError("Errore di rete"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Strade Più Percorse</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Heatmap delle strade più frequentate nei tuoi allenamenti. Rosso = molto percorsa, blu = meno frequente.
        </p>
      </div>

      {/* Stats row */}
      {data && (
        <div className="flex gap-6 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            {data.totalActivities} allenament{data.totalActivities === 1 ? "o" : "i"} analizzat{data.totalActivities === 1 ? "o" : "i"}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {data.totalCells.toLocaleString("it-IT")} celle uniche
          </span>
        </div>
      )}

      {/* Map */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900" style={{ height: "calc(100vh - 280px)", minHeight: "420px" }}>
        {loading && (
          <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
            Analisi percorsi in corso…
          </div>
        )}
        {error && (
          <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
            {error}
          </div>
        )}
        {!loading && !error && data && data.cells.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-400">
            <MapPin className="h-10 w-10 opacity-30" />
            <p className="text-sm">Carica allenamenti con GPS per visualizzare la heatmap</p>
          </div>
        )}
        {!loading && !error && data && data.cells.length > 0 && (
          <HeatmapMap cells={data.cells} maxCount={data.maxCount} />
        )}
      </div>
    </div>
  );
}
