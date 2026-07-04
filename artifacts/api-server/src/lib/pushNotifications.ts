/**
 * Push Notification Service — Expo Push API
 *
 * Uses the Expo push notification HTTP API directly (no SDK needed server-side).
 * Tokens are stored in the database per user.
 * Only fires when a pipeline reaches an approval stage.
 */

import { logger } from "./logger.js";
import { getPushTokensForUser } from "./db.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

async function sendToToken(token: string, payload: PushPayload): Promise<void> {
  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: "default",
      priority: "high",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Expo push API error ${res.status}: ${text}`);
  }
}

/**
 * Send a push notification to all registered devices for a user.
 * Fails silently — pipeline should never block on notification delivery.
 */
export async function notifyUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  let tokens: string[] = [];
  try {
    tokens = await getPushTokensForUser(userId);
  } catch (err) {
    logger.warn({ err, userId }, "push: failed to fetch tokens (DB unavailable)");
    return;
  }

  if (tokens.length === 0) return;

  const results = await Promise.allSettled(
    tokens.map((token) => sendToToken(token, payload))
  );

  for (const result of results) {
    if (result.status === "rejected") {
      logger.warn({ err: result.reason }, "push: failed to deliver to one token");
    }
  }
}

/** Notify user that their blueprint is ready to approve. */
export async function notifyBlueprintReady(
  userId: string,
  conversationId: string,
  jobId: string
): Promise<void> {
  await notifyUser(userId, {
    title: "Blueprint ready ✅",
    body: "Your build plan is ready — tap to review and approve",
    data: { screen: "chat", conversationId, jobId, approvalType: "blueprint" },
  });
}

/** Notify user that their output is ready to approve. */
export async function notifyOutputReady(
  userId: string,
  conversationId: string,
  jobId: string
): Promise<void> {
  await notifyUser(userId, {
    title: "Output ready 🎉",
    body: "Your project is built — tap to review and approve",
    data: { screen: "chat", conversationId, jobId, approvalType: "output" },
  });
}

/** Notify user that their pipeline task is complete. */
export async function notifyPipelineComplete(
  userId: string,
  conversationId: string,
  jobId: string
): Promise<void> {
  await notifyUser(userId, {
    title: "Task complete ✓",
    body: "Thinker AI finished working on your request",
    data: { screen: "chat", conversationId, jobId },
  });
}
