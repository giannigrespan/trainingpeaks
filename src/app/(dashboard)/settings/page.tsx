"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Save, Zap, Heart, User, Link2, Link2Off, RefreshCw, Lightbulb, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  name: string;
  email: string;
  ftp: number;
  weight: number;
  powerZones: {
    z1: { min: number; max: number };
    z2: { min: number; max: number };
    z3: { min: number; max: number };
    z4: { min: number; max: number };
    z5: { min: number; max: number };
    z6: { min: number; max: number | null };
  };
  hrZones: {
    z1: { min: number; max: number };
    z2: { min: number; max: number };
    z3: { min: number; max: number };
    z4: { min: number; max: number };
    z5: { min: number; max: number };
  };
}

interface WahooStatus {
  connected: boolean;
  connectedAt?: string;
  lastSyncAt?: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [ftp, setFtp] = useState(200);
  const [weight, setWeight] = useState(70);

  // FTP suggestion
  const [ftpSuggestion, setFtpSuggestion] = useState<{
    suggestedFtp: number;
    bestPower: number;
    bestDurationMinutes: number;
    activityName: string;
    activityDate: string;
  } | null>(null);

  // Wahoo state
  const [wahooStatus, setWahooStatus] = useState<WahooStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setProfile(data.data);
          setName(data.data.name);
          setFtp(data.data.ftp);
          setWeight(data.data.weight);
        }
      })
      .finally(() => setLoading(false));

    fetch("/api/integrations/wahoo/status")
      .then((res) => res.json())
      .then((data) => { if (data.success) setWahooStatus(data.data); });

    fetch("/api/analytics/ftp-suggestion")
      .then((res) => res.json())
      .then((data) => { if (data.success && data.data) setFtpSuggestion(data.data); });

    // Handle OAuth redirect result
    const params = new URLSearchParams(window.location.search);
    const wahooParam = params.get("wahoo");
    if (wahooParam === "connected") {
      toast({ title: "Wahoo collegato", description: "Account Wahoo connesso con successo!" });
      fetch("/api/integrations/wahoo/status")
        .then((res) => res.json())
        .then((data) => { if (data.success) setWahooStatus(data.data); });
    } else if (wahooParam === "error") {
      toast({
        title: "Errore Wahoo",
        description: "Impossibile collegare l'account Wahoo.",
        variant: "destructive",
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ftp, weight }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "Salvato",
          description: "Impostazioni aggiornate con successo",
        });
        // Refresh profile to get new power zones
        const refreshRes = await fetch("/api/user/profile");
        const refreshData = await refreshRes.json();
        if (refreshData.success) setProfile(refreshData.data);
      } else {
        toast({
          title: "Errore",
          description: data.error || "Errore nel salvataggio",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Errore",
        description: "Errore di connessione",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleWahooDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/wahoo/disconnect", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setWahooStatus({ connected: false });
        toast({ title: "Wahoo disconnesso", description: "Account Wahoo disconnesso." });
      }
    } catch {
      toast({
        title: "Errore",
        description: "Errore durante la disconnessione.",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleManageBilling() {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      toast({ title: "Errore", description: "Impossibile aprire il portale di fatturazione.", variant: "destructive" });
    } finally {
      setBillingLoading(false);
    }
  }

  async function handleWahooSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/integrations/wahoo/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const description = data.hasMore
          ? `Importati: ${data.imported}${data.errors ? `, errori: ${data.errors}` : ""}. Ci sono altri workout da importare, clicca di nuovo.`
          : `Importati: ${data.imported}, già presenti: ${data.skipped}${data.errors ? `, errori: ${data.errors}` : ""}`;
        toast({
          title: data.hasMore ? "Importazione parziale" : "Sincronizzazione completata",
          description,
        });
        fetch("/api/integrations/wahoo/status")
          .then((r) => r.json())
          .then((d) => { if (d.success) setWahooStatus(d.data); });
      } else {
        toast({
          title: "Errore sincronizzazione",
          description: data.error || "Errore durante l'importazione.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Errore",
        description: "Errore di connessione.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const zoneNames = ["Recovery", "Endurance", "Tempo", "Threshold", "VO2max", "Anaerobic"];
  const zoneColors = [
    "bg-gray-200",
    "bg-blue-200",
    "bg-green-200",
    "bg-yellow-200",
    "bg-red-200",
    "bg-purple-200",
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
        <p className="text-sm text-gray-500">Profilo atleta e zone di potenza</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" /> Profilo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ftp">FTP (Watt)</Label>
              <Input
                id="ftp"
                type="number"
                value={ftp}
                onChange={(e) => setFtp(parseInt(e.target.value) || 0)}
                min={50}
                max={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                min={30}
                max={200}
                step={0.1}
              />
            </div>
          </div>
          {ftpSuggestion && ftpSuggestion.suggestedFtp !== ftp && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-blue-700 dark:text-blue-300">
                    FTP suggerito: {ftpSuggestion.suggestedFtp}W
                  </span>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    Best {ftpSuggestion.bestDurationMinutes}min = {ftpSuggestion.bestPower}W
                    {ftpSuggestion.activityName ? ` · "${ftpSuggestion.activityName}"` : ""}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 flex-shrink-0"
                onClick={() => setFtp(ftpSuggestion.suggestedFtp)}
              >
                Applica
              </Button>
            </div>
          )}
          <div className="text-sm text-gray-500">
            W/kg: <span className="font-semibold tabular-nums">{weight > 0 ? (ftp / weight).toFixed(2) : "0"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Power Zones */}
      {profile?.powerZones && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5" /> Zone Potenza
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-gray-500">
              Calcolate automaticamente dal tuo FTP di {ftp}W
            </p>
            <div className="space-y-2">
              {(["z1", "z2", "z3", "z4", "z5", "z6"] as const).map((zone, i) => (
                <div
                  key={zone}
                  className="flex items-center gap-3 rounded-lg p-2"
                >
                  <div className={`h-3 w-3 rounded-full ${zoneColors[i]}`} />
                  <span className="w-24 text-sm font-medium">
                    Z{i + 1} {zoneNames[i]}
                  </span>
                  <span className="text-sm tabular-nums text-gray-600">
                    {profile.powerZones[zone]?.max == null
                      ? `> ${profile.powerZones[zone]?.min ?? "-"}W`
                      : `${profile.powerZones[zone]?.min ?? "-"} – ${profile.powerZones[zone]?.max}W`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* HR Zones */}
      {profile?.hrZones && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="h-5 w-5" /> Zone Frequenza Cardiaca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(["z1", "z2", "z3", "z4", "z5"] as const).map((zone, i) => (
                <div
                  key={zone}
                  className="flex items-center gap-3 rounded-lg p-2"
                >
                  <div className={`h-3 w-3 rounded-full ${zoneColors[i]}`} />
                  <span className="w-24 text-sm font-medium">
                    Z{i + 1} {zoneNames[i]}
                  </span>
                  <span className="text-sm tabular-nums text-gray-600">
                    {profile.hrZones[zone].min} - {profile.hrZones[zone].max}{" "}
                    bpm
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wahoo Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="h-5 w-5" /> Integrazione Wahoo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-500">
            Collega il tuo account Wahoo per importare automaticamente gli allenamenti dopo ogni sync.
          </p>
          {wahooStatus?.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Link2 className="h-4 w-4" />
                <span>Account Wahoo collegato</span>
              </div>
              {wahooStatus.connectedAt && (
                <p className="text-xs text-gray-400">
                  Collegato il: {new Date(wahooStatus.connectedAt).toLocaleDateString("it-IT")}
                </p>
              )}
              {wahooStatus.lastSyncAt && (
                <p className="text-xs text-gray-400">
                  Ultima sincronizzazione:{" "}
                  {new Date(wahooStatus.lastSyncAt).toLocaleString("it-IT")}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWahooSync}
                  disabled={syncing || disconnecting}
                >
                  {syncing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Importa storico
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWahooDisconnect}
                  disabled={disconnecting || syncing}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  {disconnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Link2Off className="mr-2 h-4 w-4" />
                  )}
                  Disconnetti Wahoo
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <a href="/api/integrations/wahoo/connect">
                <Link2 className="mr-2 h-4 w-4" />
                Collega Wahoo
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Abbonamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" /> Abbonamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const u = session?.user as
              | { subscriptionStatus?: string; trialEndsAt?: string | null }
              | undefined;
            const status = u?.subscriptionStatus;
            const trialEndsAt = u?.trialEndsAt ? new Date(u.trialEndsAt) : null;
            const daysLeft = trialEndsAt
              ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000))
              : 0;

            if (status === "active") {
              return (
                <>
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Abbonamento attivo — CycloPower Pro $4.99/mese
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManageBilling}
                    disabled={billingLoading}
                  >
                    {billingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Gestisci abbonamento
                  </Button>
                </>
              );
            }
            if (status === "trialing") {
              return (
                <>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    Prova gratuita —{" "}
                    {daysLeft === 1 ? "rimane 1 giorno" : `rimangono ${daysLeft} giorni`}
                  </p>
                  <Button size="sm" asChild>
                    <a href="/subscribe">Sottoscrivi ora</a>
                  </Button>
                </>
              );
            }
            if (status === "past_due") {
              return (
                <>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Pagamento non riuscito — aggiorna il metodo di pagamento
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManageBilling}
                    disabled={billingLoading}
                  >
                    {billingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Aggiorna pagamento
                  </Button>
                </>
              );
            }
            return (
              <Button size="sm" asChild>
                <a href="/subscribe">Sottoscrivi — $4.99/mese</a>
              </Button>
            );
          })()}
        </CardContent>
      </Card>

      <Separator />

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvataggio...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Salva Impostazioni
          </>
        )}
      </Button>
    </div>
  );
}
