export function getBaseUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) return apiUrl.endsWith("/") ? apiUrl : apiUrl + "/";
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}:8080/`;
  return "http://localhost:8080/";
}

// ── Billing / Stripe ──────────────────────────────────────────────────────────

export interface BillingPlan {
  id: string;
  name: string;
  amount: number;       // cents
  currency: string;
  interval: string;
  priceId: string;
}

/** Fetch available plans from Stripe (falls back to empty array if not configured). */
export async function fetchPlans(): Promise<BillingPlan[]> {
  try {
    const res = await fetch(`${getBaseUrl()}api/billing/plans`);
    if (!res.ok) return [];
    const data = await res.json() as { plans?: BillingPlan[] };
    return data.plans ?? [];
  } catch {
    return [];
  }
}

/** Create a Stripe Checkout session and return the URL to open. */
export async function createCheckoutSession(
  priceId: string,
  email?: string,
  userId = "default",
): Promise<string | null> {
  try {
    const res = await fetch(`${getBaseUrl()}api/billing/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, priceId, email }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { url?: string };
    return data.url ?? null;
  } catch {
    return null;
  }
}

/** Open the Stripe Customer Portal and return the URL. */
export async function createPortalSession(userId = "default"): Promise<string | null> {
  try {
    const res = await fetch(`${getBaseUrl()}api/billing/portal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { url?: string };
    return data.url ?? null;
  } catch {
    return null;
  }
}

export interface JobSummary {
  jobId: string;
  conversationId: string;
  status: "running" | "awaiting_approval" | "complete" | "failed";
  approvalType: "blueprint" | "output" | null;
  createdAt: number;
}

export interface JobsResponse {
  jobs: JobSummary[];
  pendingCount: number;
}

/** Fetch recent background jobs for the notification bell. */
export async function fetchJobs(userId = "default"): Promise<JobsResponse> {
  try {
    const res = await fetch(`${getBaseUrl()}api/notifications/jobs?userId=${userId}`);
    if (!res.ok) return { jobs: [], pendingCount: 0 };
    return await res.json() as JobsResponse;
  } catch {
    return { jobs: [], pendingCount: 0 };
  }
}

/** Get the live credit balance and plan tier for a user. */
export async function getCredits(userId = "default"): Promise<{
  planTier: "free" | "pro" | "founder";
  creditsBalance: number;
  extraCreditsBalance: number;
  totalBalance: number;
  monthlyQuota: number;
  creditsUsedThisMonth: number;
} | null> {
  try {
    const res = await fetch(`${getBaseUrl()}api/credits/balance?userId=${userId}`);
    if (!res.ok) return null;
    return await res.json() as any;
  } catch {
    return null;
  }
}
