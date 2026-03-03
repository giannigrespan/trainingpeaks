import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

    // Crea o recupera il cliente Stripe
    let stripeCustomerId: string = user.stripeCustomerId ?? "";
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      await db
        .collection("users")
        .updateOne(
          { _id: new ObjectId(userId) },
          { $set: { stripeCustomerId, updatedAt: new Date() } }
        );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      client_reference_id: userId, // used in webhook to identify the user
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/subscribe?checkout=canceled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Billing checkout error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
