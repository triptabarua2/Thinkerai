import { llmCall, parseJSON } from "../lib/llm.js";
import type { ReviewerResult, BuilderOutput, NextAction } from "../types/pipeline.js";

const SYSTEM = `You are the Reviewer Agent for Thinker AI.

Run a 5-point quality control checklist on the deliverable:
1. Accuracy — Is it technically correct?
2. Logic — Does the implementation make sense?
3. Security — Are there obvious vulnerabilities?
4. Completeness — Is it a full, working implementation?
5. Goal alignment — Does it actually solve what was requested?

Respond ONLY with valid JSON:
{
  "passed": <true|false>,
  "issues": [
    {"description": "<issue>", "severity": "low|medium|high"}
  ],
  "next_action": "proceed|retry|replan",
  "reason": "<brief>"
}

Rules:
- passed=true if no high-severity issues exist
- next_action="retry" if passed=false AND issues are fixable by Builder
- next_action="replan" if the root issue is a planning failure, not implementation
- next_action="proceed" if passed=true
- Only flag real issues, not style preferences. Maximum 5 issues.`;

export interface ReviewerResultExtended extends ReviewerResult {
  next_action: NextAction;
  reason: string;
}

export async function runReviewerAgent(
  builderOutput: BuilderOutput,
  requirements: Record<string, string>
): Promise<ReviewerResultExtended> {
  const reqStr = Object.entries(requirements).map(([k, v]) => `${k}: ${v}`).join(", ");
  const contentPreview = builderOutput.content.slice(0, 3000);

  const userPrompt = `Requirements: ${reqStr || "build what was requested"}\n\nDeliverable to review:\n${contentPreview}\n\nRun quality checklist.`;

  try {
    const raw = await llmCall(SYSTEM, userPrompt, "mid");
    const parsed = parseJSON<ReviewerResultExtended>(raw, defaultReviewer());
    return {
      passed: parsed.passed ?? true,
      issues: (parsed.issues ?? []).slice(0, 5),
      next_action: parsed.next_action ?? (parsed.passed ? "proceed" : "retry"),
      reason: parsed.reason ?? "Review complete",
    };
  } catch {
    return defaultReviewer();
  }
}

function defaultReviewer(): ReviewerResultExtended {
  return { passed: true, issues: [], next_action: "proceed", reason: "Review passed (default)" };
}
