"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Clock,
  Zap,
  Heart,
  Gauge,
  Mountain,
  Route,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ActivityCharts,
  LapAnalysisChart,
  PowerCurveChart,
} from "@/components/charts/activity-charts";

const RouteMap = dynamic(
  () => import("@/components/charts/route-map").then((m) => m.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />
    ),
  }
);

interface ActivityDetail {
  _id: string;
  name: string;
  activityDate: string;
  duration: number;
  distance: number;
  elevationGain: number;
  avgPower: number;
  maxPower: number;
  normalizedPower: number;
  intensityFactor: number;
  tss: number;
  avgHR: number;
  maxHR: number;
  avgCadence: number;
  avgSpeed: number;
  maxSpeed: number;
  calories: number;
  powerCurve: { duration: number; power: number }[];
}

interface StreamData {
  power: number[];
  heartRate: number[];
  cadence: number[];
  speed: number[];
  altitude: number[];
  laps?: number[];
  lat?: number[];
  lng?: number[];
  samplingRate?: number;
}

interface ZoneData {
  zone: string;
  percentage: number;
  seconds: number;
  minWatts?: number;
  maxWatts?: number | null;
}

const ZONE_COLORS = [
  "bg-zinc-400",
  "bg-blue-400",
  "bg-emerald-400",
  "bg-orange-400",
  "bg-rose-500",
  "bg-red-700",
];

function getIFCategory(if_: number): { label: string; color: string } {
  if (if_ < 0.60) return { label: "Recovery",   color: "bg-zinc-100 text-zinc-600" };
  if (if_ < 0.75) return { label: "Endurance",  color: "bg-blue-100 text-blue-700" };
  if (if_ < 0.90) return { label: "Tempo",      color: "bg-green-100 text-green-700" };
  if (if_ < 1.00) return { label: "Threshold",  color: "bg-orange-100 text-orange-700" };
  return           { label: "VO2max+",           color: "bg-red-100 text-red-700" };
}

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [streams, setStreams] = useState<StreamData | null>(null);
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Eliminare questa attività? L'operazione non è reversibile.")) return;
    setDeleting(true);
    const res = await fetch(`/api/activities/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      setDeleting(false);
      alert("Errore durante l'eliminazione.");
    }
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/activities/${params.id}`).then((r) => r.json()),
      fetch(`/api/analytics/zones?activityId=${params.id}`).then((r) => r.json()),
    ])
      .then(([actData, zonesData]) => {
        if (actData.success) {
          setActivity(actData.data.activity);
          setStreams(actData.data.streams);
        }
        if (zonesData.success) {
          setZones(zonesData.data.zones ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-zinc-700" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">Attività non trovata</p>
        <Link href="/dashboard" className="mt-2 text-sm text-blue-600 hover:underline">
          Torna alla dashboard
        </Link>
      </div>
    );
  }

  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  }

  const derivedFtp =
    activity.normalizedPower && activity.intensityFactor
      ? Math.round(activity.normalizedPower / activity.intensityFactor)
      : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activity.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(activity.activityDate), "EEEE d MMMM yyyy, HH:mm", {
                locale: it,
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-lg tabular-nums">
              TSS {activity.tss}
            </Badge>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md p-2 text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 disabled:opacity-50"
              title="Elimina attività"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* GPS Route Map — shown at top when available */}
      {streams?.lat && streams.lat.length > 1 && streams.lng && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Percorso</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden rounded-b-xl">
            <div className="h-72">
              <RouteMap lat={streams.lat} lng={streams.lng} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3">
        <MetricCard
          icon={<Clock className="h-4 w-4 text-blue-600" />}
          label="Durata"
          value={formatDuration(activity.duration)}
        />
        <MetricCard
          icon={<Route className="h-4 w-4 text-green-600" />}
          label="Distanza"
          value={`${(activity.distance / 1000).toFixed(1)} km`}
        />
        <MetricCard
          icon={<Mountain className="h-4 w-4 text-orange-600" />}
          label="Dislivello"
          value={`${activity.elevationGain} m`}
        />
        <MetricCard
          icon={<Gauge className="h-4 w-4 text-blue-600" />}
          label="Velocità Media"
          value={`${(activity.avgSpeed * 3.6).toFixed(1)} km/h`}
        />
        <MetricCard
          icon={<Zap className="h-4 w-4 text-purple-600" />}
          label="Potenza Media"
          value={`${activity.avgPower} W`}
          sub={`Max ${activity.maxPower} W`}
        />
        <MetricCard
          icon={<Zap className="h-4 w-4 text-purple-600" />}
          label="NP"
          value={`${activity.normalizedPower} W`}
          sub={`IF ${activity.intensityFactor}`}
          ifCategory={activity.intensityFactor ? getIFCategory(activity.intensityFactor) : undefined}
        />
        <MetricCard
          icon={<Heart className="h-4 w-4 text-red-600" />}
          label="FC Media"
          value={`${activity.avgHR} bpm`}
          sub={`Max ${activity.maxHR} bpm`}
        />
        <MetricCard
          icon={<Zap className="h-4 w-4 text-yellow-600" />}
          label="Cadenza"
          value={`${activity.avgCadence} rpm`}
        />
        <MetricCard
          icon={<Zap className="h-4 w-4 text-orange-500" />}
          label="Calorie"
          value={`${activity.calories} kcal`}
        />
      </div>

      {/* Charts */}
      {streams && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Grafici</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityCharts streams={streams} laps={streams.laps} ftp={derivedFtp} />
          </CardContent>
        </Card>
      )}

      {/* Lap Analysis */}
      {streams?.laps && streams.laps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Analisi Giri ({streams.laps.length + 1} giri)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LapAnalysisChart streams={streams} laps={streams.laps} />
          </CardContent>
        </Card>
      )}

      {/* Zone Distribution */}
      {zones.length > 0 && activity.avgPower > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Zone di Potenza</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {zones.map((z, i) => (
              <div key={z.zone} className="flex items-center gap-3">
                <div className="w-44 shrink-0">
                  <div className="text-xs text-gray-600 dark:text-gray-300">{z.zone}</div>
                  {z.minWatts != null && (
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                      {z.minWatts}–{z.maxWatts != null ? `${z.maxWatts} W` : "∞"}
                    </div>
                  )}
                </div>
                <div className="flex-1 h-4 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${ZONE_COLORS[i] ?? "bg-zinc-400"}`}
                    style={{ width: `${z.percentage}%` }}
                  />
                </div>
                <span className="w-9 text-right text-xs font-medium tabular-nums text-gray-700 dark:text-gray-300">
                  {z.percentage}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Best Powers */}
      {activity.powerCurve && activity.powerCurve.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Migliori Prestazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <BestPowersTable powerCurve={activity.powerCurve} streams={streams ?? undefined} />
          </CardContent>
        </Card>
      )}

      {/* Power Curve */}
      {activity.powerCurve && activity.powerCurve.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Power Curve</CardTitle>
          </CardHeader>
          <CardContent>
            <PowerCurveChart powerCurve={activity.powerCurve} />
          </CardContent>
        </Card>
      )}

    </div>
  );
}

