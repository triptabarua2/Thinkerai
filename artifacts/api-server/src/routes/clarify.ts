import { Router, type Request, type Response } from "express";
import { getDemoClarification } from "../lib/demoResponses.js";

const router = Router();

const CLARIFY_SYSTEM = `You are a requirements analyst for Thinker AI, an autonomous AI operating system.

Your job: analyze user requests and determine if they need clarification before execution.

Rules:
- Only ask questions when truly necessary — vague goals, missing critical info, or high-stakes tasks
- Never ask about things that can be inferred from context
- Keep questions short, specific, and answerable in 1-2 words or a short phrase
- Maximum 4 questions per analysis
- Questions should have suggested answer options when possible

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "confidence": <number 0-100>,
  "intent": "<one-sentence summary of what the user wants>",
  "task_type": "<one of: coding, research, content, analysis, automation, planning, general>",
  "needs_clarification": <true|false>,
  "reason": "<why clarification is needed, or why it is not needed>",
  "questions": [
    {
      "id": "<short_key>",
      "question": "<the question>",
      "type": "<one of: choice, boolean, text>",
      "options": ["<option1>", "<option2>"]
    }
  ]
}

Confidence guide:
- 90-100: Crystal clear intent → needs_clarification: false
- 70-89: Mostly clear → needs_clarification: false
- 50-69: Key details missing → needs_clarification: true
- 0-49: Very vague → needs_clarification: true`;

function getDeepSeekConfig() {
  const apiKey = process.env["DEEPSEEK_API_KEY"];
  if (!apiKey) return null;
  return { apiKey, baseUrl: "https://api.deepseek.com/v1" };
}

export interface ClarifyResponse {
  confidence: number;
  intent: string;
  task_type: string;
  needs_clarification: boolean;
  reason: string;
  questions: {
    id: string;
    question: string;
    type: "choice" | "boolean" | "text";
    options?: string[];
  }[];
}

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { message, conversationHistory } = req.body as {
    message: string;
    conversationHistory?: { role: string; content: string }[];
  };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const config = getDeepSeekConfig();

  // Demo mode — smart local heuristic
  if (!config) {
    res.json(getDemoClarification(message));
    return;
  }

  try {
    const contextNote =
      conversationHistory && conversationHistory.length > 0
        ? `\n\nConversation context:\n` +
          conversationHistory
            .slice(-4)
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")
        : "";

    const userPrompt = `Analyze this user request and return JSON:\n\nUser message: "${message}"${contextNote}`;

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 1024,
        messages: [
          { role: "system", content: CLARIFY_SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      // Fall back to demo heuristic
      res.json(getDemoClarification(message));
      return;
    }

    const json = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const raw = json.choices?.[0]?.message?.content ?? "";

    let parsed: ClarifyResponse;
    try {
      parsed = JSON.parse(raw) as ClarifyResponse;
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        res.json(getDemoClarification(message));
        return;
      }
      parsed = JSON.parse(jsonMatch[0]) as ClarifyResponse;
    }

    res.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log?.error({ err: msg }, "Clarify route error — using demo fallback");
    res.json(getDemoClarification(message));
  }
});

export default router;
