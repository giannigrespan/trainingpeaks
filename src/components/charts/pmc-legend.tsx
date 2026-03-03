"use client";

const TSB_ZONES = [
  { range: "> +25",      label: "Transizione",    bg: "bg-gray-200 dark:bg-gray-600" },
  { range: "+10 / +25",  label: "Fresco",         bg: "bg-emerald-200 dark:bg-emerald-700" },
  { range: "-10 / +10",  label: "Forma ottimale", bg: "bg-blue-200 dark:bg-blue-700" },
  { range: "-30 / -10",  label: "Affaticato",     bg: "bg-amber-200 dark:bg-amber-700" },
  { range: "< -30",      label: "Sovraccarico",   bg: "bg-red-200 dark:bg-red-700" },
];

const DAYS_OPTIONS = [30, 90, 180, 365];

interface PMCLegendProps {
  days: number;
  onDaysChange: (d: number) => void;
}

export function PMCLegend({ days, onDaysChange }: PMCLegendProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      {/* Series legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {/* CTL — area riempita blu */}
        <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span
            className="inline-block h-3 w-5 rounded-sm border border-blue-400"
            style={{ background: "rgba(59,130,246,0.25)" }}
          />
          CTL – Fitness
        </span>
        {/* ATL — linea magenta */}
        <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span
            className="inline-block h-0.5 w-5"
            style={{ background: "#EC4899" }}
          />
          ATL – Fatica
        </span>
        {/* TSB — linea gialla */}
        <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span
            className="inline-block h-0.5 w-5"
            style={{ background: "#F59E0B" }}
          />
          TSB – Forma
        </span>
        {/* TSS — pallino rosso */}
        <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "#EF4444" }}
          />
          TSS giornaliero
        </span>

        {/* TSB Zones */}
        <span className="flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-700 pl-3 ml-1">
          {TSB_ZONES.map((z) => (
            <span key={z.label} className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${z.bg}`} />
              {z.label}
            </span>
          ))}
        </span>
      </div>

      {/* Day range selector */}
      <div className="flex gap-1 shrink-0">
        {DAYS_OPTIONS.map((d) => (
          <button
            key={d}
            onClick={() => onDaysChange(d)}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              days === d
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {d}gg
          </button>
        ))}
      </div>
    </div>
  );
}
