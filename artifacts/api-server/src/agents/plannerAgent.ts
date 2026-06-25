import { llmCall, parseJSON } from "../lib/llm.js";
import type { PlanStep, IntentType, NextAction } from "../types/pipeline.js";

const SYSTEM = `You are the Planner Agent for Thinker AI.

Convert a clarified goal into an ordered list of concrete steps.
You receive a Strategy Brief — use it to determine scope and priorities.

Respond ONLY with valid JSON:
{
  "steps": [
    {
      "id": "step-1",
      "description": "<what to do>",
      "outputType": "code|text|config|image",
      "dependencies": [],
      "needsResearch": false
    }
  ],
  "next_action": "proceed",
  "reason": "<brief>"
}

Rules:
- 3 to 6 steps maximum for V1
- Set outputType="image" for visual asset steps — these route to Design Agent, not Builder
- Set needsResearch=true only when the step genuinely needs external information
- First step never has dependencies
- Descriptions are concise and technical
- Use the strategy brief to scope the MVP correctly — do not build more than needed`;

function defaultPlan(intentType: IntentType, goal: string): PlanStep[] {
  const base: Record<IntentType, PlanStep[]> = {
    chat: [],
    app: [
      { id: "step-1", description: "Define app architecture and data models", outputType: "text", dependencies: [], needsResearch: false },
      { id: "step-2", description: "Build core UI components and screens", outputType: "code", dependencies: ["step-1"], needsResearch: false },
      { id: "step-3", description: "Implement business logic and state management", outputType: "code", dependencies: ["step-2"], needsResearch: false },
      { id: "step-4", description: "Add API integrations and data persistence", outputType: "code", dependencies: ["step-3"], needsResearch: false },
    ],
    website: [
      { id: "step-1", description: "Design page structure and content layout", outputType: "text", dependencies: [], needsResearch: false },
      { id: "step-2", description: "Build HTML/CSS structure with responsive design", outputType: "code", dependencies: ["step-1"], needsResearch: false },
      { id: "step-3", description: "Add content, copy, and interactive elements", outputType: "code", dependencies: ["step-2"], needsResearch: false },
    ],
    game: [
      { id: "step-1", description: "Define game mechanics and rules", outputType: "text", dependencies: [], needsResearch: false },
      { id: "step-2", description: "Build game loop and core logic", outputType: "code", dependencies: ["step-1"], needsResearch: false },
      { id: "step-3", description: "Create player controls and UI", outputType: "code", dependencies: ["step-2"], needsResearch: false },
      { id: "step-4", description: "Add scoring, levels, and polish", outputType: "code", dependencies: ["step-3"], needsResearch: false },
    ],
    task: [
      { id: "step-1", description: `Research and gather information for: ${goal.slice(0, 60)}`, outputType: "text", dependencies: [], needsResearch: true },
      { id: "step-2", description: "Structure and organize findings", outputType: "text", dependencies: ["step-1"], needsResearch: false },
      { id: "step-3", description: "Produce the final deliverable", outputType: "text", dependencies: ["step-2"], needsResearch: false },
    ],
  };
  return base[intentType] ?? base.task;
}

export interface PlanResult {
  steps: PlanStep[];
  next_action: NextAction;
  reason: string;
}

export async function runPlannerAgent(
  goal: string,
  intentType: IntentType,
  requirements: Record<string, string>,
  strategyBrief: string | null,
  domain?: string
): Promise<PlanResult> {
  const reqStr = Object.entries(requirements).map(([k, v]) => `${k}: ${v}`).join(", ");
  const strategyCtx = strategyBrief ? `\n\nStrategy Brief:\n${strategyBrief}` : "";
  const domainCtx = domain && domain !== "general" ? `\nDomain context: ${domain}` : "";

  const userPrompt = `Project goal: "${goal}"
Type: ${intentType}
Requirements: ${reqStr || "none specified"}${domainCtx}${strategyCtx}

Create an execution plan using the strategy brief to scope correctly.`;

  try {
    const raw = await llmCall(SYSTEM, userPrompt, "mid");
    const parsed = parseJSON<PlanResult>(raw, { steps: defaultPlan(intentType, goal), next_action: "proceed", reason: "Plan created" });
    const steps = (parsed.steps ?? []).slice(0, 6).map(s => ({
      ...s,
      outputType: s.outputType ?? "code",
    }));
    return {
      steps: steps.length > 0 ? steps : defaultPlan(intentType, goal),
      next_action: parsed.next_action ?? "proceed",
      reason: parsed.reason ?? "Plan created successfully",
    };
  } catch {
    return {
      steps: defaultPlan(intentType, goal),
      next_action: "proceed",
      reason: "Using default plan (LLM unavailable)",
    };
  }
}
