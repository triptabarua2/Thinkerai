import { getStripeSync } from "./stripeClient.js";
import { getDb } from "./db.js";
import { userCreditsTable, billingEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { PLAN_CREDITS } from "./thinkCredits.js";
import type { PlanTier } from "../types/pipeline.js";

const PLAN_TIER_MAP: Record<string, PlanTier> = {
  "Pro Plan": "pro",
  "Founder Plan": "founder",
  "Enterprise Plan": "enterprise",
};

function tierFromProductName(name: string): PlanTier {
  return PLAN_TIER_MAP[name] ?? "free";
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "Ensure the webhook route is registered BEFORE express.json().",
      );
    }

    const sync = await getStripeSync();
    const event = await sync.processWebhook(payload, signature) as any;

    if (!event) return;

    await WebhookHandlers.handleBusinessLogic(event);
  }

  // PDF §18.4 — Update Think Credits + plan tier on subscription lifecycle events
  private static async handleBusinessLogic(event: any): Promise<void> {
    const type: string = event.type;

    if (
      type === "customer.subscription.created" ||
      type === "customer.subscription.updated"
    ) {
      const sub = event.data.object;
      const customerId: string = sub.customer;
      const status: string = sub.status;
      const item = sub.items?.data?.[0];
      const productName: string = item?.price?.product?.name ?? "";
      const newTier: PlanTier =
        status === "active" || status === "trialing"
          ? tierFromProductName(productName)
          : "free";

      await WebhookHandlers.applyPlanChange(customerId, newTier, type);
    }

    if (type === "customer.subscription.deleted") {
      const sub = event.data.object;
      await WebhookHandlers.applyPlanChange(
        sub.customer,
        "free",
        "customer.subscription.deleted",
      );
    }

    // §18.3 — Failed payment: 7-day grace period before tier reverts to Free
    if (type === "invoice.payment_failed") {
      const invoice = event.data.object;
      await WebhookHandlers.applyGracePeriod(invoice.customer);
    }

    if (type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      if (invoice.billing_reason === "subscription_cycle") {
        await WebhookHandlers.refillMonthlyCredits(invoice.customer);
      }
    }
  }

  private static async applyPlanChange(
    stripeCustomerId: string,
    newTier: PlanTier,
    eventType: string,
  ): Promise<void> {
    const db = getDb();
    if (!db) return;

    const quota = PLAN_CREDITS[newTier];

    const existing = await db
      .select()
      .from(userCreditsTable)
      .where(eq(userCreditsTable.stripeCustomerId, stripeCustomerId))
      .limit(1);

    if (existing.length === 0) return;

    const user = existing[0];
    const oldTier = user.planTier as PlanTier;

    await db
      .update(userCreditsTable)
      .set({
        planTier: newTier,
        monthlyQuota: quota,
        creditsBalance: quota,
        creditsUsedThisMonth: 0,
        lastRefillAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userCreditsTable.stripeCustomerId, stripeCustomerId));

    await db.insert(billingEventsTable).values({
      userId: user.userId,
      eventType,
      planTierFrom: oldTier,
      planTierTo: newTier,
      stripeEventId: stripeCustomerId,
      processedAt: new Date(),
    });
  }

  private static async refillMonthlyCredits(stripeCustomerId: string): Promise<void> {
    const db = getDb();
    if (!db) return;

    const existing = await db
      .select()
      .from(userCreditsTable)
      .where(eq(userCreditsTable.stripeCustomerId, stripeCustomerId))
      .limit(1);

    if (existing.length === 0) return;

    const user = existing[0];
    const quota = PLAN_CREDITS[user.planTier as PlanTier];

    await db
      .update(userCreditsTable)
      .set({
        creditsBalance: quota,
        creditsUsedThisMonth: 0,
        lastRefillAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userCreditsTable.stripeCustomerId, stripeCustomerId));

    await db.insert(billingEventsTable).values({
      userId: user.userId,
      eventType: "invoice.payment_succeeded",
      planTierFrom: user.planTier,
      planTierTo: user.planTier,
      stripeEventId: stripeCustomerId,
      processedAt: new Date(),
    });
  }

  // §18.3 — Apply 7-day grace period on payment failure
  private static async applyGracePeriod(stripeCustomerId: string): Promise<void> {
    const db = getDb();
    if (!db) return;

    const graceUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db
      .update(userCreditsTable)
      .set({ graceUntil, updatedAt: new Date() })
      .where(eq(userCreditsTable.stripeCustomerId, stripeCustomerId));
  }
}
