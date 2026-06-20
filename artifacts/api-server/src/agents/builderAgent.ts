import { llmStream, llmCall } from "../lib/llm.js";
import type { PlanStep, ResearchFinding, BuilderOutput } from "../types/pipeline.js";
import { getDemoResponse } from "../lib/demoResponses.js";

const SYSTEM = `You are the Builder Agent for Thinker AI — the most capable generation agent.

You produce complete, production-ready deliverables. Never write placeholders or incomplete code.

Rules:
- Write the FULL implementation, not examples or snippets
- Use proper code structure and best practices
- Include error handling where appropriate
- For code: use markdown code blocks with language tags
- For content: use proper markdown formatting
- Be thorough and complete — this is the final deliverable`;

export async function runBuilderAgent(
  goal: string,
  steps: PlanStep[],
  research: ResearchFinding[],
  requirements: Record<string, string>,
  onChunk: (text: string) => void,
  reviewerFeedback?: { issues: { description: string; severity: string }[] }
): Promise<BuilderOutput> {
  const stepList = steps.map((s) => `- ${s.description}`).join("\n");
  const researchCtx = research.length > 0
    ? `\n\nResearch findings:\n${research.map((r) => `${r.stepId}: ${r.findings}`).join("\n")}`
    : "";
  const reqCtx = Object.keys(requirements).length > 0
    ? `\n\nRequirements: ${Object.entries(requirements).map(([k, v]) => `${k}=${v}`).join(", ")}`
    : "";
  const retryCtx = reviewerFeedback
    ? `\n\nPrevious attempt had these issues — fix them:\n${reviewerFeedback.issues.map((i) => `- [${i.severity}] ${i.description}`).join("\n")}`
    : "";

  const userPrompt = `Build this project: "${goal}"\n\nExecution plan:\n${stepList}${reqCtx}${researchCtx}${retryCtx}\n\nDeliver the complete, production-ready result now.`;

  try {
    const content = await llmStream(SYSTEM, [{ role: "user", content: userPrompt }], "strong", onChunk);
    return {
      artifactType: detectArtifactType(content),
      content,
    };
  } catch {
    // Demo fallback
    const demoContent = getDemoResponse("coding", goal);
    const words = demoContent.split(" ");
    let full = "";
    for (let i = 0; i < words.length; i++) {
      const chunk = (i === 0 ? "" : " ") + words[i];
      full += chunk;
      onChunk(chunk);
      await new Promise((r) => setTimeout(r, 8));
    }
    return { artifactType: "code", content: full };
  }
}

function detectArtifactType(content: string): "code" | "content" | "config" {
  if (/```[\w]+/.test(content)) return "code";
  if (/^(#|\*\*|-)/.test(content.trim())) return "content";
  return "code";
}
