"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkoutBuilder } from "@/components/workouts/WorkoutBuilder";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutStep } from "@/types/workout";

export default function NewWorkoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkoutStep[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast({ title: "Nome richiesto", variant: "destructive" });
      return;
    }
    if (steps.length === 0) {
      toast({ title: "Aggiungi almeno un blocco", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, steps, source: "builder" }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      toast({ title: "Workout salvato!" });
      router.push(`/workouts/${data.data.id}`);
    } else {
      toast({ title: "Errore", description: data.error, variant: "destructive" });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Nuovo Workout</h1>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Salvataggio…" : "Salva"}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input
            placeholder="es. Threshold 4×8min"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Descrizione (opzionale)</Label>
          <Input
            placeholder="Note sul workout..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <WorkoutBuilder onChange={setSteps} />
    </div>
  );
}
