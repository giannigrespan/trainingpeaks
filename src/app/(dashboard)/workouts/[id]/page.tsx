"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Save, Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkoutBuilder } from "@/components/workouts/WorkoutBuilder";
import { useToast } from "@/hooks/use-toast";
import type { Workout, WorkoutStep } from "@/types/workout";

export default function WorkoutDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkoutStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Modifica Workout</h1>
        <div className="flex gap-2">
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
    </div>
  );
}
