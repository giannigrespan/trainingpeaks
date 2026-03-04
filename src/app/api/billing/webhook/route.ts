export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { verifyWebhookSignature } from "@/lib/paypal";

interface PayPalWebhookEvent {
  event_type: string;
  resource: {
    id: string;
    custom_id?: string;
    status?: string;
    billing_info?: {
      next_billing_time?: string;
      last_payment?: { time?: string };
    };
  };
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  const headers: Record<string, string | null> = {
    "paypal-auth-algo": req.headers.get("paypal-auth-algo"),
    "paypal-cert-url": req.headers.get("paypal-cert-url"),
    "paypal-transmission-id": req.headers.get("paypal-transmission-id"),
    "paypal-transmission-sig": req.headers.get("paypal-transmission-sig"),
    "paypal-transmission-time": req.headers.get("paypal-transmission-time"),
  };

  const isValid = await verifyWebhookSignature(headers, body);
  if (!isValid) {
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const db = await getDb();
  const resource = event.resource;

  switch (event.event_type) {
    case "BILLING.SUBSCRIPTION.ACTIVATED": {
      const userId = resource.custom_id;
      if (!userId) break;

      const nextBillingTime = resource.billing_info?.next_billing_time;
      await db.collection("users").updateOne(
        { paypalSubscriptionId: resource.id },
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
      break;
    }

    case "BILLING.SUBSCRIPTION.RENEWED":
    case "PAYMENT.SALE.COMPLETED": {
      const nextBillingTime = resource.billing_info?.next_billing_time;
      await db.collection("users").updateOne(
        { paypalSubscriptionId: resource.id },
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
      break;
    }

    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED": {
      await db.collection("users").updateOne(
        { paypalSubscriptionId: resource.id },
        {
          $set: {
            subscriptionStatus: "canceled",
            updatedAt: new Date(),
          },
        }
      );
      break;
    }

    case "BILLING.SUBSCRIPTION.SUSPENDED":
    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
      await db.collection("users").updateOne(
        { paypalSubscriptionId: resource.id },
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
