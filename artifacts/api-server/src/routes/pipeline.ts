import { Router, type Request, type Response } from "express";
import { runThinkerCore } from "../core/thinkerCore.js";
import { saveConversation, saveMessage, saveDecisionMemory } from "../lib/db.js";
import { createJob, emitToJob, subscribeToJob, markJobComplete, getJob, cancelJob } from "../lib/jobManager.js";
import { notifyBlueprintReady, notifyOutputReady, notifyPipelineComplete } from "../lib/pushNotifications.js";
import type { PipelineEvent, PlanTier, ThinkingLevel, DecisionMemoryEntry, VersionSnapshot } from "../types/pipeline.js";

const router = Router();

type PipelineBody = {
  messages?: { role: "user" | "assistant"; content: string }[];
  message?: string;
  planTier?: PlanTier;
  thinkingLevel?: ThinkingLevel;
  signatureAnswer?: string;
  signatureAnswered?: boolean;
  existingRequirements?: Record<string, string>;
  domain?: string;
  blueprintApproved?: boolean;
  outputApproved?: boolean;
  existingPlan?: unknown[];
  fixType?: "small" | "medium" | "full_rebuild";
  medium_fix_count?: number;
  full_rebuild_count?: number;
  detectedLanguage?: string;
  decisionMemory?: DecisionMemoryEntry[];
  versionHistory?: VersionSnapshot[];
  currentVersion?: number;
  conversationId?: string;
  workflowSystemPrompt?: string;
  userId?: string;
};

/**
 * POST /api/pipeline
 *
 * Starts an async pipeline job. Returns immediately with a jobId.
 * The client then connects to GET /api/pipeline/stream/:jobId to receive events.
 * This decouples the pipeline from the HTTP connection (Manus-style async).
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as PipelineBody;
  const {
    messages,
    message,
    planTier,
    thinkingLevel,
    signatureAnswer,
    signatureAnswered,
    existingRequirements,
    domain,
    blueprintApproved,
    outputApproved,
    existingPlan,
    fixType,
    medium_fix_count,
    full_rebuild_count,
    detectedLanguage,
    decisionMemory,
    versionHistory,
    currentVersion,
    conversationId,
    workflowSystemPrompt,
    userId = "default",
  } = body;

  const allMessages = messages ?? [];
  const userMessage =
    message ?? allMessages.filter((m) => m.role === "user").pop()?.content ?? "";

  if (!userMessage) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const convId = conversationId ?? `conv-${Date.now()}`;
  const jobId = createJob(convId, userId);

  // Respond immediately with jobId — pipeline runs in background
  res.status(202).json({ jobId, conversationId: convId });

  // ── Run pipeline in background ──────────────────────────────────────────
  const history = allMessages
    .slice(0, -1)
    .filter((m): m is { role: "user" | "assistant"; content: string } =>
      m.role === "user" || m.role === "assistant"
    );

  let blueprintNotified = false;
  let outputNotified = false;

  function emit(event: PipelineEvent) {
    emitToJob(jobId, event);

    // Send push notification at approval gates (fire-and-forget)
    if (event.type === "blueprint_ready" && !blueprintNotified) {
      blueprintNotified = true;
      notifyBlueprintReady(userId, convId, jobId).catch(() => {});
    } else if (event.type === "approval_needed" && !outputNotified) {
      outputNotified = true;
      notifyOutputReady(userId, convId, jobId).catch(() => {});
    } else if (event.type === "done" && event.status === "complete") {
      // Only notify "complete" if there was no approval gate (those already notified)
      if (!blueprintNotified && !outputNotified) {
        notifyPipelineComplete(userId, convId, jobId).catch(() => {});
      }
    }
  }

  try {
    await runThinkerCore(userMessage, history, emit, {
      planTier: (["free", "pro", "founder", "enterprise"] as PlanTier[]).includes(planTier as PlanTier)
        ? (planTier as PlanTier)
        : "free",
      thinkingLevelOverride: thinkingLevel,
      signatureAnswer,
      signatureAnswered: signatureAnswered ?? false,
      existingRequirements: existingRequirements ?? {},
      domain,
      blueprintApproved: blueprintApproved ?? false,
      outputApproved: outputApproved ?? false,
      existingPlan,
      fixType,
      medium_fix_count,
      full_rebuild_count,
      detectedLanguage,
      decisionMemory,
      versionHistory,
      currentVersion,
      conversationId: convId,
      workflowSystemPrompt,
      jobId,
    });
    // If the job was cancelled mid-run, thinkerCore already emitted the
    // "cancelled" done event and set the job status — don't overwrite it.
    if (getJob(jobId)?.status !== "cancelled") {
      markJobComplete(jobId, false);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log?.error({ err: msg }, "Pipeline error");
    if (getJob(jobId)?.status !== "cancelled") {
      emit({ type: "done", status: "failed", error: msg });
      markJobComplete(jobId, true);
    }
  }
});

/**
 * GET /api/pipeline/stream/:jobId
 *
 * SSE endpoint for consuming pipeline events.
 * Replays all buffered events for clients that connected late (e.g. after backgrounding the app),
 * then streams new events live as the pipeline progresses.
 */
router.get("/stream/:jobId", (req: Request, res: Response): void => {
  const { jobId } = req.params;

  const job = getJob(jobId);
  if (!job) {
    res.status(404).json({ error: "Job not found or expired" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Keep-alive ping every 25s so the connection doesn't time out
  const ping = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(ping);
    }
  }, 25000);

  const unsub = subscribeToJob(jobId, (line) => {
    try {
      res.write(line);
    } catch {
      // client disconnected
    }
  });

  if (!unsub) {
    // Job vanished between getJob() and subscribe — shouldn't happen but guard it
    clearInterval(ping);
    res.end();
    return;
  }

  req.on("close", () => {
    clearInterval(ping);
    unsub();
  });

  // If job is already done, end the response after replay
  if (job.status === "complete" || job.status === "failed" || job.status === "cancelled") {
    clearInterval(ping);
    unsub();
    res.end();
  }
});

/**
 * POST /api/pipeline/:jobId/cancel
 *
 * Stops an in-progress pipeline job. thinkerCore checks the cancellation
 * flag between stages and halts as soon as it notices, emitting a final
 * "done" event with status "cancelled" so connected clients can clean up.
 */
router.post("/:jobId/cancel", (req: Request, res: Response): void => {
  const { jobId } = req.params;
  const job = getJob(jobId);
  if (!job) {
    res.status(404).json({ error: "Job not found or expired" });
    return;
  }

  const wasRunning = job.status === "running" || job.status === "awaiting_approval";
  cancelJob(jobId);

  if (wasRunning) {
    emitToJob(jobId, { type: "done", status: "cancelled" });
  }

  res.json({ jobId, status: "cancelled" });
});

/**
 * GET /api/pipeline/status/:jobId
 * Returns the current job status without streaming. Useful for polling.
 */
router.get("/status/:jobId", (req: Request, res: Response): void => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    res.status(404).json({ error: "Job not found or expired" });
    return;
  }

  res.json({
    jobId: job.id,
    conversationId: job.conversationId,
    status: job.status,
    approvalType: job.approvalType,
    eventCount: job.eventLines.length,
  });
});

export default router;
