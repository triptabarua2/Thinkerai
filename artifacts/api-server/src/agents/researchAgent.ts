import { llmCall, langInstruction } from "../lib/llm.js";
import type { PlanStep, ResearchFinding } from "../types/pipeline.js";

const SYSTEM = `You are the Research Agent for Thinker AI.

Gather relevant context and best practices for the given implementation step.

Provide concise, actionable findings (200-400 words) that will directly help the Builder Agent.
Focus on: relevant patterns, libraries, APIs, or examples specific to this step.

Respond in plain text — no JSON.`;

export async function runResearchAgent(
  steps: PlanStep[],
  goal: string,
  lang = "en"
): Promise<ResearchFinding[]> {
  const findings: ResearchFinding[] = [];

  for (const step of steps.filter((s) => s.needsResearch)) {
    try {
      const findings_text = await llmCall(
        SYSTEM + langInstruction(lang),
        `Project goal: "${goal}"\nStep to research: "${step.description}"\n\nProvide relevant context and best practices.`,
        "fast"
      );
      findings.push({ stepId: step.id, findings: findings_text });
    } catch {
      findings.push({
        stepId: step.id,
        findings: `Research for "${step.description}" — proceed with best practices and standard patterns.`,
      });
    }
  }

  return findings;
}
