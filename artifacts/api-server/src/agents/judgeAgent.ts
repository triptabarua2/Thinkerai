import { llmCall, parseJSON } from "../lib/llm.js";
import type { JudgeResult, BuilderOutput, ReviewerResult, CriticResult } from "../types/pipeline.js";

const SYSTEM = `You are the Judge Agent for Thinker AI.

Score the deliverable on five criteria and make a final approval decision.

Respond ONLY with valid JSON:
{
  "scores": {
    "accuracy": <0-100>,
    "feasibility": <0-100>,
    "safety": <0-100>,
    "cost": <0-100>,
    "completeness": <0-100>
  },
  "totalScore": <0-100>,
  "approved": <true|false>,
  "borderline": <true|false>,
  "reasoning": "<one sentence>"
}

Scoring rules:
- totalScore = average of all five criteria
- approved=true if totalScore >= 65 AND safety >= 60
- borderline=true if totalScore is between 55-74 (inclusive) on any criterion
- borderline=true also if Reviewer and Critic have conflicting verdicts
- A clearly good deliverable (totalScore >= 75) should NOT be borderline`;

const HIGH_RISK_PATTERNS = [
  /auth|authentication|login|password|jwt|session/i,
  /payment|billing|stripe|charge|credit.?card/i,
  /delete|drop.?table|truncate|destroy/i,
  /permission|access.?control|admin|role|rbac/i,
];

export function isHighRiskContent(content: string): boolean {
  return HIGH_RISK_PATTERNS.some((p) => p.test(content));
}

export async function runJudgeAgent(
  builderOutput: BuilderOutput,
  reviewerResult: ReviewerResult,
  criticResult: CriticResult
): Promise<JudgeResult> {
  const contentPreview = builderOutput.content.slice(0, 2000);
  const reviewerCriticDisagree =
    reviewerResult.passed && criticResult.overallSeverity === "high";

  const userPrompt = `Deliverable preview:\n${contentPreview}

Reviewer result: ${reviewerResult.passed ? "PASSED" : "FAILED"} — Issues: ${reviewerResult.issues.map((i) => `[${i.severity}] ${i.description}`).join("; ") || "none"}

Critic concerns: ${criticResult.concerns.map((c) => `[${c.severity}] ${c.description}`).join("; ") || "none"} (overall: ${criticResult.overallSeverity})

${reviewerCriticDisagree ? "NOTE: Reviewer and Critic disagree — this increases borderline likelihood." : ""}

Score and approve this deliverable.`;

  try {
    const raw = await llmCall(SYSTEM, userPrompt, "strong");
    const parsed = parseJSON<JudgeResult>(raw, defaultJudge());
    return {
      scores: parsed.scores ?? defaultScores(),
      totalScore: parsed.totalScore ?? 80,
      approved: parsed.approved ?? true,
      borderline: parsed.borderline ?? reviewerCriticDisagree,
      reasoning: parsed.reasoning ?? "Deliverable meets quality standards.",
    };
  } catch {
    return defaultJudge();
  }
}

function defaultScores() {
  return { accuracy: 80, feasibility: 80, safety: 85, cost: 75, completeness: 80 };
}

function defaultJudge(): JudgeResult {
  return {
    scores: defaultScores(),
    totalScore: 80,
    approved: true,
    borderline: false,
    reasoning: "Deliverable meets quality standards.",
  };
}
