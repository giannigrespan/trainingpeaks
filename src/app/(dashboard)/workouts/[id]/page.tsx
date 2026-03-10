"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Save, Play, Download, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkoutBuilder } from "@/components/workouts/WorkoutBuilder";
import { useToast } from "@/hooks/use-toast";
import type { Workout, WorkoutStep } from "@/types/workout";

const RouteMap = dynamic(
  () => import("@/components/charts/route-map").then((m) => m.RouteMap),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-zinc-400 text-sm">Caricamento mappa…</div> }
);

interface SuggestedRoute {
  lat: number[];
  lng: number[];
  sourceActivity: { id: string; name: string; distance: number; date: string };
  estimatedDistance: number;
  avgSpeedKmh: number;
}

export default function WorkoutDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkoutStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [route, setRoute] = useState<SuggestedRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/workouts/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setWorkout(data.data);
          setName(data.data.name);
          setDescription(data.data.description ?? "");
          setSteps(data.data.steps);
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  // Load suggested route after workout is available
  useEffect(() => {
    if (!workout) return;
    setRouteLoading(true);
    fetch(`/api/analytics/suggest-route?workoutId=${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setRoute({ ...data.route, sourceActivity: data.sourceActivity, estimatedDistance: data.estimatedDistance, avgSpeedKmh: data.avgSpeedKmh });
        } else {
          setRouteError(data.error ?? "Nessun percorso disponibile");
        }
      })
      .catch(() => setRouteError("Nessun percorso disponibile"))
      .finally(() => setRouteLoading(false));
  }, [workout, params.id]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/workouts/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, steps }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      toast({ title: "Workout aggiornato" });
    } else {
      toast({ title: "Errore", description: data.error, variant: "destructive" });
    }
  }

  if (loading) return <div className="py-12 text-center text-zinc-400 text-sm">Caricamento…</div>;
  if (!workout) return <div className="py-12 text-center text-zinc-400 text-sm">Workout non trovato.</div>;

  const estKm = route ? (route.estimatedDistance / 1000).toFixed(1) : null;
  const srcKm = route ? (route.sourceActivity.distance / 1000).toFixed(1) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Modifica Workout</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" asChild>
            <Link href={`/workouts/${params.id}/execute`}>
              <Play className="h-4 w-4" />Esegui
            </Link>
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.open(`/api/workouts/${params.id}/export?format=zwo`)}
          >
            <Download className="h-4 w-4" />.zwo
          </Button>
          {route && (
            <Button
              variant="outline"
              className="gap-2"
              title="Scarica percorso GPS in formato FIT per Wahoo ELEMNT"
              onClick={() => window.open(`/api/workouts/${params.id}/export?format=fit`)}
            >
              <Navigation className="h-4 w-4" />Percorso Wahoo (.fit)
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Salvataggio…" : "Salva"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Descrizione</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <WorkoutBuilder initialSteps={steps} onChange={setSteps} />

      {/* Percorso Consigliato */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-zinc-500" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Percorso Consigliato</span>
          {estKm && (
            <span className="ml-auto text-xs text-zinc-400">
              Distanza stimata: {estKm} km · velocità media {route?.avgSpeedKmh} km/h
            </span>
          )}
        </div>

        {routeLoading && (
          <div className="h-64 flex items-center justify-center text-zinc-400 text-sm">
            Ricerca percorso in corso…
          </div>
        )}

        {!routeLoading && routeError && (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-zinc-400">
            <MapPin className="h-8 w-8 opacity-30" />
            <p className="text-sm">Carica allenamenti con GPS per ottenere suggerimenti di percorso</p>
          </div>
        )}

        {!routeLoading && route && (
          <>
            <div className="h-72">
              <RouteMap lat={route.lat} lng={route.lng} />
            </div>
            <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                Basato su: <span className="font-medium text-zinc-700 dark:text-zinc-300">{route.sourceActivity.name}</span>
                {" "}· {srcKm} km reali
              </span>
              <Link
                href={`/activities/${route.sourceActivity.id}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Vedi attività →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
