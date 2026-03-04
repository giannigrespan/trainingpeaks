/**
 * PayPal Billing Setup Script
 * Run: node scripts/paypal-setup.js
 * Reads credentials from .env.local automatically.
 */

const fs = require("fs");
const path = require("path");

// Parse .env.local manually (no dotenv dependency needed)
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length && !key.startsWith("#")) {
        process.env[key.trim()] = rest.join("=").trim();
      }
    });
}

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

async function api(token, method, path, body) {
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
  console.log("✓ Authenticated with PayPal (" + (process.env.PAYPAL_SANDBOX === "true" ? "Sandbox" : "Production") + ")");

  // ── 1. Find or create Product ──────────────────────────────────────────────
  const products = await api(token, "GET", "/v1/catalogs/products?page_size=20");
  let product = products.products?.find((p) => p.name === "CycloPower Pro");

  if (product) {
    console.log(`✓ Product already exists: ${product.id}`);
  } else {
    product = await api(token, "POST", "/v1/catalogs/products", {
      name: "CycloPower Pro",
      description: "Analisi avanzata delle prestazioni ciclistiche",
      type: "SERVICE",
      category: "SOFTWARE",
    });
    console.log(`✓ Product created: ${product.id}`);
  }

  // ── 2. Find or create Billing Plan ────────────────────────────────────────
  const plans = await api(token, "GET", `/v1/billing/plans?product_id=${product.id}&page_size=20`);
  let plan = plans.plans?.find(
    (p) => p.name === "CycloPower Pro Monthly" && p.status === "ACTIVE"
  );

  if (plan) {
    console.log(`✓ Plan already exists: ${plan.id}`);
  } else {
    plan = await api(token, "POST", "/v1/billing/plans", {
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
    console.log(`✓ Plan created: ${plan.id}`);
  }

  console.log("\n✅ Done! Add this to your .env.local:\n");
  console.log(`PAYPAL_PLAN_ID=${plan.id}`);
  console.log("\nThen register a webhook at developer.paypal.com → Apps → your app → Webhooks");
  console.log("Webhook URL: https://tuodominio.com/api/billing/webhook");
  console.log("Add to .env.local: PAYPAL_WEBHOOK_ID=<your-webhook-id>");
  console.log("\nEvents to enable:");
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