const BEST_POWER_LABELS: { label: string; seconds: number }[] = [
  { label: "1 min",  seconds: 60 },
  { label: "3 min",  seconds: 180 },
  { label: "5 min",  seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
  { label: "20 min", seconds: 1200 },
  { label: "60 min", seconds: 3600 },
];

/** Sliding-window best average power for targetSec seconds from a raw power array. */
function bestPowerFromStream(
  power: number[],
  targetSec: number,
  samplingRate: number
): number | null {
  const windowSize = Math.round(targetSec / samplingRate);
  if (windowSize < 1 || windowSize > power.length) return null;
  let sum = 0;
  for (let i = 0; i < windowSize; i++) sum += power[i];
  let maxAvg = sum;
  for (let i = windowSize; i < power.length; i++) {
    sum += power[i] - power[i - windowSize];
    if (sum > maxAvg) maxAvg = sum;
  }
  return Math.round(maxAvg / windowSize);
}

function BestPowersTable({
  powerCurve,
  streams,
}: {
  powerCurve: { duration: number; power: number }[];
  streams?: { power: number[]; samplingRate?: number };
}) {
  const map = new Map(powerCurve.map((p) => [p.duration, p.power]));
  const samplingRate = streams?.samplingRate ?? 1;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {BEST_POWER_LABELS.map(({ label, seconds }) => {
        const w =
          map.get(seconds) ??
          (streams?.power ? bestPowerFromStream(streams.power, seconds, samplingRate) : null);
        return (
          <div
            key={seconds}
            className="flex flex-col items-center rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 p-3 text-center"
          >
            <span className="text-xs text-zinc-400 font-medium mb-1">{label}</span>
            <span className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
              {w != null ? `${w}W` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  ifCategory,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  ifCategory?: { label: string; color: string };
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          {icon}
          {label}
        </div>
        <p className="mt-1 text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {value}
        </p>
        {sub && (
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{sub}</p>
            {ifCategory && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ifCategory.color}`}>
                {ifCategory.label}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
