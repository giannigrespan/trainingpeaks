"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  addMonths,
  subMonths,
} from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity } from "@/types";

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function tssChipClass(tss: number) {
  if (tss <= 0)
    return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  if (tss < 50)
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
  if (tss < 100)
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
  if (tss < 150)
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? m + "m" : ""}`;
  return `${m}m`;
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async (month: Date) => {
    setLoading(true);
    const viewStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const viewEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });

    try {
      const params = new URLSearchParams({
        from: viewStart.toISOString(),
        to: viewEnd.toISOString(),
        limit: "200",
        sort: "activityDate",
        order: "asc",
      });
      const res = await fetch(`/api/activities?${params}`);
      const json = await res.json();
      if (json.success) setActivities(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities(currentMonth);
  }, [currentMonth, fetchActivities]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
  });

  const activitiesForDay = (day: Date) =>
    activities.filter((a) => isSameDay(new Date(a.activityDate), day));

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Calendario
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            aria-label="Mese precedente"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="w-40 text-center text-base font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: it })}
          </span>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            aria-label="Mese successivo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {WEEK_DAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const dayActivities = activitiesForDay(day);
            const extra = dayActivities.length - 2;

            return (
              <div
                key={i}
                className={cn(
                  "min-h-[100px] p-1.5 border-b border-r border-zinc-100 dark:border-zinc-800",
                  !inMonth && "bg-zinc-50 dark:bg-zinc-950/50",
                  i % 7 === 6 && "border-r-0"
                )}
              >
                {/* Day number */}
                <div className="flex justify-end mb-1">
                  <span
                    className={cn(
                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                      today
                        ? "bg-blue-600 text-white"
                        : inMonth
                        ? "text-zinc-700 dark:text-zinc-300"
                        : "text-zinc-300 dark:text-zinc-600"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Activities */}
                {loading && inMonth ? (
                  <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse mb-1" />
                ) : (
                  <>
                    {dayActivities.slice(0, 2).map((a) => (
                      <button
                        key={a._id}
                        onClick={() => router.push(`/activities/${a._id}`)}
                        className={cn(
                          "w-full text-left text-xs rounded px-1.5 py-0.5 mb-0.5 truncate font-medium transition-opacity hover:opacity-80",
                          tssChipClass(a.tss)
                        )}
                        title={`${a.name} — ${formatDuration(a.duration)}${a.tss ? ` — TSS ${Math.round(a.tss)}` : ""}`}
                      >
                        {a.name || a.sport}
                        <span className="opacity-60 ml-1">
                          {formatDuration(a.duration)}
                        </span>
                      </button>
                    ))}
                    {extra > 0 && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 pl-1">
                        +{extra} altre
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="font-medium">Intensità (TSS):</span>
        {[
          { label: "< 50", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
          { label: "50–99", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
          { label: "100–149", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
          { label: "≥ 150", cls: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
        ].map(({ label, cls }) => (
          <span key={label} className={cn("px-2 py-0.5 rounded font-medium", cls)}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
