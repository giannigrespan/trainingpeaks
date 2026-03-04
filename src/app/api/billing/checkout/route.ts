export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { paypalRequest } from "@/lib/paypal";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface PayPalSubscription {
  id: string;
  links: { rel: string; href: string }[];
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

    if (!user) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const subscription = await paypalRequest<PayPalSubscription>(
      "POST",
      "/v1/billing/subscriptions",
      {
        plan_id: process.env.PAYPAL_PLAN_ID!,
        custom_id: userId,
        subscriber: {
          email_address: user.email,
          name: {
            given_name: (user.name ?? "").split(" ")[0] ?? "",
            surname: (user.name ?? "").split(" ").slice(1).join(" ") ?? "",
          },
        },
        application_context: {
          brand_name: "CycloPower",
          locale: "it-IT",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          return_url: `${appUrl}/dashboard?checkout=success`,
          cancel_url: `${appUrl}/subscribe?checkout=canceled`,
        },
      }
    );

    const approveLink = subscription.links.find((l) => l.rel === "approve");
    if (!approveLink) {
      throw new Error("PayPal approval URL not found in response");
    }

    // Store subscription ID so we can reference it before webhook fires
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { paypalSubscriptionId: subscription.id, updatedAt: new Date() } }
    );

    return NextResponse.json({ url: approveLink.href });
  } catch (error) {
    console.error("Billing checkout error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
