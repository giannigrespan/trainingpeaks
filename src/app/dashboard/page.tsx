"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { StatCard, Card } from "@/components/ui/Card";
import { PMCChart } from "@/components/charts/PMCChart";
import { FileUpload } from "@/components/activity/FileUpload";
import { format } from "date-fns";
import { it } from "date-fns/locale";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();

  const { data: stats } = useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const res = await fetch("/api/user/stats");
      const json = await res.json();
      return json.data;
    },
    enabled: status === "authenticated",
  });

  const { data: pmcData } = useQuery({
    queryKey: ["pmc", 90],
    queryFn: async () => {
      const res = await fetch("/api/analytics/pmc?days=90");
      const json = await res.json();
      return json.data;
    },
    enabled: status === "authenticated",
  });

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-text-secondary)]">Caricamento...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Ciao, {session?.user?.name || "Ciclista"}
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Ecco il riepilogo del tuo allenamento
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="TSS Settimana"
            value={stats?.weekly?.tss || 0}
            color="var(--color-primary)"
          />
          <StatCard
            title="Ore"
            value={stats?.weekly?.hours?.toFixed(1) || "0"}
            unit="h"
            color="var(--color-success)"
          />
          <StatCard
            title="Kilometri"
            value={stats?.weekly?.km || 0}
            unit="km"
            color="var(--color-info)"
          />
          <StatCard
            title="Attività"
            value={stats?.weekly?.count || 0}
            subtitle={`Totale: ${stats?.totalActivities || 0}`}
          />
        </div>

        {/* PMC Chart + Fitness Summary */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Performance Management Chart</h2>
              <Link href="/analytics" className="text-sm text-[var(--color-primary)] hover:underline">
                Vedi dettaglio
              </Link>
            </div>
            <PMCChart data={pmcData?.data || []} height={280} />
          </Card>

          <Card>
            <h2 className="text-lg font-semibold mb-4">Forma Attuale</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">CTL (Fitness)</p>
                <p className="text-2xl font-semibold tabular-nums text-[#3B82F6]">
                  {pmcData?.summary?.ctl?.toFixed(1) || "0.0"}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">ATL (Fatica)</p>
                <p className="text-2xl font-semibold tabular-nums text-[#EF4444]">
                  {pmcData?.summary?.atl?.toFixed(1) || "0.0"}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">TSB (Forma)</p>
                <p className={`text-2xl font-semibold tabular-nums ${
                  (pmcData?.summary?.tsb || 0) > 0 ? "text-[#10B981]" : "text-[#F59E0B]"
                }`}>
                  {pmcData?.summary?.tsb?.toFixed(1) || "0.0"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Upload + Recent Activities */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-lg font-semibold mb-4">Carica Attività</h2>
            <FileUpload />
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Ultime Attività</h2>
              <Link href="/activities" className="text-sm text-[var(--color-primary)] hover:underline">
                Vedi tutte
              </Link>
            </div>
            {stats?.recentActivities?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivities.map((activity: Record<string, unknown>) => (
                  <Link
                    key={activity._id as string}
                    href={`/activities/${activity._id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{activity.name as string}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {format(new Date(activity.activityDate as string), "dd MMM yyyy", { locale: it })} - {formatDuration(activity.duration as number)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm tabular-nums">{Math.round(activity.tss as number)} TSS</p>
                      <p className="text-xs text-[var(--color-text-secondary)] tabular-nums">{activity.normalizedPower as number}W NP</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">
                Nessuna attività ancora. Carica il tuo primo file!
              </p>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
