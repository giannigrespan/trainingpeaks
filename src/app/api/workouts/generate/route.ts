export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { calculatePMC } from "@/lib/cycling-metrics";
import { format, subDays, eachDayOfInterval } from "date-fns";
import type { WorkoutStep } from "@/types/workout";

type Preset = "recovery" | "threshold" | "vo2max";

interface GenerateRequest {
  preset: Preset;
  durationMinutes: number;
  description?: string;
}

interface PowerZones {
  z1: { min: number; max: number };
  z2: { min: number; max: number };
  z3: { min: number; max: number };
  z4: { min: number; max: number };
  z5: { min: number; max: number };
}

const PRESET_LABELS: Record<Preset, string> = {
  recovery: "Recovery",
  threshold: "Soglia",
  vo2max: "VO2max",
};

const PRESET_GUIDELINES: Record<Preset, string> = {
  recovery: `
- Obiettivo: recupero attivo, nessuno stress metabolico
- Struttura: sessione continua in Z1/Z2 (50-65% FTP)
- Nessun intervallo, nessun blocco ad alta intensità
- Includi riscaldamento graduale e defaticamento
- Tipo di step preferiti: warmup, steady (z1/z2), cooldown`,

  threshold: `
- Obiettivo: migliorare la soglia anaerobica (FTP)
- Struttura classica: riscaldamento (10-15min), 4-6 intervalli a soglia (Z4, 95-105% FTP),
  recuperi in Z2 tra gli intervalli (3-5min), defaticamento (10min)
- Usa step type "interval" con offDurationSeconds e offPowerPercent per i recuperi
- Intensità principale: 0.95–1.05 (95-105% FTP)`,

  vo2max: `
- Obiettivo: migliorare VO2max e potenza aerobica massimale
- Struttura: riscaldamento (10-15min), 4-8 intervalli brevi ad alta intensità (Z5, 115-130% FTP),
  recuperi uguali o maggiori della durata dell'intervallo in Z1
- Intervalli tipici: 3-5 minuti ON, 3-5 minuti OFF
- Intensità principale: 1.15–1.30 (115-130% FTP)`,
};

