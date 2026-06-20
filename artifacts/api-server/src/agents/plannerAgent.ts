import { llmCall, parseJSON } from "../lib/llm.js";
import type { PlanStep, IntentType } from "../types/pipeline.js";

const SYSTEM = `You are the Planner Agent for Thinker AI.

Convert a project goal into an ordered list of concrete implementation steps.

Respond ONLY with valid JSON:
{
  "steps": [
    {
      "id": "step-1",
      "description": "<what to do>",
      "dependencies": [],
      "needsResearch": false
    }
  ]
}

Rules:
- 3 to 6 steps maximum for V1
- Each step should be independently actionable
- Set needsResearch=true only if the step requires external information
- First step should never have dependencies
- Keep descriptions concise and technical`;

function defaultPlan(intentType: IntentType, goal: string): PlanStep[] {
  const base: Record<IntentType, PlanStep[]> = {
    chat: [],
    app: [
      { id: "step-1", description: "Define app architecture and data models", dependencies: [], needsResearch: false },
      { id: "step-2", description: "Build core UI components and screens", dependencies: ["step-1"], needsResearch: false },
      { id: "step-3", description: "Implement business logic and state management", dependencies: ["step-2"], needsResearch: false },
      { id: "step-4", description: "Add API integrations and data persistence", dependencies: ["step-3"], needsResearch: false },
    ],
    website: [
      { id: "step-1", description: "Design page structure and layout", dependencies: [], needsResearch: false },
      { id: "step-2", description: "Build HTML/CSS structure with responsive design", dependencies: ["step-1"], needsResearch: false },
      { id: "step-3", description: "Add content, copy, and interactive elements", dependencies: ["step-2"], needsResearch: false },
    ],
    game: [
      { id: "step-1", description: "Define game mechanics and rules", dependencies: [], needsResearch: false },
      { id: "step-2", description: "Build game loop and core logic", dependencies: ["step-1"], needsResearch: false },
      { id: "step-3", description: "Create player controls and UI", dependencies: ["step-2"], needsResearch: false },
      { id: "step-4", description: "Add scoring, levels, and polish", dependencies: ["step-3"], needsResearch: false },
    ],
    task: [
      { id: "step-1", description: `Research and gather information for: ${goal.slice(0, 60)}`, dependencies: [], needsResearch: true },
      { id: "step-2", description: "Structure and organize findings", dependencies: ["step-1"], needsResearch: false },
      { id: "step-3", description: "Produce the final deliverable", dependencies: ["step-2"], needsResearch: false },
    ],
  };
  return base[intentType] ?? base.task;
}

export interface PlanResult {
  steps: PlanStep[];
}

export async function runPlannerAgent(
  goal: string,
  intentType: IntentType,
  requirements: Record<string, string>
): Promise<PlanResult> {
  const reqStr = Object.entries(requirements).map(([k, v]) => `${k}: ${v}`).join(", ");
  const userPrompt = `Project goal: "${goal}"\nType: ${intentType}\nRequirements: ${reqStr || "none specified"}\n\nCreate an execution plan.`;

  try {
    const raw = await llmCall(SYSTEM, userPrompt, "mid");
    const parsed = parseJSON<PlanResult>(raw, { steps: defaultPlan(intentType, goal) });
    const steps = (parsed.steps ?? []).slice(0, 6);
    return { steps: steps.length > 0 ? steps : defaultPlan(intentType, goal) };
  } catch {
    return { steps: defaultPlan(intentType, goal) };
  }
}
