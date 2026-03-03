"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Activity,
  Clock,
  Zap,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Upload,
  Trash2,
} from "lucide-react";
import { PMCChart } from "@/components/charts/pmc-chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivitySummary {
  _id: string;
  name: string;
  activityDate: string;
  duration: number;
  distance: number;
  tss: number;
  normalizedPower: number;
  avgPower: number;
  intensityFactor: number;
}

interface PowerCurvePoint {
  duration: number;
  recent: number;
}

interface PMCEntry {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  tss: number;
}

interface PowerZones {
  z1: { min: number; max: number };
  z2: { min: number; max: number };
  z3: { min: number; max: number };
  z4: { min: number; max: number };
  z5: { min: number; max: number };
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function getTSBLabel(tsb: number): { text: string; color: string } {
  if (tsb > 25)  return { text: "Transizione",    color: "text-gray-400" };
  if (tsb > 10)  return { text: "Fresco",         color: "text-emerald-500" };
  if (tsb >= -10) return { text: "Forma ottimale", color: "text-blue-500" };
  if (tsb >= -30) return { text: "Affaticato",    color: "text-amber-500" };
  return                  { text: "Sovraccarico",  color: "text-red-500" };
}

interface TSBStatus {
  emoji: string;
  label: string;
  advice: string;
  bg: string;
  border: string;
  text: string;
}

function getPMCStatus(tsb: number): TSBStatus {
  if (tsb > 25)  return { emoji: "⬜", label: "Transizione",    advice: "Riprendi gli allenamenti gradualmente.",       bg: "bg-zinc-50 dark:bg-zinc-800",        border: "border-zinc-200 dark:border-zinc-700",    text: "text-zinc-600 dark:text-zinc-400" };
  if (tsb > 10)  return { emoji: "🟢", label: "Fresco",         advice: "Ottimo momento per una gara o un test FTP.",   bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-400" };
  if (tsb >= -10) return { emoji: "🔵", label: "Forma ottimale", advice: "Equilibrio perfetto — continua con il piano.", bg: "bg-blue-50 dark:bg-blue-900/20",     border: "border-blue-200 dark:border-blue-800",    text: "text-blue-700 dark:text-blue-400" };
  if (tsb >= -30) return { emoji: "🟡", label: "Affaticato",    advice: "Pianifica un recupero nei prossimi giorni.",   bg: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-200 dark:border-amber-800",  text: "text-amber-700 dark:text-amber-400" };
  return          { emoji: "🔴", label: "Sovraccarico",          advice: "Inserisci una settimana di scarico subito.",   bg: "bg-red-50 dark:bg-red-900/20",       border: "border-red-200 dark:border-red-800",      text: "text-red-700 dark:text-red-400" };
}

function PMCStatusBar({ ctl, atl, tsb }: { ctl: number; atl: number; tsb: number }) {
  const s = getPMCStatus(tsb);
  return (
    <div className={`mt-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${s.bg} ${s.border}`}>
      <p className={`text-sm font-medium ${s.text}`}>
        {s.emoji} <strong>{s.label}</strong> — {s.advice}
      </p>
      <p className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
        CTL {ctl.toFixed(1)} · ATL {atl.toFixed(1)}
      </p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  delta,
  deltaLabel,
  color,
  sub,
  subColor,
}: {
  title: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  color: "blue" | "orange" | "emerald" | "rose";
  sub?: string;
  subColor?: string;
}) {
  const accentColor = {
    blue: "text-blue-500",
    orange: "text-orange-500",
    emerald: "text-emerald-500",
    rose: "text-rose-500",
  }[color];

  const DeltaIcon =
    delta === undefined || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const deltaColor =
    delta === undefined || delta === 0
      ? "text-zinc-400"
      : delta > 0
        ? "text-emerald-500"
        : "text-rose-500";

  return (
    <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
          {title}
        </span>
        <TrendingUp className={`h-3.5 w-3.5 ${accentColor}`} />
      </div>
      <div className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </div>
      {sub && (
        <div className={`text-xs mt-0.5 font-medium ${subColor ?? "text-zinc-400"}`}>
          {sub}
        </div>
      )}
      {delta !== undefined && (
        <div className={`flex items-center gap-1 text-xs mt-1 font-medium ${deltaColor}`}>
          <DeltaIcon className="h-3 w-3" />
          {delta > 0 ? "+" : ""}
          {delta.toFixed(1)} {deltaLabel ?? ""}
        </div>
      )}
    </div>
  );
}

const ZONE_COLORS = [
  "bg-zinc-300 dark:bg-zinc-600",
  "bg-blue-400",
  "bg-emerald-400",
  "bg-orange-400",
  "bg-rose-500",
];
const ZONE_NAMES = ["Z1 Recovery", "Z2 Endurance", "Z3 Tempo", "Z4 Threshold", "Z5 VO2max"];
const ZONE_KEYS = ["z1", "z2", "z3", "z4", "z5"] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [pmcData, setPmcData] = useState<PMCEntry[]>([]);
  const [powerZones, setPowerZones] = useState<PowerZones | null>(null);
  const [ftp, setFtp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [powerCurve, setPowerCurve] = useState<PowerCurvePoint[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/activities?limit=10").then((r) => r.json()),
      fetch("/api/analytics/pmc?days=90").then((r) => r.json()),
      fetch("/api/user/profile").then((r) => r.json()),
      fetch("/api/analytics/power-curve").then((r) => r.json()),
    ])
      .then(([actRes, pmcRes, profileRes, pcRes]) => {
        if (actRes.success) setActivities(actRes.data);
        if (pmcRes.success) setPmcData(pmcRes.data);
        if (profileRes.success && profileRes.data) {
          setPowerZones(profileRes.data.powerZones ?? null);
          setFtp(profileRes.data.ftp ?? 0);
        }
        if (pcRes.success) setPowerCurve(pcRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Eliminare questa attività?")) return;
    const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
    if (res.ok) setActivities((prev) => prev.filter((a) => a._id !== id));
  }

  function formatDuration(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // PMC metrics
  const lastPmc = pmcData.at(-1) ?? null;
  const prevPmc = pmcData.length > 1 ? pmcData.at(-2)! : null;

  // IF Medio
  const ifValues = activities.filter((a) => a.intensityFactor > 0).map((a) => a.intensityFactor);
  const avgIF = ifValues.length > 0 ? ifValues.reduce((s, v) => s + v, 0) / ifValues.length : 0;

  // Weekly
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekActs = activities.filter((a) => new Date(a.activityDate) >= weekStart);
  const weekTSS = weekActs.reduce((s, a) => s + (a.tss || 0), 0);
  const weekHours = weekActs.reduce((s, a) => s + a.duration, 0) / 3600;
  const weekKm = weekActs.reduce((s, a) => s + a.distance, 0) / 1000;

  const lastActivity = activities[0] ?? null;
  const maxPower = ftp * 1.5 || 400;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Questa settimana: {weekActs.length} allenamenti · {weekHours.toFixed(1)}h ·{" "}
            {weekKm.toFixed(0)} km · TSS {Math.round(weekTSS)}
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-colors flex-shrink-0"
        >
          <Upload className="h-4 w-4" />
          Carica attività
        </Link>
      </div>

      {/* ── Bento grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Row 1 — 4 metric cards */}
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          ))
        ) : (
          <>
            <MetricCard
              title="CTL – Fitness"
              value={lastPmc ? lastPmc.ctl.toFixed(1) : "—"}
              delta={lastPmc && prevPmc ? +(lastPmc.ctl - prevPmc.ctl).toFixed(1) : undefined}
              deltaLabel="vs ieri"
              color="blue"
            />
            <MetricCard
              title="ATL – Fatica"
              value={lastPmc ? lastPmc.atl.toFixed(1) : "—"}
              delta={lastPmc && prevPmc ? +(lastPmc.atl - prevPmc.atl).toFixed(1) : undefined}
              deltaLabel="vs ieri"
              color="orange"
            />
            <MetricCard
              title="TSB – Forma"
              value={lastPmc ? (lastPmc.tsb >= 0 ? "+" : "") + lastPmc.tsb.toFixed(1) : "—"}
              delta={lastPmc && prevPmc ? +(lastPmc.tsb - prevPmc.tsb).toFixed(1) : undefined}
              deltaLabel="vs ieri"
              color={lastPmc && lastPmc.tsb >= 0 ? "emerald" : "rose"}
              sub={lastPmc ? getTSBLabel(lastPmc.tsb).text : undefined}
              subColor={lastPmc ? getTSBLabel(lastPmc.tsb).color : undefined}
            />
            <MetricCard
              title="IF Medio"
              value={avgIF > 0 ? avgIF.toFixed(2) : "—"}
              color="emerald"
            />
          </>
        )}

        {/* Row 2 — PMC (3-col) + Last activity (1-col) */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
          <div className="mb-4">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Performance Management Chart
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              CTL · ATL · TSB con TSS giornaliero
            </p>
          </div>
          <PMCChart />
          {lastPmc && <PMCStatusBar ctl={lastPmc.ctl} atl={lastPmc.atl} tsb={lastPmc.tsb} />}
        </div>

        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 mb-4">
            Ultimo allenamento
          </h3>
          {loading ? (
            <div className="flex-1 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-6 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </div>
          ) : lastActivity ? (
            <>
              <div className="flex-1 space-y-3">
                <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-tight">
                  {lastActivity.name}
                </p>
                <p className="text-xs text-zinc-400">
                  {format(new Date(lastActivity.activityDate), "d MMMM yyyy", { locale: it })}
                </p>
                <div className="space-y-2 pt-1">
                  {[
                    { label: "Durata", value: formatDuration(lastActivity.duration) },
                    { label: "Distanza", value: `${(lastActivity.distance / 1000).toFixed(1)} km` },
                    { label: "TSS", value: lastActivity.tss > 0 ? String(lastActivity.tss) : "—" },
                    {
                      label: "NP",
                      value: lastActivity.normalizedPower > 0 ? `${lastActivity.normalizedPower}W` : "—",
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between text-sm border-b border-zinc-100 dark:border-zinc-800 pb-1.5"
                    >
                      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
                      <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <Link
                href={`/activities/${lastActivity._id}`}
                className="mt-4 block w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-bold text-center hover:opacity-90 transition-opacity"
              >
                Apri attività
              </Link>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-4">
              <Activity className="h-10 w-10 text-zinc-200 dark:text-zinc-700" />
              <p className="text-sm text-zinc-500">Nessuna attività ancora</p>
              <Link
                href="/upload"
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Carica il primo file .fit
              </Link>
            </div>
          )}
        </div>

        {/* Row 3 — Recent activities (2-col) + Power zones (2-col) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Attività recenti
            </h3>
            <span className="text-xs text-zinc-400">{activities.length} caricate</span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="py-8 text-center text-zinc-400">
              <Activity className="mx-auto mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">Nessuna attività</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.slice(0, 5).map((activity) => (
                <Link
                  key={activity._id}
                  href={`/activities/${activity._id}`}
                  className="group flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex-shrink-0">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {activity.name}
                      </p>
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDuration(activity.duration)} · {(activity.distance / 1000).toFixed(1)} km
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {activity.tss > 0 && (
                      <span className="text-xs font-semibold tabular-nums text-zinc-400">
                        TSS {activity.tss}
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, activity._id)}
                      className="p-1 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 mb-1">
            Zone di potenza
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-5">
            {ftp > 0 ? `FTP: ${ftp}W` : "Configura FTP nelle impostazioni"}
          </p>
          {powerZones && ftp > 0 ? (
            <div className="space-y-3">
              {ZONE_KEYS.map((zk, i) => {
                const zone = powerZones[zk];
                const widthPct = Math.min(Math.round((zone.max / maxPower) * 100), 100);
                return (
                  <div key={zk} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-700 dark:text-zinc-300">{ZONE_NAMES[i]}</span>
                      <span className="tabular-nums text-zinc-400">
                        {zone.min}–{zone.max}W
                      </span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${ZONE_COLORS[i]} rounded-full transition-all duration-500`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
              <p className="text-sm text-zinc-400">FTP non configurato</p>
              <Link href="/settings" className="text-xs text-blue-600 hover:underline font-medium">
                Vai alle impostazioni →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Power Curve Evolution */}
      {powerCurve.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
          <div className="mb-4">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Curva di Potenza
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Ultimi 90 giorni
            </p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={powerCurve} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" />
              <XAxis
                dataKey="duration"
                tickFormatter={(d: number) =>
                  d < 60 ? `${d}s` : d < 3600 ? `${d / 60}m` : `${d / 3600}h`
                }
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-zinc-400"
              />
              <YAxis
                tickFormatter={(v: number) => `${v}W`}
                tick={{ fontSize: 11 }}
                width={48}
                stroke="currentColor"
                className="text-zinc-400"
              />
              <Tooltip
                formatter={(v: number | undefined) => [v != null ? `${v}W` : "—", "Potenza"]}
                labelFormatter={(d) => {
                  const n = Number(d);
                  return n < 60 ? `${n} sec` : n < 3600 ? `${n / 60} min` : `${n / 3600}h`;
                }}
                contentStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="recent"
                stroke="#3b82f6"
                dot={false}
                strokeWidth={2.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