function buildSystemPrompt(
  ftp: number,
  zones: PowerZones | null,
  tsb: number | null,
  ctl: number | null,
  preset: Preset,
  durationMinutes: number,
  userNote: string
): string {
  const zonesText = zones
    ? `Zone di potenza (watt):
  Z1 (recupero):  ${zones.z1.min}–${zones.z1.max}W  (< 55% FTP)
  Z2 (endurance): ${zones.z2.min}–${zones.z2.max}W  (55–75% FTP)
  Z3 (tempo):     ${zones.z3.min}–${zones.z3.max}W  (75–90% FTP)
  Z4 (soglia):    ${zones.z4.min}–${zones.z4.max}W  (90–105% FTP)
  Z5 (VO2max):    ${zones.z5.min}–${zones.z5.max}W  (> 105% FTP)`
    : `Zone calcolate automaticamente da FTP ${ftp}W`;

  const formText =
    tsb !== null
      ? `Forma attuale (TSB): ${tsb.toFixed(1)} — ${tsb > 10 ? "atleta fresco, può spingere" : tsb < -20 ? "atleta affaticato, attenzione al carico" : "forma nella norma"}`
      : "";

  const ctlText = ctl !== null ? `Fitness (CTL): ${ctl.toFixed(1)}` : "";

  return `Sei un coach di ciclismo esperto. Genera un workout strutturato per un ciclista con i seguenti dati:

FTP: ${ftp}W
${zonesText}
${formText}
${ctlText}

Preset richiesto: ${PRESET_LABELS[preset]}
Durata totale: circa ${durationMinutes} minuti
${userNote ? `Note aggiuntive dell'atleta: ${userNote}` : ""}

Linee guida per questo tipo di allenamento:
${PRESET_GUIDELINES[preset]}

Devi rispondere SOLO con un oggetto JSON valido, senza markdown, senza spiegazioni, nel seguente formato:

{
  "name": "Nome del workout (es. Threshold 4×8min)",
  "description": "Breve descrizione dell'obiettivo e della struttura (1-2 frasi)",
  "steps": [
    {
      "type": "warmup" | "steady" | "interval" | "recovery" | "cooldown" | "ramp" | "free",
      "durationSeconds": <numero intero>,
      "powerPercent": <numero decimale, es 0.75 per 75% FTP>,
      "powerPercentEnd": <opzionale, per ramp/warmup/cooldown con potenza variabile>,
      "repeat": <opzionale, numero di ripetizioni per step di tipo interval>,
      "offDurationSeconds": <opzionale, durata recupero in secondi per interval>,
      "offPowerPercent": <opzionale, potenza recupero per interval>,
      "label": <opzionale, etichetta breve>
    }
  ]
}

Regole importanti:
- La somma dei durationSeconds (tenendo conto di repeat e offDurationSeconds) deve essere circa ${durationMinutes * 60} secondi
- Per step "interval": durationSeconds è la durata del singolo intervallo ON, offDurationSeconds è il recupero; il totale è repeat × (durationSeconds + offDurationSeconds)
- powerPercent deve essere un decimale (0.5 = 50% FTP, 1.0 = 100% FTP)
- Usa sempre almeno un warmup e un cooldown
- Rispondi SOLO con il JSON, nessun altro testo`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY non configurata" },
        { status: 500 }
      );
    }

    const body: GenerateRequest = await req.json();
    const { preset, durationMinutes, description = "" } = body;

    if (!["recovery", "threshold", "vo2max"].includes(preset)) {
      return NextResponse.json({ success: false, error: "Preset non valido" }, { status: 400 });
    }
    if (!durationMinutes || durationMinutes < 10 || durationMinutes > 300) {
      return NextResponse.json({ success: false, error: "Durata non valida (10-300 min)" }, { status: 400 });
    }

    const userId = (session.user as { id: string }).id;
    const db = await getDb();

    // Fetch user profile
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    const ftp: number = user?.ftp ?? 200;
    const powerZones: PowerZones | null = user?.powerZones ?? null;

    // Compute current CTL/ATL/TSB from last 90 days of activities
    const fetchStart = subDays(new Date(), 90 + 126);
    const activities = await db
      .collection("activities")
      .find({ userId, activityDate: { $gte: fetchStart } })
      .sort({ activityDate: 1 })
      .toArray();

    const tssMap = new Map<string, number>();
    for (const a of activities) {
      const tss = typeof a.tss === "number" && a.tss > 0 && a.tss <= 500 ? a.tss : 0;
      const dateKey = format(new Date(a.activityDate), "yyyy-MM-dd");
      tssMap.set(dateKey, (tssMap.get(dateKey) || 0) + tss);
    }
    const allDays = eachDayOfInterval({ start: fetchStart, end: new Date() });
    const dailyTSS = allDays.map((d) => ({
      date: format(d, "yyyy-MM-dd"),
      tss: tssMap.get(format(d, "yyyy-MM-dd")) || 0,
    }));
    const pmc = calculatePMC(dailyTSS);
    const lastPmc = pmc.at(-1);

    // Build prompt and call Gemini
    const systemPrompt = buildSystemPrompt(
      ftp,
      powerZones,
      lastPmc?.tsb ?? null,
      lastPmc?.ctl ?? null,
      preset,
      durationMinutes,
      description
    );

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
    });

    const rawText = result.response.text().trim();

    // Strip possible markdown code fences
    const jsonText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    let parsed: { name: string; description: string; steps: WorkoutStep[] };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("Gemini response non è JSON valido:", rawText);
      return NextResponse.json(
        { success: false, error: "L'AI ha restituito un formato non valido. Riprova." },
        { status: 500 }
      );
    }

    // Ensure every step has a unique id
    const steps: WorkoutStep[] = parsed.steps.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
    }));

    return NextResponse.json({
      success: true,
      data: { name: parsed.name, description: parsed.description, steps },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Generate workout error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
