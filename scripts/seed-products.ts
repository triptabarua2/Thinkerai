/**
 * Seed Stripe products for Thinker AI plans (PDF §18)
 *
 * Plans: Pro ($29/mo or $290/yr) and Founder ($79/mo or $790/yr)
 *
 * Run with:  npx tsx scripts/seed-products.ts
 * Idempotent — skips products that already exist.
 */
import path from "path";
import { fileURLToPath } from "url";
import { getUncachableStripeClient } from "../artifacts/api-server/src/lib/stripeClient.js";

const PLANS = [
  {
    name: "Pro Plan",
    description: "Smart Clarification, Strategy Agent, Design Agent, Founder Mode — 1,500 Think Credits/month.",
    monthly: 2900,
    yearly: 29000,
    metadata: { tier: "pro", monthly_credits: "1500" },
  },
  {
    name: "Founder Plan",
    description: "All Pro features + Consensus Agent, Decision Memory, Priority Queue — 5,000 Think Credits/month.",
    monthly: 7900,
    yearly: 79000,
    metadata: { tier: "founder", monthly_credits: "5000" },
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  for (const plan of PLANS) {
    const existing = await stripe.products.search({
      query: `name:'${plan.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`✓ Already exists: ${plan.name} (${existing.data[0].id})`);
      continue;
    }

    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: plan.metadata,
    });
    console.log(`+ Created product: ${product.name} (${product.id})`);

    const monthly = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.monthly,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { interval: "monthly" },
    });
    console.log(`  + Monthly: $${plan.monthly / 100}/mo  (${monthly.id})`);

    const yearly = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.yearly,
      currency: "usd",
      recurring: { interval: "year" },
      metadata: { interval: "yearly" },
    });
    console.log(`  + Yearly:  $${plan.yearly / 100}/yr  (${yearly.id})`);
  }

  console.log("\n✓ Done. Webhooks will sync products to the database automatically.");
}

seedProducts().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
