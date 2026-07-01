import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;

let _pool: InstanceType<typeof Pool> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getPool(): InstanceType<typeof Pool> | null {
  if (!process.env["DATABASE_URL"]) return null;
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
  }
  return _pool;
}

export function getDb(): ReturnType<typeof drizzle> | null {
  const pool = getPool();
  if (!pool) return null;
  if (!_db) {
    _db = drizzle(pool);
  }
  return _db;
}

export function hasDb(): boolean {
  return !!process.env["DATABASE_URL"];
}

export async function saveConversation(data: {
  id: string;
  userId?: string;
  title?: string;
  agentType?: string;
  detectedLanguage?: string;
  planTier?: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query(
    `INSERT INTO conversations (id, user_id, title, agent_type, detected_language, plan_tier)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       agent_type = EXCLUDED.agent_type,
       detected_language = EXCLUDED.detected_language,
       updated_at = NOW()`,
    [
      data.id,
      data.userId ?? "default",
      data.title ?? "New Chat",
      data.agentType ?? "ceo",
      data.detectedLanguage ?? "en",
      data.planTier ?? "free",
    ]
  );
}

export async function saveMessage(data: {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  agentType?: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query(
    `INSERT INTO messages (id, conversation_id, role, content, agent_type)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [data.id, data.conversationId, data.role, data.content, data.agentType ?? null]
  );
}

export async function saveAgentLog(data: {
  conversationId: string;
  pipelineStateId?: string;
  agentName: string;
  inputSummary?: string;
  outputSummary?: string;
  durationMs?: number;
  status: "success" | "failed" | "skipped";
  confidence?: number;
  retryCount?: number;
  failoverCost?: number;
  clarificationDepth?: number;
  signatureQAnswered?: boolean;
  errorDetail?: string;
  // §6.5 — only generic slot labels (e.g. "Slot-A") may be stored here,
  // never real model or provider names.
  modelSlot?: string;
  providerSlot?: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query(
    `INSERT INTO agent_logs (
      conversation_id, pipeline_state_id, agent_name, input_summary,
      output_summary, duration_ms, status, confidence, retry_count,
      failover_cost, clarification_depth, signature_q_answered, error_detail,
      model_used, provider_used
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      data.conversationId,
      data.pipelineStateId ?? null,
      data.agentName,
      data.inputSummary ?? null,
      data.outputSummary ?? null,
      data.durationMs ?? null,
      data.status,
      data.confidence ?? null,
      data.retryCount ?? 0,
      data.failoverCost ?? 0,
      data.clarificationDepth ?? null,
      data.signatureQAnswered ?? null,
      data.errorDetail ?? null,
      data.modelSlot ?? null,
      data.providerSlot ?? null,
    ]
  );
}

export async function saveVersionHistory(data: {
  conversationId: string;
  versionNumber: number;
  content: string;
  artifactType?: string;
  description?: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query(
    `INSERT INTO version_history (conversation_id, version_number, content, artifact_type, description)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (conversation_id, version_number) DO NOTHING`,
    [
      data.conversationId,
      data.versionNumber,
      data.content,
      data.artifactType ?? "code",
      data.description ?? null,
    ]
  );
}

/**
 * Deducts credits from a user's balance and logs the transaction.
 * Returns the new balance, or null if DB is unavailable or user not found.
 * Safe to call without a DB — silently no-ops when DATABASE_URL is unset.
 */
export async function deductCredits(data: {
  userId: string;
  creditsToDeduct: number;
  action: string;
  conversationId?: string;
  agentName?: string;
  isFailover?: boolean;
}): Promise<{ newBalance: number; balanceBefore: number } | null> {
  const pool = getPool();
  if (!pool) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const selectResult = await client.query(
      `SELECT credits_balance, extra_credits_balance FROM user_credits WHERE user_id = $1 FOR UPDATE`,
      [data.userId]
    );

    if (selectResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const row = selectResult.rows[0] as { credits_balance: number; extra_credits_balance: number };
    const balanceBefore = row.credits_balance + row.extra_credits_balance;

    // Deduct from extra credits first, then main balance
    let remaining = data.creditsToDeduct;
    let newExtra = row.extra_credits_balance;
    let newMain = row.credits_balance;

    if (newExtra >= remaining) {
      newExtra -= remaining;
      remaining = 0;
    } else {
      remaining -= newExtra;
      newExtra = 0;
      newMain = Math.max(0, newMain - remaining);
    }

    const newBalance = newMain + newExtra;

    await client.query(
      `UPDATE user_credits SET
         credits_balance = $2,
         extra_credits_balance = $3,
         credits_used_this_month = credits_used_this_month + $4,
         updated_at = NOW()
       WHERE user_id = $1`,
      [data.userId, newMain, newExtra, data.creditsToDeduct]
    );

    await client.query(
      `INSERT INTO credit_transactions
         (user_id, conversation_id, action, credits_used, balance_before, balance_after, agent_name, is_failover)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.userId,
        data.conversationId ?? null,
        data.action,
        data.creditsToDeduct,
        balanceBefore,
        newBalance,
        data.agentName ?? null,
        data.isFailover ?? false,
      ]
    );

    await client.query("COMMIT");
    return { newBalance, balanceBefore };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function saveDecisionMemory(data: {
  userId: string;
  rule: string;
  appliesTo?: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query(
    `INSERT INTO decision_memory (user_id, rule, applies_to)
     VALUES ($1, $2, $3)`,
    [data.userId, data.rule, data.appliesTo ?? "all_projects"]
  );
}

export async function getDecisionMemory(userId: string): Promise<Array<{ rule: string; applies_to: string }>> {
  const pool = getPool();
  if (!pool) return [];
  const result = await pool.query(
    `SELECT rule, applies_to FROM decision_memory WHERE user_id = $1 AND active = true ORDER BY detected_at ASC`,
    [userId]
  );
  return result.rows as Array<{ rule: string; applies_to: string }>;
}

export async function updateConversationCounts(data: {
  id: string;
  mediumFixCount?: number;
  fullRebuildCount?: number;
  currentVersion?: number;
  detectedLanguage?: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query(
    `UPDATE conversations SET
      medium_fix_count = COALESCE($2, medium_fix_count),
      full_rebuild_count = COALESCE($3, full_rebuild_count),
      current_version = COALESCE($4, current_version),
      detected_language = COALESCE($5, detected_language),
      updated_at = NOW()
    WHERE id = $1`,
    [
      data.id,
      data.mediumFixCount ?? null,
      data.fullRebuildCount ?? null,
      data.currentVersion ?? null,
      data.detectedLanguage ?? null,
    ]
  );
}
