import Anthropic from "@anthropic-ai/sdk";
import { Router, type Request, type Response } from "express";

const router = Router();

const SYSTEM_BASE = `You are Think AI, an autonomous AI operating system — not a simple chatbot. You are capable of planning, researching, coding, creating content, analyzing data, and executing complex multi-step tasks.

Core behaviors:
1. If a task is ambiguous or missing key details, ask 2-3 focused clarifying questions as a numbered list before proceeding. Never guess critical requirements.
2. For complex tasks, outline your approach briefly, then execute step by step.
3. Use clear markdown formatting: **bold** for emphasis, \`inline code\` for terms, triple backticks for code blocks (specify the language).
4. Be direct, precise, and highly capable. Demonstrate expertise in every response.
5. When asked to build software, write complete, production-ready code — not snippets.

You have specialized sub-agents: CEO Agent (orchestration), Research Agent, Coding Agent, Content Agent, Analysis Agent, Automation Agent, and Planner Agent.`;

const AGENT_HINTS: Record<string, string> = {
  research: "\n\nYou are currently in Research Agent mode. Provide thorough, well-structured information with clear analysis.",
  coding: "\n\nYou are currently in Coding Agent mode. Write clean, complete, production-ready code with helpful explanations.",
  content: "\n\nYou are currently in Content Agent mode. Craft engaging, polished, and purposeful content.",
  analysis: "\n\nYou are currently in Analysis Agent mode. Provide data-driven insights and structured analysis.",
  automation: "\n\nYou are currently in Automation Agent mode. Design efficient workflows and automated pipelines.",
  planner: "\n\nYou are currently in Planner Agent mode. Create detailed, actionable plans with clear milestones.",
  ceo: "\n\nYou are orchestrating this task as CEO Agent. Break it into clear steps and execute methodically.",
};

function getClient(): Anthropic {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

router.post(
  "/",
  async (req: Request, res: Response): Promise<void> => {
    const { messages, agentType } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
      agentType?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const hint = agentType ? (AGENT_HINTS[agentType] ?? "") : "";
    const systemPrompt = SYSTEM_BASE + hint;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      const client = getClient();

      const stream = client.messages.stream({
        model: "claude-opus-4-8",
        max_tokens: 8192,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          res.write(
            `data: ${JSON.stringify({ content: event.delta.text })}\n\n`
          );
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      req.log?.error({ err: message }, "Chat route error");
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      } else {
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        res.end();
      }
    }
  }
);

export default router;
