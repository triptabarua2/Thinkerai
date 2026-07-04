import type { ThinkingLevel, PlanTier } from "../types/pipeline.js";

export interface CreditAction {
  name: string;
  credits: number;
}

export const CREDIT_COSTS: Record<string, number> = {
  direct_answer: 1,
  clarification_round: 2,
  research_step: 3,
  medium_analysis: 4,
  image_generation: 10,
  high_thinking_base: 10,
  consensus_base: 30,
  small_fix: 1,
  medium_fix: 5,
  full_rebuild: 50,
  rollback: 0,
  selective_rollback: 3,
  failover: 0,
  // File upload processing costs (§11)
  upload_document: 3,   // PDF, DOCX, TXT, code files, CSV
  upload_image: 15,     // image analysis / style reference
  upload_archive: 5,    // ZIP / TAR structure mapping
};

/** Returns the credit cost for a file upload based on its category. */
export function getUploadCreditCost(category: "document" | "code" | "data" | "image" | "archive" | string): number {
  if (category === "image") return CREDIT_COSTS["upload_image"]!;
  if (category === "archive") return CREDIT_COSTS["upload_archive"]!;
  return CREDIT_COSTS["upload_document"]!; // document, code, data, unknown
}

export const PLAN_CREDITS: Record<PlanTier, number> = {
  free: 50,
  pro: 1500,
  founder: 5000,
  enterprise: 999999,
};

export const PLAN_CREDIT_RATE: Record<PlanTier, number> = {
  free: 0.10,
  pro: 0.07,
  founder: 0.05,
  enterprise: 0.03,
};

export function estimateSessionCredits(thinkingLevel: ThinkingLevel): number {
  switch (thinkingLevel) {
    case "low": return 1;
    case "medium": return 9;
    case "high": return 66;
    case "consensus": return 99;
    case "auto": return 0; // resolved by Intent Agent before this is called
    default: return 1;
  }
}

export function requiresConfirmation(credits: number): boolean {
  return credits > 3;
}

export function isFeatureGated(feature: string, tier: PlanTier): boolean {
  const gated: Record<string, PlanTier[]> = {
    smart_clarification: ["pro", "founder", "enterprise"],
    strategy_agent: ["pro", "founder", "enterprise"],
    founder_mode: ["pro", "founder", "enterprise"],
    research_agent: ["pro", "founder", "enterprise"],
    design_agent: ["pro", "founder", "enterprise"],
    critic_agent: ["pro", "founder", "enterprise"],
    consensus_agent: ["founder", "enterprise"],
    decision_memory: ["founder", "enterprise"],
    thinking_high: ["pro", "founder", "enterprise"],
    thinking_consensus: ["founder", "enterprise"],
  };

  const allowed = gated[feature];
  if (!allowed) return false;
  return !allowed.includes(tier);
}

export function getThinkingLevelCredits(level: ThinkingLevel): number {
  switch (level) {
    case "low": return 1;
    case "medium": return 9;
    case "high": return 66;
    case "consensus": return 99;
    case "auto": return 0; // never called directly; resolved first
  }
}
