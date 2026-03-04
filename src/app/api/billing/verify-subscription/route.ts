export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { paypalRequest } from "@/lib/paypal";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface PayPalSubscription {
  status: string;
  billing_info?: {
    next_billing_time?: string;
  };
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });

    if (!user?.paypalSubscriptionId) {
      return NextResponse.json(
        { error: "Nessun abbonamento trovato" },
        { status: 404 }
      );
    }

    const subscription = await paypalRequest<PayPalSubscription>(
      "GET",
      `/v1/billing/subscriptions/${user.paypalSubscriptionId}`
    );

    if (subscription.status === "ACTIVE") {
      const nextBillingTime = subscription.billing_info?.next_billing_time;
      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            subscriptionStatus: "active",
            ...(nextBillingTime && {
              subscriptionCurrentPeriodEnd: new Date(nextBillingTime),
            }),
            updatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({ status: subscription.status });
  } catch (error) {
    console.error("Verify subscription error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
