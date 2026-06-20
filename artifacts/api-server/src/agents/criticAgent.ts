import { llmCall, parseJSON } from "../lib/llm.js";
import type { CriticResult, BuilderOutput } from "../types/pipeline.js";

const SYSTEM = `You are the Critic Agent for Thinker AI — an adversarial, skeptical reviewer.

IMPORTANT: You have NOT seen any previous review. Form your OWN independent opinion first.

Look specifically for what the Reviewer might have MISSED:
- Edge cases and failure modes
- Unclear or fragile assumptions
- Missing error handling
- UX problems
- Performance issues
- Security gaps that a checklist might skip

After forming your opinion, be honest and specific.

Respond ONLY with valid JSON:
{
  "concerns": [
    {"description": "<concern>", "severity": "low|medium|high"}
  ],
  "overallSeverity": "low|medium|high"
}

If the deliverable is solid, return empty concerns and overallSeverity="low".
Maximum 4 concerns.`;

export async function runCriticAgent(builderOutput: BuilderOutput): Promise<CriticResult> {
  const contentPreview = builderOutput.content.slice(0, 3000);

  try {
    const raw = await llmCall(
      SYSTEM,
      `Review this deliverable for weaknesses:\n${contentPreview}`,
      "mid"
    );
    const parsed = parseJSON<CriticResult>(raw, { concerns: [], overallSeverity: "low" });
    return {
      concerns: (parsed.concerns ?? []).slice(0, 4),
      overallSeverity: parsed.overallSeverity ?? "low",
    };
  } catch {
    return { concerns: [], overallSeverity: "low" };
  }
}
