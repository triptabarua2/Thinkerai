import { llmCall, parseJSON, langInstruction } from "../lib/llm.js";
import type { ClarificationQuestion, IntentType, ThinkingLevel, NextAction, ConstraintFindings, AssumptionFlag } from "../types/pipeline.js";

// ── Signature Question ─────────────────────────────────────────────────────
export const SIGNATURE_QUESTION = "Why do you believe this is the right solution to your problem?";

// ── System Prompt ──────────────────────────────────────────────────────────
const SYSTEM = `You are the Clarification Agent for Thinker AI — the most critical agent in the pipeline.

Wrong Goal → Wrong Strategy → Wrong Plan → Wrong Output.

Your role: enforce the Requirement Clarity Law AND run Smart Clarification.
Detect emotional context, surface hidden goals, challenge assumptions, validate the idea BEFORE any technical work begins.

Thinking Level rules:
- LOW: Direct, 0-2 questions max. Just get what's needed.
- MEDIUM: Smart questions, 3-5 questions. Surface hidden goals.
- HIGH: Deep discovery, 5-10 questions. Full Goal/Problem/Audience/MVP/Success/Constraint discovery.
- CONSENSUS: Deep + challenge assumptions. Reality-check everything.

Respond ONLY with valid JSON:
{
  "complete": <true|false>,
  "requirements": {"<key>": "<value>"},
  "questions": [
    {"id": "<key>", "question": "<text>", "type": "choice|boolean|text", "options": ["..."], "layer": "<goal|problem|audience|mvp|success|constraint|assumption>"}
  ],
  "signatureQuestionNeeded": <true|false>,
  "constraintFindings": {"time": "<>", "budget": "<>", "skill": "<>"},
  "assumptionFlags": [{"assumption": "<>", "status": "confirmed|uncertain|flagged"}],
  "goalDiscoveryMode": <true|false>,
  "emotionalToneDetected": "<calm|stressed|excited|frustrated>",
  "intentConfidence": <0-100>,
  "next_action": "proceed|clarify",
  "reason": "<brief>"
}

Rules:
- signatureQuestionNeeded=true on EVERY project-type request (app, website, game, task) — no exceptions
- goalDiscoveryMode=true when intentConfidence < 70
- If user says "just build it" or "don't ask" → complete=true, signatureQuestionNeeded=false, next_action=proceed
- Contradiction detection: if conversation shows conflicting requirements, flag them in assumptionFlags
- Emotional context: if stressed/urgent tone detected, soften language and lead with empathy
- complete=true only when you have minimum viable requirements AND signature question has been handled`;

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
  signatureQuestionNeeded: boolean;
  constraintFindings: ConstraintFindings;
  assumptionFlags: AssumptionFlag[];
  goalDiscoveryMode: boolean;
  emotionalToneDetected: string;
  intentConfidence: number;
  next_action: NextAction;
  reason: string;
}

function heuristicClarify(
  message: string,
  intentType: IntentType,
  thinkingLevel: ThinkingLevel
): ClarificationResult {
  const required = REQUIRED_FIELDS[intentType] ?? [];
  const lower = message.toLowerCase();
  const isLong = message.length > 60;

  const requirements: Record<string, string> = {};
  const questions: ClarificationQuestion[] = [];

  const justBuildIt = /\b(just build|don't ask|no questions|proceed|go ahead)\b/i.test(message);

  if (intentType === "app") {
    if (/mobile|ios|android/.test(lower)) requirements["platform"] = "mobile";
    else if (/web|browser/.test(lower)) requirements["platform"] = "web";
    else if (!justBuildIt && thinkingLevel !== "low") {
      questions.push({
        id: "platform",
        question: "What platform should this app run on?",
        type: "choice",
        options: ["Web app", "Mobile app (iOS/Android)", "Both"],
        layer: "goal",
      });
    }
    requirements["purpose"] = message.slice(0, 100);
  } else if (intentType === "website") {
    requirements["purpose"] = message.slice(0, 100);
    requirements["audience"] = "general";
  } else if (intentType === "game") {
    requirements["genre"] = "general";
    requirements["platform"] = "web";
    requirements["purpose"] = message.slice(0, 100);
  } else if (intentType === "task") {
    requirements["goal"] = message.slice(0, 100);
    requirements["deliverable"] = "document";
  }

  const missing = required.filter((f) => !requirements[f]);
  const complete = justBuildIt || isLong || missing.length === 0;

  const signatureQuestionNeeded = intentType !== "chat" && !justBuildIt;

  return {
    complete: complete && questions.length === 0,
    requirements,
    questions: complete ? [] : questions,
    signatureQuestionNeeded,
    constraintFindings: {},
    assumptionFlags: [],
    goalDiscoveryMode: false,
    emotionalToneDetected: "calm",
    intentConfidence: isLong ? 85 : 70,
    next_action: complete && questions.length === 0 ? "proceed" : "clarify",
    reason: complete ? "Requirements are clear" : "Need more information",
  };
}

function buildGoalDiscoveryQuestions(thinkingLevel: ThinkingLevel): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [
    {
      id: "goal_discovery",
      question: "Why do you want to build this? What is the real goal you're trying to achieve?",
      type: "text",
      layer: "goal",
    },
    {
      id: "problem_discovery",
      question: "What specific problem will this solve? Who experiences this problem?",
      type: "text",
      layer: "problem",
    },
  ];

  if (thinkingLevel === "high" || thinkingLevel === "consensus") {
    questions.push({
      id: "audience_discovery",
      question: "Who will use this? What do they currently use instead?",
      type: "text",
      layer: "audience",
    });
    questions.push({
      id: "mvp_discovery",
      question: "If you could only launch with 3 features, which 3 would they be?",
      type: "text",
      layer: "mvp",
    });
    questions.push({
      id: "success_discovery",
      question: "How will you know this worked 90 days after launch?",
      type: "text",
      layer: "success",
    });
  }

  return questions;
}

