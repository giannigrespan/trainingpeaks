/**
 * One-shot script: creates the Stripe Product and Price for CycloPower Pro.
 * Run once, then copy the printed price_xxxxx into STRIPE_PRICE_ID in your .env.local
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npx ts-node --skip-project scripts/stripe-setup.ts
 */

import Stripe from "stripe";

const APP_META = "cyclopower";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("❌  STRIPE_SECRET_KEY is not set.");
    console.error(
      "   Run: STRIPE_SECRET_KEY=sk_test_... npx ts-node --skip-project scripts/stripe-setup.ts"
    );
    process.exit(1);
  }

  const stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" });

  // ── 1. Find or create product ──────────────────────────────────────────────
  let product: Stripe.Product | undefined;

  const existingProducts = await stripe.products.search({
    query: `metadata["app"]:"${APP_META}"`,
  });
  product = existingProducts.data[0];

  if (product) {
    console.log(`ℹ  Product already exists: ${product.id} (${product.name})`);
  } else {
    product = await stripe.products.create({
      name: "CycloPower Pro",
      description:
        "Accesso completo a CycloPower — PMC, analisi potenza, workout virtuali, sincronizzazione Wahoo",
      metadata: { app: APP_META },
    });
    console.log(`✓  Product created: ${product.id}`);
  }

  // ── 2. Find or create price ────────────────────────────────────────────────
  let price: Stripe.Price | undefined;

  const existingPrices = await stripe.prices.search({
    query: `product:"${product.id}" AND metadata["app"]:"${APP_META}"`,
  });
  price = existingPrices.data.find(
    (p) => p.unit_amount === 499 && p.recurring?.interval === "month" && p.active
  );

  if (price) {
    console.log(`ℹ  Price already exists: ${price.id} ($4.99/month)`);
  } else {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: 499,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { app: APP_META },
    });
    console.log(`✓  Price created: ${price.id} ($4.99/month)`);
  }

  // ── 3. Print result ────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────");
  console.log("Copia in .env.local e nelle env vars Vercel:");
  console.log(`\nSTRIPE_PRICE_ID=${price.id}\n`);
  console.log("─────────────────────────────────────────");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
