import { Router, type Request, type Response } from "express";
import { upsertPushToken, removePushToken } from "../lib/db.js";
import { getJob, listJobsForUser } from "../lib/jobManager.js";
import { logger } from "../lib/logger.js";

const router = Router();

/**
 * POST /api/notifications/token
 * Register a device push token for a user.
 * Body: { userId, token, platform }
 */
router.post("/token", async (req: Request, res: Response): Promise<void> => {
  const { userId = "default", token, platform = "unknown" } = req.body as {
    userId?: string;
    token?: string;
    platform?: string;
  };

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }

  try {
    await upsertPushToken({ userId, token, platform });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "notifications: failed to save push token");
    res.status(500).json({ error: "Failed to save token" });
  }
});

/**
 * DELETE /api/notifications/token
 * Remove a push token (on logout or token refresh).
 * Body: { userId, token }
 */
router.delete("/token", async (req: Request, res: Response): Promise<void> => {
  const { userId = "default", token } = req.body as {
    userId?: string;
    token?: string;
  };

  if (!token) {
    res.status(400).json({ error: "token is required" });
    return;
  }

  try {
    await removePushToken({ userId, token });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "notifications: failed to remove push token");
    res.status(500).json({ error: "Failed to remove token" });
  }
});

/**
 * GET /api/notifications/jobs
 * Returns a list of recent jobs for a user (default userId = "default").
 * Used by the notification bell to show pending/recent activity.
 * Query: ?userId=xxx&limit=20
 */
router.get("/jobs", (req: Request, res: Response): void => {
  const userId = (req.query.userId as string) || "default";
  const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 50);
  const jobs = listJobsForUser(userId, limit);
  const pendingCount = jobs.filter((j) => j.status === "awaiting_approval").length;
  res.json({ jobs, pendingCount });
});

/**
 * GET /api/notifications/job/:jobId
 * Returns the current status of an async pipeline job.
 * Used by the mobile app to poll for status when reconnecting.
 */
router.get("/job/:jobId", (req: Request, res: Response): void => {
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
