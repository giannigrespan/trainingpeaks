export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

const BASE_URL =
  process.env.PAYPAL_SANDBOX === "true"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

async function getToken() {
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

async function paypal(token: string, method: string, path: string, body?: object) {
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

export async function GET(req: NextRequest) {
  // Simple secret protection
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.ADMIN_SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET" },
      { status: 500 }
    );
  }

  try {
    const token = await getToken();
    const env = process.env.PAYPAL_SANDBOX === "true" ? "Sandbox" : "Production";

    // 1. Find or create Product
    const products = await paypal(token, "GET", "/v1/catalogs/products?page_size=20");
    let product = products.products?.find((p: { name: string }) => p.name === "CycloPower Pro");

    if (!product) {
      product = await paypal(token, "POST", "/v1/catalogs/products", {
        name: "CycloPower Pro",
        description: "Analisi avanzata delle prestazioni ciclistiche",
        type: "SERVICE",
        category: "SOFTWARE",
      });
    }

    // 2. Find or create Billing Plan
    const plans = await paypal(
      token,
      "GET",
      `/v1/billing/plans?product_id=${product.id}&page_size=20`
    );
    let plan = plans.plans?.find(
      (p: { name: string; status: string }) =>
        p.name === "CycloPower Pro Monthly" && p.status === "ACTIVE"
    );

    if (!plan) {
      plan = await paypal(token, "POST", "/v1/billing/plans", {
        product_id: product.id,
        name: "CycloPower Pro Monthly",
        description: "CycloPower Pro – $4.99/mese",
        status: "ACTIVE",
        billing_cycles: [
          {
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0,
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
    }

    return NextResponse.json({
      env,
      product_id: product.id,
      plan_id: plan.id,
      plan_status: plan.status,
      message: `Add to Vercel env: PAYPAL_PLAN_ID=${plan.id}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
