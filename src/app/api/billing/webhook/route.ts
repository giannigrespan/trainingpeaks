import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { stripe } from "@/lib/stripe";
import { getDb } from "@/lib/mongodb";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Firma mancante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  const db = await getDb();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      // userId passed as client_reference_id during checkout session creation
      const userId = session.client_reference_id;
      if (!userId) break;

      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (!subId) break;

      const subscription = await stripe.subscriptions.retrieve(subId);

      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            subscriptionStatus: "active",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            // billing_cycle_anchor is the next billing reference in Stripe v20 API
            subscriptionCurrentPeriodEnd: new Date(
              subscription.billing_cycle_anchor * 1000
            ),
            updatedAt: new Date(),
          },
        }
      );
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await db.collection("users").updateOne(
        { stripeSubscriptionId: sub.id },
        {
          $set: {
            subscriptionStatus: sub.status,
            subscriptionCurrentPeriodEnd: new Date(
              sub.billing_cycle_anchor * 1000
            ),
            updatedAt: new Date(),
          },
        }
      );
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await db.collection("users").updateOne(
        { stripeSubscriptionId: sub.id },
        {
          $set: {
            subscriptionStatus: "canceled",
            updatedAt: new Date(),
          },
        }
      );
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      // In Stripe v20 API, subscription reference is via invoice.parent.subscription_details
      const subDetails = invoice.parent?.subscription_details;
      if (!subDetails) break;
      const subId =
        typeof subDetails.subscription === "string"
          ? subDetails.subscription
          : subDetails.subscription?.id;
      if (!subId) break;

      await db.collection("users").updateOne(
        { stripeSubscriptionId: subId },
        {
          $set: {
            subscriptionStatus: "past_due",
            updatedAt: new Date(),
          },
        }
      );
      break;
    }
  }

  return NextResponse.json({ received: true });
}
