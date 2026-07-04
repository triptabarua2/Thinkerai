/**
 * Async Job Manager
 *
 * Decouples the pipeline from the HTTP connection.
 * - Pipeline runs in the background regardless of whether a client is connected.
 * - Events are buffered in memory so late-connecting clients can replay them.
 * - Jobs expire after 2 hours to prevent memory leaks.
 */

import type { PipelineEvent } from "../types/pipeline.js";

export interface Job {
  id: string;
  conversationId: string;
  userId: string;
  status: "running" | "awaiting_approval" | "complete" | "failed";
  /** Approval type if the pipeline is paused waiting for user input */
  approvalType: "blueprint" | "output" | null;
  /** All serialised SSE lines, buffered for replay */
  eventLines: string[];
  /** Active SSE subscribers (res.write callbacks) */
  listeners: Set<(line: string) => void>;
  createdAt: number;
}

const jobs = new Map<string, Job>();
const JOB_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export function createJob(conversationId: string, userId = "default"): string {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  jobs.set(jobId, {
    id: jobId,
    conversationId,
    userId,
    status: "running",
    approvalType: null,
    eventLines: [],
    listeners: new Set(),
    createdAt: Date.now(),
  });

  // Auto-expire
  setTimeout(() => jobs.delete(jobId), JOB_TTL_MS);
  return jobId;
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

/** Emit a pipeline event to all connected listeners and buffer it for replay. */
export function emitToJob(jobId: string, event: PipelineEvent): void {
  const job = jobs.get(jobId);
  if (!job) return;

  const line = `data: ${JSON.stringify(event)}\n\n`;
  job.eventLines.push(line);

  for (const listener of job.listeners) {
    try {
      listener(line);
    } catch {
      // listener may have disconnected
    }
  }

  // Track approval-pause state
  if (event.type === "blueprint_ready") {
    job.status = "awaiting_approval";
    job.approvalType = "blueprint";
  } else if (event.type === "approval_request") {
    job.status = "awaiting_approval";
    job.approvalType = "output";
  } else if (event.type === "done") {
    job.status = event.status === "failed" ? "failed" : "complete";
    job.approvalType = null;
  }
}

/**
 * Subscribe to a job's event stream.
 * Immediately replays all buffered events, then calls `listener` for each future event.
 * Returns an unsubscribe function.
 */
export function subscribeToJob(
  jobId: string,
  listener: (line: string) => void
): (() => void) | null {
  const job = jobs.get(jobId);
  if (!job) return null;

  // Replay buffered events synchronously
  for (const line of job.eventLines) {
    try {
      listener(line);
    } catch {
      // client may have already disconnected
    }
  }

  job.listeners.add(listener);
  return () => job.listeners.delete(listener);
}

export function markJobComplete(jobId: string, failed = false): void {
  const job = jobs.get(jobId);
  if (job) {
    job.status = failed ? "failed" : "complete";
    job.approvalType = null;
  }
}

export interface JobSummary {
  jobId: string;
  conversationId: string;
  status: Job["status"];
  approvalType: Job["approvalType"];
  createdAt: number;
}

/**
 * Returns a summary list of all non-expired jobs for a given userId,
 * sorted newest first. Includes running, awaiting_approval, complete, and failed.
 */
export function listJobsForUser(userId: string, limit = 20): JobSummary[] {
  const results: JobSummary[] = [];
  for (const job of jobs.values()) {
    if (job.userId === userId) {
      results.push({
        jobId: job.id,
        conversationId: job.conversationId,
        status: job.status,
        approvalType: job.approvalType,
        createdAt: job.createdAt,
      });
    }
  }
  results.sort((a, b) => b.createdAt - a.createdAt);
  return results.slice(0, limit);
}
