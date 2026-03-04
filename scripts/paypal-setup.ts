/**
 * PayPal Billing Setup Script
 *
 * Creates (or reuses) a PayPal Product and Billing Plan for CycloPower Pro.
 * Run once per environment:
 *   npx ts-node --skip-project scripts/paypal-setup.ts
 *
 * Required env vars: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
 * Optional: PAYPAL_SANDBOX=true (defaults to production)
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE_URL =
  process.env.PAYPAL_SANDBOX === "true"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

async function getToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function api<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PayPal ${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    console.error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in .env.local");
    process.exit(1);
  }

  const token = await getToken();
  console.log("✓ Authenticated with PayPal");

  // ── 1. Find or create Product ──────────────────────────────────────────────
  interface PayPalProduct { id: string; name: string }
  interface PayPalPlan { id: string; name: string; status: string }

  const products = await api<{ products: PayPalProduct[] }>(
    token, "GET", "/v1/catalogs/products?page_size=20"
  );
  let product = products.products?.find((p) => p.name === "CycloPower Pro");

  if (product) {
    console.log(`✓ Product already exists: ${product.id}`);
  } else {
    product = await api<PayPalProduct>(token, "POST", "/v1/catalogs/products", {
      name: "CycloPower Pro",
      description: "Analisi avanzata delle prestazioni ciclistiche",
      type: "SERVICE",
      category: "SOFTWARE",
    });
    console.log(`✓ Product created: ${product.id}`);
  }

  // ── 2. Find or create Billing Plan ────────────────────────────────────────
  const plans = await api<{ plans: PayPalPlan[] }>(
    token,
    "GET",
    `/v1/billing/plans?product_id=${product.id}&page_size=20`
  );
  let plan = plans.plans?.find(
    (p) => p.name === "CycloPower Pro Monthly" && p.status === "ACTIVE"
  );

  if (plan) {
    console.log(`✓ Plan already exists: ${plan.id}`);
  } else {
    plan = await api<PayPalPlan>(token, "POST", "/v1/billing/plans", {
      product_id: product.id,
      name: "CycloPower Pro Monthly",
      description: "CycloPower Pro – $4.99/mese",
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // 0 = infinite
          pricing_scheme: {
            fixed_price: { value: "4.99", currency_code: "USD" },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    });
    console.log(`✓ Plan created: ${plan.id}`);
  }

  console.log("\nAdd the following to your .env.local:\n");
  console.log(`PAYPAL_PLAN_ID=${plan.id}`);
  console.log("\nThen register a webhook at developer.paypal.com and add:");
  console.log("PAYPAL_WEBHOOK_ID=<your-webhook-id>");
  console.log("\nEvents to subscribe:");
  console.log("  BILLING.SUBSCRIPTION.ACTIVATED");
  console.log("  BILLING.SUBSCRIPTION.CANCELLED");
  console.log("  BILLING.SUBSCRIPTION.EXPIRED");
  console.log("  BILLING.SUBSCRIPTION.SUSPENDED");
  console.log("  BILLING.SUBSCRIPTION.PAYMENT.FAILED");
  console.log("  BILLING.SUBSCRIPTION.RENEWED");
  console.log("  PAYMENT.SALE.COMPLETED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
