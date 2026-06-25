import { Router, type Request, type Response } from "express";
import { runThinkerCore } from "../core/thinkerCore.js";
import type { PipelineEvent, PlanTier, ThinkingLevel } from "../types/pipeline.js";

const router = Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const {
    messages,
    message,
    planTier,
    thinkingLevel,
    signatureAnswer,
    signatureAnswered,
    existingRequirements,
    domain,
  } = req.body as {
    messages?: { role: "user" | "assistant"; content: string }[];
    message?: string;
    planTier?: PlanTier;
    thinkingLevel?: ThinkingLevel;
    signatureAnswer?: string;
    signatureAnswered?: boolean;
    existingRequirements?: Record<string, string>;
    domain?: string;
  };

  const allMessages = messages ?? [];
  const userMessage =
    message ?? allMessages.filter((m) => m.role === "user").pop()?.content ?? "";

  if (!userMessage) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const history = allMessages
    .slice(0, -1)
    .filter((m): m is { role: "user" | "assistant"; content: string } =>
      m.role === "user" || m.role === "assistant"
    );

  function emit(event: PipelineEvent) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  try {
    await runThinkerCore(userMessage, history, emit, {
      planTier: (["free", "pro", "enterprise"] as PlanTier[]).includes(planTier as PlanTier)
      ? (planTier as PlanTier)
      : "free",
      thinkingLevelOverride: thinkingLevel,
      signatureAnswer,
      signatureAnswered: signatureAnswered ?? false,
      existingRequirements: existingRequirements ?? {},
      domain,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log?.error({ err: msg }, "Pipeline error");
    emit({ type: "done", status: "failed", error: msg });
  } finally {
    res.end();
  }
});

export default router;
