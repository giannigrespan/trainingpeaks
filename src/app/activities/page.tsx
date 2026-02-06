"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { format } from "date-fns";
import { it } from "date-fns/locale";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function ActivitiesPage() {
  const { status } = useSession();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("activityDate");
  const [order, setOrder] = useState("desc");

  const { data, isLoading } = useQuery({
    queryKey: ["activities", page, search, sort, order],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sort,
        order,
        ...(search && { search }),
      });
      const res = await fetch(`/api/activities?${params}`);
      const json = await res.json();
      return json.data;
    },
    enabled: status === "authenticated",
  });

  if (status === "loading") {
    return <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
      <div className="animate-pulse text-[var(--color-text-secondary)]">Caricamento...</div>
    </div>;
  }

  if (status === "unauthenticated") redirect("/login");

  const activities = data?.activities || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  function handleSort(field: string) {
    if (sort === field) {
      setOrder(order === "desc" ? "asc" : "desc");
    } else {
      setSort(field);
      setOrder("desc");
    }
  }

  const SortIcon = ({ field }: { field: string }) => (
    sort === field ? (
      <span className="ml-1 text-xs">{order === "desc" ? "↓" : "↑"}</span>
    ) : null
  );

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Attività</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {pagination.total} attività totali
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="primary">Carica Attività</Button>
          </Link>
        </div>

        <Card>
          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Cerca per nome..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="py-12 text-center text-[var(--color-text-secondary)]">Caricamento...</div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center text-[var(--color-text-secondary)]">
              Nessuna attività trovata
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-3 px-2 font-medium text-[var(--color-text-secondary)] cursor-pointer" onClick={() => handleSort("activityDate")}>
                        Data <SortIcon field="activityDate" />
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-[var(--color-text-secondary)] cursor-pointer" onClick={() => handleSort("name")}>
                        Nome <SortIcon field="name" />
                      </th>
                      <th className="text-right py-3 px-2 font-medium text-[var(--color-text-secondary)]">Durata</th>
                      <th className="text-right py-3 px-2 font-medium text-[var(--color-text-secondary)] cursor-pointer" onClick={() => handleSort("tss")}>
                        TSS <SortIcon field="tss" />
                      </th>
                      <th className="text-right py-3 px-2 font-medium text-[var(--color-text-secondary)] hidden sm:table-cell cursor-pointer" onClick={() => handleSort("normalizedPower")}>
                        NP <SortIcon field="normalizedPower" />
                      </th>
                      <th className="text-right py-3 px-2 font-medium text-[var(--color-text-secondary)] hidden md:table-cell">Dist.</th>
                      <th className="text-right py-3 px-2 font-medium text-[var(--color-text-secondary)] hidden lg:table-cell">IF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a: Record<string, unknown>) => (
                      <tr
                        key={a._id as string}
                        className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)] cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/activities/${a._id}`}
                      >
                        <td className="py-3 px-2 tabular-nums">
                          {format(new Date(a.activityDate as string), "dd/MM/yy", { locale: it })}
                        </td>
                        <td className="py-3 px-2 font-medium max-w-[200px] truncate">{a.name as string}</td>
                        <td className="py-3 px-2 text-right tabular-nums">{formatDuration(a.duration as number)}</td>
                        <td className="py-3 px-2 text-right font-medium tabular-nums">{Math.round(a.tss as number)}</td>
                        <td className="py-3 px-2 text-right tabular-nums hidden sm:table-cell">{a.normalizedPower as number}W</td>
                        <td className="py-3 px-2 text-right tabular-nums hidden md:table-cell">{(a.distance as number).toFixed(1)}km</td>
                        <td className="py-3 px-2 text-right tabular-nums hidden lg:table-cell">{(a.intensityFactor as number).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Precedente
                  </Button>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    Pagina {page} di {pagination.pages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === pagination.pages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Successiva
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
