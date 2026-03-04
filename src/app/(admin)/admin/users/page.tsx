"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  createdAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  trialing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  canceled: "bg-red-500/20 text-red-400 border-red-500/30",
  past_due: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  none: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

function trialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000)
  );
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<string | null>(null); // userId being modified
  const [trialDays, setTrialDays] = useState<Record<string, string>>({});

  const sessionUser = session?.user as { role?: string } | undefined;

  useEffect(() => {
    if (status === "loading") return;
    if (sessionUser?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [status, sessionUser, router]);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function patchUser(id: string, body: object) {
    setPending(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      toast({ title: "Aggiornato", description: "Modifica applicata." });
      await fetchUsers();
    } else {
      toast({
        title: "Errore",
        description: data.error ?? "Errore sconosciuto",
        variant: "destructive",
      });
    }
    setPending(null);
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-emerald-400" size={24} />
          <h1 className="text-2xl font-bold text-white">Admin — Utenti</h1>
          <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">
            {users.length} utenti
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          className="border-zinc-700 text-zinc-300"
        >
          <RefreshCw size={14} className="mr-1" />
          Aggiorna
        </Button>
      </div>

      <Input
        placeholder="Cerca per nome o email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-zinc-900 border-zinc-700 text-white max-w-sm"
      />

      <div className="space-y-3">
        {filtered.map((u) => {
          const days = trialDays[u.id] ?? "30";
          const isPending = pending === u.id;

          return (
            <Card
              key={u.id}
              className="bg-zinc-900 border-zinc-800 text-white"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {u.name}
                      {u.role === "admin" && (
                        <span className="ml-2 text-xs text-emerald-400">
                          (admin)
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-zinc-400">{u.email}</p>
                    {u.createdAt && (
                      <p className="text-xs text-zinc-600 mt-0.5">
                        Registrato:{" "}
                        {new Date(u.createdAt).toLocaleDateString("it-IT")}
                      </p>
                    )}
                  </div>
                  <Badge
                    className={`text-xs border ${STATUS_COLORS[u.subscriptionStatus] ?? STATUS_COLORS.none}`}
                  >
                    {u.subscriptionStatus}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {/* Info riga */}
                <div className="text-xs text-zinc-500 flex flex-wrap gap-4">
                  {u.subscriptionStatus === "trialing" && u.trialEndsAt && (
                    <span>
                      Trial:{" "}
                      <span className="text-zinc-300">
                        {trialDaysLeft(u.trialEndsAt)} giorni rimasti (
                        {new Date(u.trialEndsAt).toLocaleDateString("it-IT")})
                      </span>
                    </span>
                  )}
                  {u.stripeSubscriptionId && (
                    <span>
                      Stripe sub:{" "}
                      <span className="text-zinc-300 font-mono">
                        {u.stripeSubscriptionId}
                      </span>
                    </span>
                  )}
                  {u.subscriptionCurrentPeriodEnd && (
                    <span>
                      Rinnovo:{" "}
                      <span className="text-zinc-300">
                        {new Date(
                          u.subscriptionCurrentPeriodEnd
                        ).toLocaleDateString("it-IT")}
                      </span>
                    </span>
                  )}
                </div>

                {/* Azioni */}
                <div className="flex flex-wrap gap-2 items-center pt-1">
                  {/* Estendi trial */}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={days}
                      onChange={(e) =>
                        setTrialDays((prev) => ({
                          ...prev,
                          [u.id]: e.target.value,
                        }))
                      }
                      className="w-20 h-8 text-xs bg-zinc-800 border-zinc-700 text-white"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-blue-700 text-blue-300 hover:bg-blue-900/30"
                      disabled={isPending}
                      onClick={() =>
                        patchUser(u.id, {
                          action: "extend_trial",
                          days: parseInt(days),
                        })
                      }
                    >
                      {isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        `+${days}gg trial`
                      )}
                    </Button>
                  </div>

                  {/* Forza active */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-green-700 text-green-300 hover:bg-green-900/30"
                    disabled={isPending || u.subscriptionStatus === "active"}
                    onClick={() =>
                      patchUser(u.id, {
                        action: "set_status",
                        status: "active",
                      })
                    }
                  >
                    Forza attivo
                  </Button>

                  {/* Cancella Stripe */}
                  {u.stripeSubscriptionId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-red-700 text-red-400 hover:bg-red-900/30"
                      disabled={isPending}
                      onClick={() => {
                        if (
                          confirm(
                            `Cancellare l'abbonamento Stripe di ${u.name}?`
                          )
                        ) {
                          patchUser(u.id, { action: "cancel_stripe" });
                        }
                      }}
                    >
                      Cancella sub Stripe
                    </Button>
                  )}

                  {/* Revoca accesso */}
                  {u.subscriptionStatus !== "canceled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-zinc-600 text-zinc-400 hover:bg-zinc-800"
                      disabled={isPending}
                      onClick={() => {
                        if (confirm(`Revocare l'accesso a ${u.name}?`)) {
                          patchUser(u.id, {
                            action: "set_status",
                            status: "canceled",
                          });
                        }
                      }}
                    >
                      Revoca accesso
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-zinc-500 py-12">
            Nessun utente trovato.
          </p>
        )}
      </div>
    </div>
  );
}