export async function runClarificationAgent(
  message: string,
  intentType: IntentType,
  thinkingLevel: ThinkingLevel,
  history: { role: string; content: string }[],
  signatureAnswered: boolean,
  lang = "en"
): Promise<ClarificationResult> {
  if (intentType === "chat") {
    return {
      complete: true,
      requirements: {},
      questions: [],
      signatureQuestionNeeded: false,
      constraintFindings: {},
      assumptionFlags: [],
      goalDiscoveryMode: false,
      emotionalToneDetected: "calm",
      intentConfidence: 95,
      next_action: "direct_answer",
      reason: "Chat request — no clarification needed",
    };
  }

  const justBuildIt = /\b(just build|don't ask|no questions|proceed|go ahead)\b/i.test(message);
  if (justBuildIt) {
    const heuristic = heuristicClarify(message, intentType, "low");
    return { ...heuristic, complete: true, signatureQuestionNeeded: false, next_action: "proceed" };
  }

  const context = history.length > 0
    ? `Conversation history:\n${history.slice(-8).map((m) => `${m.role}: ${m.content.slice(0, 200)}`).join("\n")}\n\n`
    : "";

  const signatureStr = signatureAnswered
    ? "Signature question has already been answered."
    : "Signature question has NOT been asked yet.";

  const userPrompt = `${context}Current request: "${message}"
Intent type: ${intentType}
Thinking Level: ${thinkingLevel}
${signatureStr}

Run Smart Clarification for this project request. Detect emotional tone, surface hidden goals, identify constraints and assumptions.`;

  try {
    const raw = await llmCall(SYSTEM + langInstruction(lang), userPrompt, "fast");
    const fallback = heuristicClarify(message, intentType, thinkingLevel);
    const parsed = parseJSON<ClarificationResult>(raw, fallback);

    let questions = (parsed.questions ?? []).slice(0, thinkingLevel === "low" ? 2 : thinkingLevel === "medium" ? 5 : 10);
    let goalDiscoveryMode = parsed.goalDiscoveryMode ?? false;

    const intentConf = parsed.intentConfidence ?? 70;
    if (intentConf < 70 && !goalDiscoveryMode) {
      goalDiscoveryMode = true;
      questions = buildGoalDiscoveryQuestions(thinkingLevel);
    }

    return {
      complete: parsed.complete ?? false,
      requirements: parsed.requirements ?? {},
      questions,
      signatureQuestionNeeded: !signatureAnswered && (parsed.signatureQuestionNeeded ?? true),
      constraintFindings: parsed.constraintFindings ?? {},
      assumptionFlags: parsed.assumptionFlags ?? [],
      goalDiscoveryMode,
      emotionalToneDetected: parsed.emotionalToneDetected ?? "calm",
      intentConfidence: intentConf,
      next_action: parsed.next_action ?? (parsed.complete ? "proceed" : "clarify"),
      reason: parsed.reason ?? "Clarification result processed",
    };
  } catch {
    return heuristicClarify(message, intentType, thinkingLevel);
  }
}
