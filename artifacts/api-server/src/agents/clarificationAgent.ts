import { llmCall, parseJSON } from "../lib/llm.js";
import type { ClarificationQuestion, IntentType } from "../types/pipeline.js";

const SYSTEM = `You are a requirements analyst for Thinker AI.

Analyze the user's project request and determine if it has enough information to proceed.

Respond ONLY with valid JSON:
{
  "complete": <true|false>,
  "requirements": {"<key>": "<value>"},
  "questions": [
    {"id": "<key>", "question": "<text>", "type": "choice|boolean|text", "options": ["..."]}
  ]
}

Rules:
- "complete" is true if you have enough to start building (purpose + rough scope)
- Maximum 3 questions — only ask what is truly missing
- For apps: need purpose + target platform at minimum
- For websites: need purpose + audience at minimum
- For games: need genre + platform at minimum
- For tasks: need goal + deliverable format at minimum
- If requirements are reasonably clear, set complete=true with empty questions array`;

const REQUIRED_FIELDS: Record<IntentType, string[]> = {
  chat: [],
  app: ["purpose", "platform"],
  website: ["purpose", "audience"],
  game: ["genre", "platform"],
  task: ["goal", "deliverable"],
};

export interface ClarificationResult {
  complete: boolean;
  requirements: Record<string, string>;
  questions: ClarificationQuestion[];
}

function heuristicClarify(
  message: string,
  intentType: IntentType
): ClarificationResult {
  const required = REQUIRED_FIELDS[intentType] ?? [];
  const lower = message.toLowerCase();

  const requirements: Record<string, string> = {};
  const questions: ClarificationQuestion[] = [];

  if (intentType === "app") {
    if (/mobile|ios|android/.test(lower)) requirements["platform"] = "mobile";
    else if (/web|browser/.test(lower)) requirements["platform"] = "web";
    else questions.push({
      id: "platform",
      question: "What platform?",
      type: "choice",
      options: ["Web app", "Mobile app", "Both"],
    });
    requirements["purpose"] = message.slice(0, 80);
  } else if (intentType === "website") {
    requirements["purpose"] = message.slice(0, 80);
    requirements["audience"] = "general";
  } else if (intentType === "game") {
    requirements["genre"] = "general";
    requirements["platform"] = "web";
    requirements["purpose"] = message.slice(0, 80);
  } else if (intentType === "task") {
    requirements["goal"] = message.slice(0, 80);
    requirements["deliverable"] = "document";
  }

  const missing = required.filter((f) => !requirements[f]);
  const complete = missing.length === 0 || message.length > 60;

  return { complete, requirements, questions: complete ? [] : questions };
}

export async function runClarificationAgent(
  message: string,
  intentType: IntentType,
  history: { role: string; content: string }[]
): Promise<ClarificationResult> {
  const context = history.length > 0
    ? `Conversation so far:\n${history.slice(-6).map((m) => `${m.role}: ${m.content.slice(0, 150)}`).join("\n")}\n\n`
    : "";

  const userPrompt = `${context}Project request: "${message}"\nIntent type: ${intentType}\n\nDetermine if this has enough information to build.`;

  try {
    const raw = await llmCall(SYSTEM, userPrompt, "fast");
    const parsed = parseJSON<ClarificationResult>(raw, heuristicClarify(message, intentType));
    return {
      complete: parsed.complete ?? true,
      requirements: parsed.requirements ?? {},
      questions: (parsed.questions ?? []).slice(0, 3),
    };
  } catch {
    return heuristicClarify(message, intentType);
  }
}
