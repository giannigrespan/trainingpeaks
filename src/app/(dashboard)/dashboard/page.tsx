"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Activity,
  Clock,
  Zap,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PMCChart } from "@/components/charts/pmc-chart";

interface ActivitySummary {
  _id: string;
  name: string;
  activityDate: string;
  duration: number;
  distance: number;
  tss: number;
  normalizedPower: number;
  avgPower: number;
  avgHR: number;
}

export default function DashboardPage() {
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activities?limit=10")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setActivities(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // Weekly summary
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  const weekActivities = activities.filter(
    (a) => new Date(a.activityDate) >= weekStart
  );
  const weekTSS = weekActivities.reduce((s, a) => s + (a.tss || 0), 0);
  const weekHours = weekActivities.reduce((s, a) => s + (a.duration || 0), 0) / 3600;
  const weekKm = weekActivities.reduce((s, a) => s + (a.distance || 0), 0) / 1000;

  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Riepilogo settimanale e attività recenti</p>
      </div>

      {/* Weekly Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">TSS Settimana</p>
                <p className="text-2xl font-bold tabular-nums">{Math.round(weekTSS)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ore Settimana</p>
                <p className="text-2xl font-bold tabular-nums">{weekHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Km Settimana</p>
                <p className="text-2xl font-bold tabular-nums">{weekKm.toFixed(0)} km</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2">
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Allenamenti</p>
                <p className="text-2xl font-bold tabular-nums">{weekActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PMC Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Management Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <PMCChart />
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attività Recenti</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Activity className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p>Nessuna attività trovata</p>
              <Link
                href="/upload"
                className="mt-2 inline-block text-sm text-blue-600 hover:underline"
              >
                Carica la tua prima attività
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => (
                <Link
                  key={activity._id}
                  href={`/activities/${activity._id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {activity.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(activity.activityDate), "d MMM yyyy", {
                          locale: it,
                        })}{" "}
                        &middot; {formatDuration(activity.duration)} &middot;{" "}
                        {(activity.distance / 1000).toFixed(1)} km
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden text-right sm:block">
                      <Badge variant="secondary" className="tabular-nums">
                        TSS {activity.tss}
                      </Badge>
                    </div>
                    {activity.normalizedPower > 0 && (
                      <span className="hidden text-sm font-medium tabular-nums text-gray-700 md:block">
                        NP {activity.normalizedPower}W
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
