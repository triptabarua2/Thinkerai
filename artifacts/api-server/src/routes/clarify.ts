import { Router, type Request, type Response } from "express";

const router = Router();

const CLARIFY_SYSTEM = `You are a requirements analyst for Think AI, an autonomous AI operating system.

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
- 90-100: Crystal clear intent, all requirements obvious → needs_clarification: false
- 70-89: Mostly clear, minor gaps that don't block execution → needs_clarification: false
- 50-69: Key details missing that affect the output significantly → needs_clarification: true
- 0-49: Very vague or ambiguous — cannot proceed without answers → needs_clarification: true

Examples:
- "Write a Python function to sort a list" → confidence: 92, no clarification needed
- "Build me an app" → confidence: 15, needs clarification (type? purpose? auth?)
- "Research climate change" → confidence: 55, needs clarification (aspect? depth? format?)
- "Fix my code" → confidence: 10, needs clarification (which code? what error?)`;

function getDeepSeekConfig() {
  const apiKey = process.env["DEEPSEEK_API_KEY"];
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY environment variable is not set");
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

  try {
    const { apiKey, baseUrl } = getDeepSeekConfig();

    const contextNote =
      conversationHistory && conversationHistory.length > 0
        ? `\n\nConversation context (last ${Math.min(conversationHistory.length, 4)} messages):\n` +
          conversationHistory
            .slice(-4)
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")
        : "";

    const userPrompt = `Analyze this user request and return JSON:\n\nUser message: "${message}"${contextNote}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
      const err = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${err}`);
    }

    const json = await response.json() as {
      choices: { message: { content: string } }[];
    };

    const raw = json.choices?.[0]?.message?.content ?? "";

    let parsed: ClarifyResponse;
    try {
      parsed = JSON.parse(raw) as ClarifyResponse;
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid JSON from model");
      parsed = JSON.parse(jsonMatch[0]) as ClarifyResponse;
    }

    res.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log?.error({ err: message }, "Clarify route error");
    res.status(500).json({ error: message });
  }
});

export default router;
