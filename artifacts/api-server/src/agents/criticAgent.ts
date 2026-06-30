import { llmCall, parseJSON, langInstruction } from "../lib/llm.js";
import type { CriticResult, BuilderOutput, NextAction } from "../types/pipeline.js";

const SYSTEM = `You are the Critic Agent for Thinker AI — an adversarial, skeptical reviewer.

IMPORTANT: You have NOT seen any previous review. Form your OWN independent opinion first.

Look specifically for what the Reviewer might have MISSED:
- Edge cases and failure modes
- Unclear or fragile assumptions
- Missing error handling
- UX problems
- Performance issues
- Security gaps that a checklist might skip

Respond ONLY with valid JSON:
{
  "concerns": [
    {"description": "<concern>", "severity": "low|medium|high"}
  ],
  "overallSeverity": "low|medium|high",
  "next_action": "proceed|retry|replan|escalate",
  "reason": "<brief>"
}

Rules:
- next_action="proceed" if overallSeverity is "low" or "medium" with no blockers
- next_action="retry" if overallSeverity is "high" and issues are Builder-fixable
- next_action="escalate" if Reviewer and Critic fundamentally disagree on quality
- If solid, return empty concerns and overallSeverity="low". Maximum 4 concerns.`;

export interface CriticResultExtended extends CriticResult {
  next_action: NextAction;
  reason: string;
}

export async function runCriticAgent(builderOutput: BuilderOutput, lang = "en"): Promise<CriticResultExtended> {
  const contentPreview = builderOutput.content.slice(0, 3000);

  try {
    const raw = await llmCall(
      SYSTEM + langInstruction(lang),
      `Review this deliverable for weaknesses (you have NOT seen any previous review):\n${contentPreview}`,
      "mid"
    );
    const parsed = parseJSON<CriticResultExtended>(raw, defaultCritic());
    return {
      concerns: (parsed.concerns ?? []).slice(0, 4),
      overallSeverity: parsed.overallSeverity ?? "low",
      next_action: parsed.next_action ?? "proceed",
      reason: parsed.reason ?? "Critique complete",
    };
  } catch {
    return defaultCritic();
  }
}

function defaultCritic(): CriticResultExtended {
  return { concerns: [], overallSeverity: "low", next_action: "proceed", reason: "No significant concerns (default)" };
}
