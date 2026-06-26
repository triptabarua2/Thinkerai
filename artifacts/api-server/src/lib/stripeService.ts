import { getUncachableStripeClient } from "./stripeClient.js";
import { getDb } from "./db.js";
import { userCreditsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export class StripeService {
  async createCustomer(userId: string, email?: string) {
    const stripe = await getUncachableStripeClient();
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });

    const db = getDb();
    if (db) {
      await db
        .update(userCreditsTable)
        .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
        .where(eq(userCreditsTable.userId, userId));
    }

    return customer;
  }

  async getOrCreateCustomer(userId: string, email?: string) {
    const db = getDb();
    if (db) {
      const [row] = await db
        .select()
        .from(userCreditsTable)
        .where(eq(userCreditsTable.userId, userId))
        .limit(1);

      if (row?.stripeCustomerId) {
        const stripe = await getUncachableStripeClient();
        return stripe.customers.retrieve(row.stripeCustomerId);
      }
    }

    return this.createCustomer(userId, email);
  }

  async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    email?: string,
  ) {
    const stripe = await getUncachableStripeClient();
    const customer = await this.getOrCreateCustomer(userId, email);

    return stripe.checkout.sessions.create({
      customer: (customer as any).id,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId },
    });
  }

  async createPortalSession(userId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    const db = getDb();

    if (db) {
      const [row] = await db
        .select()
        .from(userCreditsTable)
        .where(eq(userCreditsTable.userId, userId))
        .limit(1);

      if (!row?.stripeCustomerId) {
        throw new Error("No Stripe customer found for this user.");
      }

      return stripe.billingPortal.sessions.create({
        customer: row.stripeCustomerId,
        return_url: returnUrl,
      });
    }

    throw new Error("Database not available.");
  }

  async listPlansWithPrices() {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 10 });
    const prices = await stripe.prices.list({ active: true, limit: 20 });

    return products.data
      .map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
        prices: prices.data
          .filter((p) => p.product === product.id)
          .map((p) => ({
            id: p.id,
            unitAmount: p.unit_amount,
            currency: p.currency,
            interval: (p.recurring as any)?.interval ?? null,
          })),
      }))
      .filter((p) => p.prices.length > 0);
  }
}

export const stripeService = new StripeService();
