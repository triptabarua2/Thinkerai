import { llmCall, parseJSON, langInstruction } from "../lib/llm.js";
import type { IntentType } from "../types/pipeline.js";

const SYSTEM = `You are the Strategy Agent for Thinker AI.

Your role is to think about the WHY and HOW TO SUCCEED behind a user's goal — business, product, and market thinking that determines whether the thing being built will actually work.

You run BEFORE the Planner. Your output sharpens the plan, not replaces it.

Respond ONLY with valid JSON:
{
  "goalClarity": "<one sentence — what the user actually wants to achieve>",
  "mvpScope": "<what should be in V1 and what should be left out>",
  "keyRisks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "successCriteria": ["<how to know this worked>"],
  "ideaValidation": {
    "problemReal": "<is the problem real and specific?>",
    "rightSolution": "<is this the right solution to the problem?>",
    "rightTime": "<is this the right time to build this?>",
    "assessment": "go|caution|no-go"
  },
  "founderMode": false,
  "strategicBrief": "<2-3 sentence brief for Planner — what to build, why, and key constraints>",
  "next_action": "proceed",
  "reason": "<brief explanation>"
}

Rules:
- Be direct and honest — do not flatter the user's idea
- If the idea has serious flaws, say so in ideaValidation (still advisory, never a block)
- founderMode=true only if the request involves market analysis, revenue model, competition, or full business planning
- If founderMode=true, expand keyRisks to include market, competition, and business model risks
- assessment is always advisory — "no-go" means "here are serious concerns", not "we won't build"
- next_action is almost always "proceed" — strategy never blocks the pipeline`;

export interface StrategyBrief {
  goalClarity: string;
  mvpScope: string;
  keyRisks: string[];
  successCriteria: string[];
  ideaValidation: {
    problemReal: string;
    rightSolution: string;
    rightTime: string;
    assessment: "go" | "caution" | "no-go";
  };
  founderMode: boolean;
  strategicBrief: string;
  next_action: "proceed" | "clarify";
  reason: string;
}

function defaultStrategy(goal: string): StrategyBrief {
  return {
    goalClarity: `Build: ${goal.slice(0, 100)}`,
    mvpScope: "Focus on core functionality first, add features iteratively",
    keyRisks: ["Scope creep", "Technical complexity", "User adoption"],
    successCriteria: ["Core feature works end-to-end", "User can complete the primary action"],
    ideaValidation: {
      problemReal: "Problem appears valid based on the request",
      rightSolution: "The proposed solution addresses the stated problem",
      rightTime: "No major timing concerns identified",
      assessment: "go",
    },
    founderMode: false,
    strategicBrief: `Build a focused MVP for: ${goal.slice(0, 80)}. Prioritize core functionality over polish in V1.`,
    next_action: "proceed",
    reason: "Requirements are clear enough to proceed to planning",
  };
}

export async function runStrategyAgent(
  goal: string,
  intentType: IntentType,
  requirements: Record<string, string>,
  signatureQuestionResponse: string | null,
  constraintFindings: Record<string, string>,
  lang = "en"
): Promise<StrategyBrief> {
  const reqStr = Object.entries(requirements).map(([k, v]) => `${k}: ${v}`).join("\n");
  const constraintsStr = Object.entries(constraintFindings).map(([k, v]) => `${k}: ${v}`).join("\n");
  const sigStr = signatureQuestionResponse
    ? `\nUser's answer to "Why is this the right solution?": "${signatureQuestionResponse}"`
    : "\nUser skipped the signature question.";

  const userPrompt = `Project request: "${goal}"
Type: ${intentType}
Requirements:
${reqStr || "none specified"}
${sigStr}
Constraints found:
${constraintsStr || "none identified"}

Produce a strategic brief for this project.`;

  try {
    const raw = await llmCall(SYSTEM + langInstruction(lang), userPrompt, "mid");
    const parsed = parseJSON<StrategyBrief>(raw, defaultStrategy(goal));
    return {
      goalClarity: parsed.goalClarity ?? defaultStrategy(goal).goalClarity,
      mvpScope: parsed.mvpScope ?? defaultStrategy(goal).mvpScope,
      keyRisks: parsed.keyRisks ?? defaultStrategy(goal).keyRisks,
      successCriteria: parsed.successCriteria ?? defaultStrategy(goal).successCriteria,
      ideaValidation: parsed.ideaValidation ?? defaultStrategy(goal).ideaValidation,
      founderMode: parsed.founderMode ?? false,
      strategicBrief: parsed.strategicBrief ?? defaultStrategy(goal).strategicBrief,
      next_action: parsed.next_action ?? "proceed",
      reason: parsed.reason ?? "Proceeding to planning",
    };
  } catch {
    return defaultStrategy(goal);
  }
}
