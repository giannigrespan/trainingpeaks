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
}

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [streams, setStreams] = useState<StreamData | null>(null);
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
    fetch(`/api/activities/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActivity(data.data.activity);
          setStreams(data.data.streams);
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Attività non trovata</p>
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
    return h > 0
      ? `${h}h ${m}m ${s}s`
      : `${m}m ${s}s`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activity.name}
            </h1>
            <p className="text-sm text-gray-500">
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
              className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="Elimina attività"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
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
          sub={`${activity.calories} kcal`}
        />
      </div>

      {/* Charts */}
      {streams && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Grafici</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityCharts streams={streams} laps={streams.laps} />
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

      {/* GPS Route Map */}
      {streams?.lat && streams.lat.length > 1 && streams.lng && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Percorso</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden rounded-b-xl">
            <div className="h-80">
              <RouteMap lat={streams.lat} lng={streams.lng} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {icon}
          {label}
        </div>
        <p className="mt-1 text-xl font-bold tabular-nums text-gray-900">
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 tabular-nums">{sub}</p>}
      </CardContent>
    </Card>
  );
}
