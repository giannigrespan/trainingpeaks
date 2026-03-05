"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { trialDaysLeft } from "@/lib/subscription";

function SubscribeContent() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("checkout") === "canceled";

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  const user = session?.user as
    | { subscriptionStatus?: string; trialEndsAt?: string | null }
    | undefined;

  const daysLeft = user?.trialEndsAt ? trialDaysLeft(user.trialEndsAt) : 0;
  const trialExpired =
    user?.subscriptionStatus === "trialing" && daysLeft === 0;
  const pastDue = user?.subscriptionStatus === "past_due";

  // Controlla se l'utente ha già un abbonamento attivo su PayPal
  // (es. pagato ma JWT non aggiornato)
  useEffect(() => {
    if (canceled) {
      setVerifying(false);
      return;
    }
    fetch("/api/billing/verify-subscription", { method: "POST" })
      .then((r) => r.json())
      .then(async (data) => {
        if (data.status === "ACTIVE") {
          await updateSession();
          router.replace("/dashboard");
        }
      })
      .catch(() => {})
      .finally(() => setVerifying(false));
  }, [canceled, router, updateSession]);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        router.push(data.url);
      }
    } finally {
      setLoading(false);
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <p className="text-sm text-zinc-400">Verifica abbonamento…</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            CycloPower
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Analisi avanzata delle prestazioni ciclistiche
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-8">
          {canceled && (
            <div className="mb-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              Pagamento annullato. Puoi riprovare quando vuoi.
            </div>
          )}

          {pastDue && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              Il pagamento del tuo abbonamento non è andato a buon fine.
              Aggiorna il metodo di pagamento per continuare.
            </div>
          )}

          <div className="text-center mb-8">
            {trialExpired ? (
              <>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-1">
                  La tua prova gratuita è scaduta
                </p>
                <p className="text-zinc-900 dark:text-zinc-100 font-medium">
                  Sottoscrivi per continuare ad usare CycloPower
                </p>
              </>
            ) : (
              <>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-1">
                  Prova gratuita
                </p>
                <p className="text-zinc-900 dark:text-zinc-100 font-medium">
                  {daysLeft === 1
                    ? "Rimane 1 giorno di prova"
                    : `Rimangono ${daysLeft} giorni di prova`}
                </p>
              </>
            )}
          </div>

          {/* Piano */}
          <div className="rounded-xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                CycloPower Pro
              </span>
              <div className="text-right">
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  $4.99
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  /mese
                </span>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              {[
                "Performance Management Chart (CTL, ATL, TSB)",
                "Analisi potenza normalizzata e IF",
                "Curva potenza e distribuzione zone",
                "Sincronizzazione automatica Wahoo",
                "Calendario allenamenti",
                "Archiviazione illimitata attività",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-500 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {loading ? "Reindirizzamento..." : "Sottoscrivi ora"}
          </button>

          <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Annulla in qualsiasi momento. Pagamento sicuro via PayPal.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense>
      <SubscribeContent />
    </Suspense>
  );
}
