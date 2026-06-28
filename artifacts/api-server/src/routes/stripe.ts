import { Router, type IRouter, type Request, type Response } from "express";
import { stripeService } from "../lib/stripeService.js";
import { getUncachableStripeClient } from "../lib/stripeClient.js";
import { getDb } from "../lib/db.js";
import { userCreditsTable, billingEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/billing/plans — list all active plans with prices
router.get("/billing/plans", async (_req, res) => {
  try {
    const plans = await stripeService.listPlansWithPrices();
    res.json({ plans });
  } catch (err: any) {
    res.status(503).json({
      error: "Stripe not configured",
      detail: err.message,
    });
  }
});

// POST /api/billing/checkout — create a Stripe Checkout session
router.post("/billing/checkout", async (req, res) => {
  const { userId = "default", priceId, email } = req.body;

  if (!priceId) {
    return res.status(400).json({ error: "priceId is required" });
  }

  try {
    const origin = `${req.protocol}://${req.get("host")}`;
    const session = await stripeService.createCheckoutSession(
      userId,
      priceId,
      `${origin}/billing/success`,
      `${origin}/billing/cancel`,
      email,
    );
    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/portal — open the Stripe Customer Portal
router.post("/billing/portal", async (req, res) => {
  const { userId = "default" } = req.body;

  try {
    const origin = `${req.protocol}://${req.get("host")}`;
    const session = await stripeService.createPortalSession(
      userId,
      `${origin}/billing`,
    );
    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/billing/credits/:userId — get current credit balance
router.get("/billing/credits/:userId", async (req, res) => {
  const { userId } = req.params;
  const db = getDb();

  if (!db) {
    return res.status(503).json({ error: "Database not available" });
  }

  const [row] = await db
    .select()
    .from(userCreditsTable)
    .where(eq(userCreditsTable.userId, userId))
    .limit(1);

  if (!row) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    userId: row.userId,
    planTier: row.planTier,
    creditsBalance: row.creditsBalance,
    creditsUsedThisMonth: row.creditsUsedThisMonth,
    monthlyQuota: row.monthlyQuota,
    extraCreditsBalance: row.extraCreditsBalance,
    lastRefillAt: row.lastRefillAt,
  });
});

// ── POST /api/billing/webhook — Stripe webhook handler (§18.3) ────────────────
// Handles plan tier updates on payment/subscription events.
// Requires STRIPE_WEBHOOK_SECRET env var set via Replit Secrets.
router.post(
  "/billing/webhook",
  async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];

    if (!sig || !webhookSecret) {
      res.status(400).json({ error: "Missing stripe-signature or STRIPE_WEBHOOK_SECRET" });
      return;
    }

    let event: import("stripe").Stripe.Event;
    try {
      const stripe = await getUncachableStripeClient();
      // req.body must be the raw buffer — express.raw() middleware required on this route
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
    } catch (err: any) {
      res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
      return;
    }

    const db = getDb();
    if (!db) {
      res.status(503).json({ error: "Database not available" });
      return;
    }

    // ── Map Stripe product metadata to plan tier ─────────────────────────────
    function planFromProduct(product: import("stripe").Stripe.Product | string | null): "free" | "pro" | "founder" {
      if (!product || typeof product === "string") return "free";
      const name = (product.name ?? "").toLowerCase();
      const meta = (product.metadata?.["plan_tier"] ?? "").toLowerCase();
      if (meta === "founder" || name.includes("founder")) return "founder";
      if (meta === "pro" || name.includes("pro")) return "pro";
      return "free";
    }

    function creditsForTier(tier: "free" | "pro" | "founder"): number {
      if (tier === "founder") return 5000;
      if (tier === "pro") return 1500;
      return 50;
    }

    async function updateUserPlan(
      userId: string,
      subscriptionId: string,
      newTier: "free" | "pro" | "founder",
      oldTier: string,
      stripeEventId: string
    ): Promise<void> {
      const quota = creditsForTier(newTier);
      await db!.update(userCreditsTable)
        .set({
          planTier: newTier,
          monthlyQuota: quota,
          creditsBalance: quota,
          stripeSubscriptionId: subscriptionId,
          graceUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(userCreditsTable.userId, userId));

      await db!.insert(billingEventsTable).values({
        id: `be-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId,
        eventType: event.type,
        planTierFrom: oldTier,
        planTierTo: newTier,
        stripeEventId,
        processedAt: new Date(),
      });
    }

    async function applyGracePeriod(userId: string, subscriptionId: string): Promise<void> {
      const graceUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await db!.update(userCreditsTable)
        .set({ graceUntil, updatedAt: new Date() })
        .where(eq(userCreditsTable.userId, userId));
    }

    // ── Handle Stripe events ─────────────────────────────────────────────────
    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const sub = event.data.object as import("stripe").Stripe.Subscription;
          const userId = sub.metadata?.["userId"] ?? sub.customer as string;
          const product = (sub.items.data[0]?.price?.product ?? null) as import("stripe").Stripe.Product | null;
          const newTier = planFromProduct(product);

          const [existing] = await db.select()
            .from(userCreditsTable)
            .where(eq(userCreditsTable.userId, userId))
            .limit(1);

          await updateUserPlan(userId, sub.id, newTier, existing?.planTier ?? "free", event.id);
          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object as import("stripe").Stripe.Subscription;
          const userId = sub.metadata?.["userId"] ?? sub.customer as string;

          const [existing] = await db.select()
            .from(userCreditsTable)
            .where(eq(userCreditsTable.userId, userId))
            .limit(1);

          await updateUserPlan(userId, sub.id, "free", existing?.planTier ?? "pro", event.id);
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as import("stripe").Stripe.Invoice;
          const customerId = invoice.customer as string;

          const [existing] = await db.select()
            .from(userCreditsTable)
            .where(eq(userCreditsTable.stripeCustomerId, customerId))
            .limit(1);

          if (existing) {
            await applyGracePeriod(existing.userId, existing.stripeSubscriptionId ?? "");
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as import("stripe").Stripe.Invoice;
          const customerId = invoice.customer as string;

          // Clear any grace period on successful payment
          const [existing] = await db.select()
            .from(userCreditsTable)
            .where(eq(userCreditsTable.stripeCustomerId, customerId))
            .limit(1);

          if (existing?.graceUntil) {
            await db.update(userCreditsTable)
              .set({ graceUntil: null, updatedAt: new Date() })
              .where(eq(userCreditsTable.stripeCustomerId, customerId));
          }
          break;
        }

        default:
          // Unknown event — acknowledge without processing
          break;
      }
    } catch (handlerErr: any) {
      console.error("[webhook] handler error:", handlerErr.message);
      res.status(500).json({ error: "Webhook handler failed" });
      return;
    }

    res.json({ received: true });
  }
);

export default router;
