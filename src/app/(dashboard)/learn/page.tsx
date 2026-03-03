"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

interface UserMetrics {
  ftp: number;
  ctl: number;
  atl: number;
  tsb: number;
}

function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 py-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 text-sm text-zinc-600 dark:text-zinc-400 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function Pill({ value, color }: { value: string; color: string }) {
  return (
    <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${color}`}>
      {value}
    </span>
  );
}

export default function LearnPage() {
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/profile").then((r) => r.json()),
      fetch("/api/analytics/pmc?days=1").then((r) => r.json()),
    ]).then(([profile, pmc]) => {
      const ftp: number = profile.success ? (profile.data.ftp ?? 0) : 0;
      const lastPmc = pmc.success && pmc.data.length > 0 ? pmc.data[pmc.data.length - 1] : null;
      setMetrics({
        ftp,
        ctl: lastPmc?.ctl ?? 0,
        atl: lastPmc?.atl ?? 0,
        tsb: lastPmc?.tsb ?? 0,
      });
    });
  }, []);

  const ftp = metrics?.ftp ?? 0;
  const ctl = metrics?.ctl ?? 0;
  const atl = metrics?.atl ?? 0;
  const tsb = metrics?.tsb ?? 0;

  const exampleNP = ftp > 0 ? Math.round(ftp * 0.88) : 220;
  const exampleIF = ftp > 0 ? (exampleNP / ftp).toFixed(2) : "0.88";
  const exampleTSS = ftp > 0 ? Math.round((3600 * exampleNP * Number(exampleIF)) / (ftp * 3600) * 100) : 78;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Guida alle Metriche</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Capire FTP, NP, IF, TSS e il PMC con i tuoi valori reali come esempio.
        </p>
      </div>

      <div className="space-y-3">
        <AccordionItem title="FTP — Functional Threshold Power" defaultOpen>
          <p>
            L&apos;FTP è la potenza media massima che riesci a mantenere per un&apos;ora. È la base di tutte le
            altre metriche: definisce le zone, normalizza l&apos;intensità e calibra il carico.
          </p>
          <p>
            Si misura tipicamente con un test da 20 minuti (FTP = 95% della media) o da 8 minuti.
            Ricalibra l&apos;FTP ogni 6–8 settimane o dopo un picco di forma evidente.
          </p>
          {ftp > 0 ? (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-blue-800 dark:text-blue-300">
              Il tuo FTP attuale è <strong>{ftp} W</strong>. Le tue zone di potenza sono calibrate su questo valore.
            </div>
          ) : (
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-500">
              Imposta il tuo FTP nelle <strong>Impostazioni</strong> per personalizzare tutte le metriche.
            </div>
          )}
        </AccordionItem>

        <AccordionItem title="NP & IF — Normalized Power e Intensity Factor">
          <p>
            <strong>Normalized Power (NP)</strong> è una stima della potenza &quot;equivalente&quot; a regime costante
            che avrebbe lo stesso costo fisiologico di un&apos;uscita variabile. Usa la media mobile a 30 secondi
            elevata alla quarta potenza.
          </p>
          <p>
            <strong>Intensity Factor (IF)</strong> = NP ÷ FTP. Indica quanto è intensa l&apos;uscita rispetto alla
            tua soglia:
          </p>
          <div className="flex flex-wrap gap-2">
            <Pill value="&lt; 0.60 Recovery"     color="bg-zinc-100 text-zinc-600" />
            <Pill value="0.60–0.75 Endurance"    color="bg-blue-100 text-blue-700" />
            <Pill value="0.75–0.90 Tempo"        color="bg-green-100 text-green-700" />
            <Pill value="0.90–1.00 Threshold"    color="bg-orange-100 text-orange-700" />
            <Pill value="&gt; 1.00 VO2max+"      color="bg-red-100 text-red-700" />
          </div>
          {ftp > 0 && (
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3 text-xs text-zinc-600 dark:text-zinc-400">
              Esempio: un&apos;uscita con NP {exampleNP} W su FTP {ftp} W → IF {exampleIF} → zona <strong>Tempo</strong>.
            </div>
          )}
        </AccordionItem>

        <AccordionItem title="TSS — Training Stress Score">
          <p>
            Il TSS quantifica il carico complessivo di un allenamento combinando durata e intensità:
          </p>
          <pre className="rounded bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-xs font-mono">
            TSS = (durata_s × NP × IF) / (FTP × 3600) × 100
          </pre>
          <p>Scala orientativa:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>&lt; 50</strong> – Recupero, impatto minimo</li>
            <li><strong>50–100</strong> – Allenamento moderato, recupero in 24h</li>
            <li><strong>100–150</strong> – Carico alto, recupero in 48h</li>
            <li><strong>&gt; 150</strong> – Carico molto alto, 72h+ per recupero completo</li>
          </ul>
          {ftp > 0 && (
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3 text-xs text-zinc-600 dark:text-zinc-400">
              Esempio: 1h a NP {exampleNP} W → TSS ≈ <strong>{exampleTSS}</strong>.
            </div>
          )}
        </AccordionItem>

        <AccordionItem title="CTL & ATL — Fitness e Fatica">
          <p>
            <strong>CTL (Chronic Training Load)</strong> è la media esponenziale del TSS giornaliero degli ultimi
            42 giorni. Rappresenta la tua <em>fitness</em>: più è alto, più sei allenato.
          </p>
          <p>
            <strong>ATL (Acute Training Load)</strong> è la media degli ultimi 7 giorni. Rappresenta la
            <em>fatica acuta</em>: sale rapidamente dopo carichi elevati e scende altrettanto in fretta.
          </p>
          {ctl > 0 ? (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3 text-emerald-800 dark:text-emerald-300 space-y-1 text-xs">
              <p>Il tuo <strong>CTL oggi: {ctl.toFixed(1)}</strong> — fitness accumulata negli ultimi 6 settimane.</p>
              <p>Il tuo <strong>ATL oggi: {atl.toFixed(1)}</strong> — fatica degli ultimi 7 giorni.</p>
            </div>
          ) : null}
          <p>
            Per aumentare il CTL occorre alzare il TSS medio settimanale gradualmente (+5–7 TSS/settimana è
            una progressione sostenibile per la maggior parte degli atleti).
          </p>
        </AccordionItem>

        <AccordionItem title="TSB — Forma (Training Stress Balance)">
          <p>
            <strong>TSB = CTL − ATL</strong>. Indica il tuo stato di forma netto:
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="w-24 text-xs font-medium text-gray-400">TSB &gt; 25</span>
              <span className="text-xs text-gray-500">Transizione / de-allenamento in corso</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-24 text-xs font-medium text-emerald-600">TSB 10–25</span>
              <span className="text-xs text-gray-500">Fresco, pronto per gare o test</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-24 text-xs font-medium text-blue-600">TSB -10–10</span>
              <span className="text-xs text-gray-500">Forma ottimale, equilibrio carico/recupero</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-24 text-xs font-medium text-amber-600">TSB -10–-30</span>
              <span className="text-xs text-gray-500">Affaticato, fase di carico intensa</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-24 text-xs font-medium text-red-600">TSB &lt; -30</span>
              <span className="text-xs text-gray-500">Rischio sovraccarico, recupero necessario</span>
            </div>
          </div>
          {ctl > 0 ? (
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3 text-xs text-zinc-600 dark:text-zinc-400">
              Il tuo TSB oggi è <strong>{tsb >= 0 ? "+" : ""}{tsb.toFixed(1)}</strong>.{" "}
              {tsb > 25 && "Stai perdendo forma — riprenditi ad allenarti."}
              {tsb > 10 && tsb <= 25 && "Sei fresco: ottimo momento per un test o una gara."}
              {tsb >= -10 && tsb <= 10 && "Forma ottimale: continua con il piano."}
              {tsb >= -30 && tsb < -10 && "Sei in fase di carico: pianifica un recupero a breve."}
              {tsb < -30 && "Rischio sovraccarico: inserisci una settimana di scarico."}
            </div>
          ) : null}
        </AccordionItem>
      </div>
    </div>
  );
}
