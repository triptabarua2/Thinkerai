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
