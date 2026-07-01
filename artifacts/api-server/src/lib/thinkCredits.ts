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
};

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
  return getThinkingLevelCredits(thinkingLevel);
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
    case "medium": return 3;
    case "high": return 10;
    case "consensus": return 30;
  }
}
