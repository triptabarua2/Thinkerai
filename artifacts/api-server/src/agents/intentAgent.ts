import { llmCall, parseJSON } from "../lib/llm.js";
import type { IntentType, ThinkingLevel, NextAction } from "../types/pipeline.js";

const SYSTEM = `You are an intent classifier for Thinker AI.

Classify the user message and select a Thinking Level.

Respond ONLY with valid JSON, no markdown:
{
  "intent": "<type>",
  "confidence": <0-100>,
  "thinkingLevel": "<level>",
  "domain": "<domain>",
  "next_action": "<action>",
  "reason": "<one sentence>"
}

Intent types:
- "chat": General question, follow-up, greeting, explanation, or any conversation not building a project
- "app": Request to build/create a software application (mobile app, desktop app, SaaS, web app with backend)
- "website": Request to build/create a website, landing page, portfolio, blog, or static site
- "game": Request to build/create a game (any platform)
- "task": Complex multi-step task requiring research, writing, automation, or content pipeline

Thinking Levels:
- "low": Simple chat, quick question — Intent + Direct Answer only
- "medium": Analysis, comparison, small build — Standard pipeline
- "high": Deep planning, full project builds — Full 12-agent pipeline
- "consensus": Startup validation, high-stakes decisions — Full pipeline + multi-model consensus

Rules:
- If intent="chat" AND it's a simple question → thinkingLevel="low", next_action="direct_answer"
- If intent="chat" AND complex analysis needed → thinkingLevel="medium", next_action="direct_answer"
- If intent is a project type → thinkingLevel="high" minimum, next_action="proceed"
- If message contains startup/business/market/revenue → thinkingLevel="consensus"
- confidence 90+ → next_action="proceed"; 70-89 → next_action="proceed"; below 70 → next_action="clarify"
- domain: one of [coding, design, devops, security, research, writing, music, video, general]`;

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  thinkingLevel: ThinkingLevel;
  domain: string;
  next_action: NextAction;
  reason: string;
}

function heuristicIntent(message: string): IntentResult {
  const lower = message.toLowerCase();
  const isProject = /\b(build|create|make|develop|write me a|code me a)\b/.test(lower);
  const isStartup = /\b(startup|business model|market|revenue|competition|saas|monetize)\b/.test(lower);

  let intent: IntentType = "chat";
  let thinkingLevel: ThinkingLevel = "low";
  let next_action: NextAction = "direct_answer";

  if (isProject) {
    if (/\bgame\b/.test(lower)) intent = "game";
    else if (/\b(website|landing page|portfolio|blog|homepage)\b/.test(lower)) intent = "website";
    else if (/\b(app|application|mobile|ios|android|saas)\b/.test(lower)) intent = "app";
    else intent = "task";
    thinkingLevel = isStartup ? "consensus" : "high";
    next_action = "proceed";
  } else if (isStartup) {
    thinkingLevel = "consensus";
    next_action = "direct_answer";
  } else if (/\b(analyze|compare|recommend|explain|research)\b/.test(lower)) {
    thinkingLevel = "medium";
    next_action = "direct_answer";
  }

  return {
    intent,
    confidence: 65,
    thinkingLevel,
    domain: "general",
    next_action,
    reason: "Heuristic classification",
  };
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
    const fallback = heuristicIntent(message);
    const parsed = parseJSON<IntentResult>(raw, fallback);
    return {
      intent: parsed.intent ?? fallback.intent,
      confidence: parsed.confidence ?? fallback.confidence,
      thinkingLevel: parsed.thinkingLevel ?? fallback.thinkingLevel,
      domain: parsed.domain ?? "general",
      next_action: parsed.next_action ?? fallback.next_action,
      reason: parsed.reason ?? "Classification complete",
    };
  } catch {
    return heuristicIntent(message);
  }
}
