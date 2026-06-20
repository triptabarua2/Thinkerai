import { llmCall, parseJSON } from "../lib/llm.js";
import type { IntentType } from "../types/pipeline.js";

const SYSTEM = `You are an intent classifier for Thinker AI.

Classify the user message into exactly one intent type.
Respond ONLY with valid JSON, no markdown:
{"intent":"<type>","confidence":<0-100>}

Intent types:
- "chat": General question, follow-up, greeting, explanation, or any conversation not building a project
- "app": Request to build/create a software application (mobile app, desktop app, SaaS, web app with backend)
- "website": Request to build/create a website, landing page, portfolio, blog, or static site
- "game": Request to build/create a game (any platform)
- "task": Complex multi-step task requiring research, writing, automation, or content pipeline

Default to "chat" unless the message explicitly asks to build, create, or make a project.`;

export interface IntentResult {
  intent: IntentType;
  confidence: number;
}

function heuristicIntent(message: string): IntentType {
  const lower = message.toLowerCase();
  if (/\b(build|create|make|develop|write me a|code me a)\b/.test(lower)) {
    if (/\bgame\b/.test(lower)) return "game";
    if (/\b(website|landing page|portfolio|blog|homepage)\b/.test(lower)) return "website";
    if (/\b(app|application|mobile|ios|android|saas)\b/.test(lower)) return "app";
    return "task";
  }
  return "chat";
}

export async function runIntentAgent(
  message: string,
  recentHistory: { role: string; content: string }[]
): Promise<IntentResult> {
  const context = recentHistory.length > 0
    ? `\n\nRecent context:\n${recentHistory.slice(-5).map((m) => `${m.role}: ${m.content.slice(0, 100)}`).join("\n")}`
    : "";

  try {
    const raw = await llmCall(SYSTEM, `Classify this message: "${message}"${context}`, "fast");
    const parsed = parseJSON<IntentResult>(raw, { intent: "chat", confidence: 70 });
    return { intent: parsed.intent ?? "chat", confidence: parsed.confidence ?? 70 };
  } catch {
    return { intent: heuristicIntent(message), confidence: 60 };
  }
}
