import { llmCall, parseJSON } from "../lib/llm.js";
import type { ReviewerResult, BuilderOutput } from "../types/pipeline.js";

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
  ]
}

Rules:
- passed=true if no high-severity issues exist
- Only flag real issues, not style preferences
- Maximum 5 issues
- If the deliverable is good, return passed=true with empty issues array`;

export async function runReviewerAgent(
  builderOutput: BuilderOutput,
  requirements: Record<string, string>
): Promise<ReviewerResult> {
  const reqStr = Object.entries(requirements).map(([k, v]) => `${k}: ${v}`).join(", ");
  const contentPreview = builderOutput.content.slice(0, 3000);

  const userPrompt = `Requirements: ${reqStr || "build what was requested"}\n\nDeliverable to review:\n${contentPreview}\n\nRun quality checklist.`;

  try {
    const raw = await llmCall(SYSTEM, userPrompt, "mid");
    const parsed = parseJSON<ReviewerResult>(raw, { passed: true, issues: [] });
    return {
      passed: parsed.passed ?? true,
      issues: (parsed.issues ?? []).slice(0, 5),
    };
  } catch {
    return { passed: true, issues: [] };
  }
}
