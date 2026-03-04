"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkoutBuilder } from "@/components/workouts/WorkoutBuilder";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutStep } from "@/types/workout";

type Preset = "recovery" | "threshold" | "vo2max";

const PRESETS: { value: Preset; label: string; emoji: string }[] = [
  { value: "recovery", label: "Recovery", emoji: "🔋" },
  { value: "threshold", label: "Soglia", emoji: "🎯" },
  { value: "vo2max", label: "VO2max", emoji: "⚡" },
];

export default function NewWorkoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkoutStep[]>([]);
  const [saving, setSaving] = useState(false);

  // AI Coach state
  const [preset, setPreset] = useState<Preset>("threshold");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [aiNote, setAiNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [builderKey, setBuilderKey] = useState(0);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/workouts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset, durationMinutes, description: aiNote }),
      });
      const data = await res.json();
      if (data.success) {
        setName(data.data.name);
        setDescription(data.data.description);
        setSteps(data.data.steps);
        setBuilderKey((k) => k + 1);
        toast({ title: "Workout generato!", description: data.data.name });
      } else {
        toast({ title: "Errore AI", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Errore di rete", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

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

      {/* AI Coach panel */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-sm text-blue-800 dark:text-blue-300">AI Coach</span>
          <span className="text-xs text-blue-500 dark:text-blue-500">— genera un workout personalizzato in base alla tua forma attuale</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                preset === p.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-blue-400"
              }`}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-1 flex-1">
            <Label className="text-xs text-zinc-600 dark:text-zinc-400">Durata (minuti)</Label>
            <Input
              type="number"
              min={10}
              max={300}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="bg-white dark:bg-zinc-800"
            />
          </div>
          <div className="space-y-1 flex-[2]">
            <Label className="text-xs text-zinc-600 dark:text-zinc-400">Note aggiuntive (opzionale)</Label>
            <Input
              placeholder="es. ho gare domenica, voglio lavorare sulla partenza..."
              value={aiNote}
              onChange={(e) => setAiNote(e.target.value)}
              className="bg-white dark:bg-zinc-800"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            disabled={generating}
            variant="outline"
            className="gap-2 border-blue-400 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generazione…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Genera Workout
              </>
            )}
          </Button>
        </div>
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

      <WorkoutBuilder key={builderKey} initialSteps={steps} onChange={setSteps} />
    </div>
  );
}
