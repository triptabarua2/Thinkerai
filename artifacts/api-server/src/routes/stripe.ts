import { Router, type IRouter } from "express";
import { stripeService } from "../lib/stripeService.js";
import { getDb } from "../lib/db.js";
import { userCreditsTable } from "@workspace/db";
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

export default router;
