"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Play, Pencil, Trash2, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkoutProfileChart } from "@/components/workouts/WorkoutProfileChart";
import { formatDuration } from "@/lib/workout-utils";
import { useToast } from "@/hooks/use-toast";
import type { Workout } from "@/types/workout";

export default function WorkoutsPage() {
  const { toast } = useToast();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function fetchWorkouts() {
    const res = await fetch("/api/workouts");
    const data = await res.json();
    if (data.success) setWorkouts(data.data);
    setLoading(false);
  }

  useEffect(() => { fetchWorkouts(); }, []);

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/workouts/${id}`, { method: "DELETE" });
    setWorkouts((prev) => prev.filter((w) => w._id !== id));
    setDeleting(null);
  }

  async function handleImport(file: File) {
    setImporting(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/workouts/import", { method: "POST", body: form });
    const data = await res.json();
    setImporting(false);
    if (data.success) {
      toast({ title: "Workout importato", description: "File caricato correttamente." });
      fetchWorkouts();
    } else {
      toast({ title: "Errore", description: data.error ?? "Import fallito", variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">
        Caricamento workout…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Workout Virtuali</h1>
          <p className="text-sm text-zinc-500">Crea e gestisci i tuoi allenamenti strutturati</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={importRef}
            type="file"
            accept=".zwo,.mrc,.erg"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleImport(e.target.files[0]); }}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => importRef.current?.click()}
            disabled={importing}
          >
            <Upload className="h-4 w-4" />
            {importing ? "Importando…" : "Importa .zwo / .mrc"}
          </Button>
          <Button size="sm" asChild className="gap-2">
            <Link href="/workouts/new">
              <Plus className="h-4 w-4" />
              Nuovo workout
            </Link>
          </Button>
        </div>
      </div>

      {/* Grid */}
      {workouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 py-16 text-center">
          <p className="text-zinc-400 mb-4">Nessun workout ancora</p>
          <Button asChild className="gap-2">
            <Link href="/workouts/new"><Plus className="h-4 w-4" />Crea il primo</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {workouts.map((w) => (
            <div
              key={w._id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 space-y-3"
            >
              <WorkoutProfileChart steps={w.steps} height={64} />

              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{w.name}</h3>
                {w.description && (
                  <p className="text-xs text-zinc-400 truncate">{w.description}</p>
                )}
                <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                  <span>{formatDuration(w.totalDurationSeconds)}</span>
                  <span>TSS ~{w.estimatedTSS}</span>
                </div>
              </div>

              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="default" className="h-7 gap-1 text-xs" asChild>
                  <Link href={`/workouts/${w._id}/execute`}>
                    <Play className="h-3 w-3" />Esegui
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" asChild>
                  <Link href={`/workouts/${w._id}`}>
                    <Pencil className="h-3 w-3" />Modifica
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={() => window.open(`/api/workouts/${w._id}/export?format=zwo`)}
                >
                  <Download className="h-3 w-3" />.zwo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs text-red-500 hover:text-red-600"
                  disabled={deleting === w._id}
                  onClick={() => handleDelete(w._id!)}
                >
                  <Trash2 className="h-3 w-3" />
                  {deleting === w._id ? "…" : ""}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
