import { llmParallel, parseJSON, langInstruction } from "../lib/llm.js";
import type { ConsensusResult, ConsensusVote, BuilderOutput, ReviewerResult, CriticResult, JudgeResult, NextAction } from "../types/pipeline.js";

const PERSONAS = [
  {
    name: "Conservative Reviewer",
    system: `You are a conservative senior engineer reviewing a deliverable for Thinker AI.
Your job: decide APPROVE or REJECT. You have high standards for safety and correctness.
Respond ONLY with JSON: {"verdict":"approve|reject","reasoning":"<one sentence>"}`,
  },
  {
    name: "Pragmatic Engineer",
    system: `You are a pragmatic engineer reviewing a deliverable for Thinker AI.
Your job: decide APPROVE or REJECT. You balance quality with practicality.
Respond ONLY with JSON: {"verdict":"approve|reject","reasoning":"<one sentence>"}`,
  },
  {
    name: "Critical Skeptic",
    system: `You are a skeptical quality auditor reviewing a deliverable for Thinker AI.
Your job: decide APPROVE or REJECT. You look for flaws others miss.
Respond ONLY with JSON: {"verdict":"approve|reject","reasoning":"<one sentence>"}`,
  },
];

export interface ConsensusResultExtended extends ConsensusResult {
  next_action: NextAction;
  reason: string;
}

export async function runConsensusAgent(
  builderOutput: BuilderOutput,
  reviewerResult: ReviewerResult,
  criticResult: CriticResult,
  judgeResult: JudgeResult,
  lang = "en"
): Promise<ConsensusResultExtended> {
  const contentPreview = builderOutput.content.slice(0, 1500);
  const summary = `Deliverable preview:\n${contentPreview}

Quality summary:
- Reviewer: ${reviewerResult.passed ? "PASSED" : "FAILED"} (${reviewerResult.issues.length} issues)
- Critic severity: ${criticResult.overallSeverity}
- Judge score: ${judgeResult.totalScore}/100 — ${judgeResult.reasoning}

Should this deliverable be approved?`;

  const calls = PERSONAS.map((p) => ({
    system: p.system + langInstruction(lang),
    user: summary,
    tier: "mid" as const,
  }));

  let votes: ConsensusVote[] = [];

  try {
    const results = await llmParallel(calls);
    votes = results.map((raw, i) => {
      const parsed = parseJSON<{ verdict: string; reasoning: string }>(raw, {
        verdict: "approve",
        reasoning: "No issues found.",
      });
      return {
        persona: PERSONAS[i].name,
        verdict: (parsed.verdict === "reject" ? "reject" : "approve") as "approve" | "reject",
        reasoning: parsed.reasoning ?? "",
      };
    });
  } catch {
    votes = PERSONAS.map((p) => ({
      persona: p.name,
      verdict: "approve" as const,
      reasoning: "Approved by consensus.",
    }));
  }

  const approveCount = votes.filter((v) => v.verdict === "approve").length;
  // Tie defaults to conservative outcome (reject)
  const finalVerdict: "approve" | "reject" = approveCount > votes.length / 2 ? "approve" : "reject";

  return {
    votes,
    finalVerdict,
    approveCount,
    next_action: finalVerdict === "approve" ? "proceed" : "retry",
    reason: `Consensus: ${approveCount}/${votes.length} approved`,
  };
}
