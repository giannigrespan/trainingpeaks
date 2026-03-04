"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkoutPlayer } from "@/components/workouts/WorkoutPlayer";
import { calculateNormalizedPower, calculateIntensityFactor, calculateTSS } from "@/lib/cycling-metrics";
import { useToast } from "@/hooks/use-toast";
import type { Workout } from "@/types/workout";

export default function ExecuteWorkoutPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [ftp, setFtp] = useState(200);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/workouts/${params.id}`).then((r) => r.json()),
      fetch("/api/user/profile").then((r) => r.json()),
    ]).then(([wData, uData]) => {
      if (wData.success) setWorkout(wData.data);
      if (uData.success && uData.data?.ftp) setFtp(uData.data.ftp);
    }).finally(() => setLoading(false));
  }, [params.id]);

  async function handleSave(powerStream: number[], durationSeconds: number, np: number, tss: number) {
    const intensityFactor = calculateIntensityFactor(np, ftp);

    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${workout?.name ?? "Workout"} (virtuale)`,
        sport: "cycling",
        source: "virtual",
        workoutId: params.id,
        durationSeconds,
        normalizedPower: np,
        intensityFactor,
        tss,
        powerStream,
        activityDate: new Date().toISOString(),
      }),
    });

    const data = await res.json();
    if (data.success) {
      toast({ title: "Attività salvata!", description: "Contribuirà a CTL, ATL e TSB nel PMC." });
      router.push("/dashboard");
    } else {
      toast({ title: "Errore salvataggio", description: data.error, variant: "destructive" });
    }
  }

  if (loading) return <div className="py-12 text-center text-zinc-400 text-sm">Caricamento…</div>;
  if (!workout) return <div className="py-12 text-center text-zinc-400 text-sm">Workout non trovato.</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{workout.name}</h1>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
        <WorkoutPlayer
          workout={workout}
          ftp={ftp}
          onSave={handleSave}
          onClose={() => router.push("/workouts")}
        />
      </div>
    </div>
  );
}
