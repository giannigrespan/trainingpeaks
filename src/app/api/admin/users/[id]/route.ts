export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { paypalRequest } from "@/lib/paypal";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { role?: string } | undefined;
  if (sessionUser?.role !== "admin") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { action, days, status } = await req.json();

  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(params.id) });

  if (!user) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  // ── extend_trial: extend trialEndsAt by N days from today (or from current end) ──
  if (action === "extend_trial") {
    const from =
      user.trialEndsAt && new Date(user.trialEndsAt) > new Date()
        ? new Date(user.trialEndsAt)
        : new Date();
    const newEnd = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);

    await db.collection("users").updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          trialEndsAt: newEnd,
          subscriptionStatus: "trialing",
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ ok: true, trialEndsAt: newEnd });
  }

  // ── set_status: force subscriptionStatus to any value ──
  if (action === "set_status") {
    const allowed = ["active", "trialing", "canceled", "past_due", "none"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Status non valido" }, { status: 400 });
    }

    await db.collection("users").updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { subscriptionStatus: status, updatedAt: new Date() } }
    );

    return NextResponse.json({ ok: true, subscriptionStatus: status });
  }

  // ── cancel_paypal: cancel subscription on PayPal and mark canceled ──
  if (action === "cancel_paypal") {
    if (!user.paypalSubscriptionId) {
      return NextResponse.json(
        { error: "Nessun abbonamento PayPal attivo" },
        { status: 400 }
      );
    }

    await paypalRequest(
      "POST",
      `/v1/billing/subscriptions/${user.paypalSubscriptionId}/cancel`,
      { reason: "Cancellato dall'amministratore" }
    );

    await db.collection("users").updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { subscriptionStatus: "canceled", updatedAt: new Date() } }
    );

    return NextResponse.json({ ok: true, subscriptionStatus: "canceled" });
  }

  return NextResponse.json({ error: "Azione non riconosciuta" }, { status: 400 });
}
