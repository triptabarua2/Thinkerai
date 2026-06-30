/**
 * Model Pool Manager — PDF Section 6.1, 19, 20.3
 *
 * Providers supported (add API keys as secrets):
 *   ANTHROPIC_API_KEY  → claude-haiku-4-5 / claude-sonnet-4-6 / claude-opus-4-8
 *   OPENAI_API_KEY     → gpt-4o-mini / gpt-4o
 *   DEEPSEEK_API_KEY   → deepseek-chat
 *   GEMINI_API_KEY     → gemini-1.5-flash / gemini-1.5-pro
 *
 * Provider Diversity Rule (§6.1): no two models in the same pool share a provider.
 * Failover timeout: 5 seconds (§19.2).
 * Pool health: a model failing >20% in a 1-hour window is removed (§19).
 */

import Anthropic from "@anthropic-ai/sdk";

export type ModelTier = "fast" | "mid" | "strong";

/**
 * §17 — Multi-Language Support
 * Returns a language instruction to append to any agent system prompt.
 * English is the default — no extra instruction needed.
 * For all other languages: user-facing text (questions, reasons, summaries)
 * must be in the user's language. Code, JSON keys, and file names stay in English.
 */
export function langInstruction(lang: string): string {
  if (!lang || lang === "en") return "";
  return `\n\nLANGUAGE RULE (§17): The user's detected language is "${lang}". You MUST respond in that language for all user-facing text — questions, explanations, summaries, and the "reason" field. JSON structure keys and any generated code (variable names, functions, file names) must remain in English. Do not mix languages within a single sentence.`;
}

// ── Pool health tracking ────────────────────────────────────────────────────
interface PoolHealthRecord {
  calls: number;
  failures: number;
  windowStart: number;
}
const poolHealth = new Map<string, PoolHealthRecord>();
const HEALTH_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const FAILURE_THRESHOLD = 0.2; // 20%

function recordCall(modelId: string, failed: boolean): void {
  const now = Date.now();
  const rec = poolHealth.get(modelId) ?? { calls: 0, failures: 0, windowStart: now };
  if (now - rec.windowStart > HEALTH_WINDOW_MS) {
    rec.calls = 0; rec.failures = 0; rec.windowStart = now;
  }
  rec.calls += 1;
  if (failed) rec.failures += 1;
  poolHealth.set(modelId, rec);
}

function isHealthy(modelId: string): boolean {
  const rec = poolHealth.get(modelId);
  if (!rec || rec.calls < 5) return true;
  return rec.failures / rec.calls < FAILURE_THRESHOLD;
}

// ── Model descriptors ────────────────────────────────────────────────────────
interface ModelDescriptor {
  id: string;
  provider: "anthropic" | "openai" | "deepseek" | "gemini";
  tier: ModelTier;
}

const ALL_MODELS: ModelDescriptor[] = [
  // Anthropic
  { id: "claude-haiku-4-5",  provider: "anthropic", tier: "fast"   },
  { id: "claude-sonnet-4-6", provider: "anthropic", tier: "mid"    },
  { id: "claude-opus-4-8",   provider: "anthropic", tier: "strong" },
  // OpenAI
  { id: "gpt-4o-mini",       provider: "openai",    tier: "fast"   },
  { id: "gpt-4o",            provider: "openai",    tier: "mid"    },
  { id: "gpt-4o",            provider: "openai",    tier: "strong" },
  // DeepSeek
  { id: "deepseek-chat",     provider: "deepseek",  tier: "fast"   },
  { id: "deepseek-chat",     provider: "deepseek",  tier: "mid"    },
  // Gemini
  { id: "gemini-1.5-flash",  provider: "gemini",    tier: "fast"   },
  { id: "gemini-1.5-pro",    provider: "gemini",    tier: "mid"    },
  { id: "gemini-1.5-pro",    provider: "gemini",    tier: "strong" },
];

function availableProviders(): Set<string> {
  const set = new Set<string>();
  if (process.env["ANTHROPIC_API_KEY"]) set.add("anthropic");
  if (process.env["OPENAI_API_KEY"])     set.add("openai");
  if (process.env["DEEPSEEK_API_KEY"])   set.add("deepseek");
  if (process.env["GEMINI_API_KEY"])     set.add("gemini");
  return set;
}

/**
 * Returns ordered pool for a given tier — max 3, provider diversity enforced.
 * Available providers are preferred; falls back to any provider if fewer than 2 are configured.
 */
function buildPool(tier: ModelTier, excludeModels: Set<string> = new Set()): ModelDescriptor[] {
  const available = availableProviders();
  const pool: ModelDescriptor[] = [];
  const usedProviders = new Set<string>();

  // Filter to available providers + healthy models
  const candidates = ALL_MODELS.filter(
    (m) =>
      m.tier === tier &&
      available.has(m.provider) &&
      !excludeModels.has(`${m.provider}:${m.id}`) &&
      isHealthy(`${m.provider}:${m.id}`)
  );

  // Enforce provider diversity — one model per provider
  for (const m of candidates) {
    if (!usedProviders.has(m.provider) && pool.length < 3) {
      pool.push(m);
      usedProviders.add(m.provider);
    }
  }

  return pool;
}

export function hasLLM(): boolean {
  return availableProviders().size > 0;
}

// ── Unified call with 5-second timeout ──────────────────────────────────────
const TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("MODEL_TIMEOUT")), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

async function callAnthropicNonStream(model: string, system: string, user: string): Promise<string> {
  const key = process.env["ANTHROPIC_API_KEY"]!;
  const client = new Anthropic({ apiKey: key });
  const msg = await client.messages.create({
    model,
    max_tokens: 8192,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = msg.content[0];
  return block.type === "text" ? block.text : "";
}

async function callOpenAINonStream(model: string, system: string, user: string): Promise<string> {
  const key = process.env["OPENAI_API_KEY"]!;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const json = await res.json() as { choices: { message: { content: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

async function callDeepSeekNonStream(system: string, user: string): Promise<string> {
  const key = process.env["DEEPSEEK_API_KEY"]!;
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      max_tokens: 8192,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`);
  const json = await res.json() as { choices: { message: { content: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

async function callGeminiNonStream(model: string, system: string, user: string): Promise<string> {
  const key = process.env["GEMINI_API_KEY"]!;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function dispatchCall(m: ModelDescriptor, system: string, user: string): Promise<string> {
  switch (m.provider) {
    case "anthropic": return callAnthropicNonStream(m.id, system, user);
    case "openai":    return callOpenAINonStream(m.id, system, user);
    case "deepseek":  return callDeepSeekNonStream(system, user);
    case "gemini":    return callGeminiNonStream(m.id, system, user);
  }
}

// ── Peer Recovery Protocol (§8.4) ────────────────────────────────────────────
/**
 * Builds a peer-audit system prompt: the replacement model reviews what the
 * failed model produced (partial output) and continues from where it left off.
 * PDF §8.4 Steps 2-4: context handoff → peer audit → targeted continuation.
 */
function buildPeerAuditSystem(originalSystem: string, partialOutput: string): string {
  return `${originalSystem}

---
PEER RECOVERY PROTOCOL ACTIVE (§8.4)
A previous processing step started this task but did not complete it.
Partial output from the previous step is provided below.

Your task:
1. Review the partial output carefully.
2. Identify what is correct, what is incorrect, and what is missing.
3. Keep correct content exactly as-is.
4. Fix any incorrect content.
5. Complete whatever is missing.
6. Never regenerate correct work — only fix and complete.

PARTIAL OUTPUT FROM PREVIOUS STEP:
${partialOutput.slice(0, 4000)}
---`;
}

export interface FailoverLogEntry {
  agent: string;
  failedModel: string;
  replacementModel: string;
  timestamp: number;
  peerAuditUsed: boolean;
}

// ── Model Pool Manager (§20.3) ───────────────────────────────────────────────
/**
 * Calls the best available model for a tier with automatic failover.
 * On timeout (5s) or error, tries the next model in the pool.
 * Implements Peer Recovery Protocol (§8.4): replacement model audits partial output.
 * Records pool health after every call.
 */
export async function llmCall(
  system: string,
  user: string,
  tier: ModelTier = "mid",
  options?: { partialOutput?: string; onFailover?: (entry: FailoverLogEntry) => void }
): Promise<string> {
  const excludeModels = new Set<string>();
  let partialOutput = options?.partialOutput ?? "";

  for (let attempt = 0; attempt < 3; attempt++) {
    const pool = buildPool(tier, excludeModels);
    if (pool.length === 0) break;

    const model = pool[0];
    const modelKey = `${model.provider}:${model.id}`;
    const activeSystem = attempt > 0 && partialOutput
      ? buildPeerAuditSystem(system, partialOutput)
      : system;

    try {
      const result = await withTimeout(dispatchCall(model, activeSystem, user), TIMEOUT_MS);
      recordCall(modelKey, false);
      return result;
    } catch (err) {
      recordCall(modelKey, true);
      const failedModel = modelKey;
      excludeModels.add(modelKey);

      // Log failover for observability (§9.2 failover_cost, §10.6)
      const nextPool = buildPool(tier, excludeModels);
      if (nextPool.length > 0 && options?.onFailover) {
        options.onFailover({
          agent: "unknown",
          failedModel,
          replacementModel: `${nextPool[0].provider}:${nextPool[0].id}`,
          timestamp: Date.now(),
          peerAuditUsed: !!partialOutput,
        });
      }
    }
  }

  throw new Error("NO_LLM: All models in pool exhausted or unavailable.");
}

// ── Streaming with failover ──────────────────────────────────────────────────
async function streamAnthropic(
  model: string,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  onChunk: (text: string) => void
): Promise<string> {
  const key = process.env["ANTHROPIC_API_KEY"]!;
  const client = new Anthropic({ apiKey: key });
  let full = "";
  const stream = client.messages.stream({ model, max_tokens: 8192, system, messages });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      full += event.delta.text;
      onChunk(event.delta.text);
    }
  }
  return full;
}

async function streamOpenAI(
  model: string,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  onChunk: (text: string) => void
): Promise<string> {
  const key = process.env["OPENAI_API_KEY"]!;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model, stream: true, max_tokens: 8192,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("no body");
  const dec = new TextDecoder();
  let full = ""; let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data: ")) continue;
      const d = t.slice(6);
      if (d === "[DONE]") continue;
      try {
        const p = JSON.parse(d) as { choices?: { delta?: { content?: string } }[] };
        const c = p.choices?.[0]?.delta?.content;
        if (c) { full += c; onChunk(c); }
      } catch {}
    }
  }
  return full;
}

async function streamDeepSeek(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  onChunk: (text: string) => void
): Promise<string> {
  const key = process.env["DEEPSEEK_API_KEY"]!;
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "deepseek-chat", stream: true, max_tokens: 8192,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("no body");
  const dec = new TextDecoder();
  let full = ""; let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data: ")) continue;
      const d = t.slice(6);
      if (d === "[DONE]") continue;
      try {
        const p = JSON.parse(d) as { choices?: { delta?: { content?: string } }[] };
        const c = p.choices?.[0]?.delta?.content;
        if (c) { full += c; onChunk(c); }
      } catch {}
    }
  }
  return full;
}

async function streamGemini(
  model: string,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  onChunk: (text: string) => void
): Promise<string> {
  const combined = messages.map((m) => m.content).join("\n");
  const result = await callGeminiNonStream(model, system, combined);
  onChunk(result);
  return result;
}

async function dispatchStream(
  m: ModelDescriptor,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  onChunk: (text: string) => void
): Promise<string> {
  switch (m.provider) {
    case "anthropic": return streamAnthropic(m.id, system, messages, onChunk);
    case "openai":    return streamOpenAI(m.id, system, messages, onChunk);
    case "deepseek":  return streamDeepSeek(system, messages, onChunk);
    case "gemini":    return streamGemini(m.id, system, messages, onChunk);
  }
}

export async function llmStream(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  tier: ModelTier = "strong",
  onChunk: (text: string) => void
): Promise<string> {
  const excludeModels = new Set<string>();

  for (let attempt = 0; attempt < 3; attempt++) {
    const pool = buildPool(tier, excludeModels);
    if (pool.length === 0) break;

    const model = pool[0];
    const modelKey = `${model.provider}:${model.id}`;

    try {
      const result = await dispatchStream(model, system, messages, onChunk);
      recordCall(modelKey, false);
      return result;
    } catch (err) {
      recordCall(modelKey, true);
      excludeModels.add(modelKey);
    }
  }

  throw new Error("NO_LLM: All models in pool exhausted or unavailable.");
}

/**
 * Parallel calls — used by Consensus Agent (3 different providers = 3 personas).
 * PDF §5.9: sends identical question to three providers in parallel.
 */
export async function llmParallel(
  calls: { system: string; user: string; tier: ModelTier }[]
): Promise<string[]> {
  return Promise.all(
    calls.map((c) => llmCall(c.system, c.user, c.tier).catch(() => ""))
  );
}

// ── Dual-Model Verified Chat (§6.3) ─────────────────────────────────────────
/**
 * Sends the same chat request to TWO different-provider models in parallel.
 * Compares responses before returning — implements the "Direct Chat Path — Dual-Model Verified"
 * rule from PDF §6.3.
 *
 * Agreement: if both responses share substantial content (≥40% token overlap on key terms),
 *   Thinker Core merges them into one clean answer (picks the longer/richer one).
 * Disagreement on factual claims: escalates to a 3rd model as tie-breaker (majority vote).
 * Disagreement on opinion/style: returns primary answer with a subtle uncertainty marker.
 *
 * The caller never sees provider names — §6.5 Model Identity Concealment still applies.
 */
export interface DualChatResult {
  content: string;
  agreed: boolean;
  usedTieBreaker: boolean;
}

function tokenOverlap(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 3)
    );
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared++;
  return shared / Math.min(setA.size, setB.size);
}

function looksFactual(a: string, b: string): boolean {
  const factualPatterns = /\b(\d{4}|\d+%|[\d,]+\s*(km|mi|kg|lb|m|ft)|january|february|march|april|may|june|july|august|september|october|november|december)\b/i;
  return factualPatterns.test(a) || factualPatterns.test(b);
}

export async function llmDualChat(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<DualChatResult> {
  const available = availableProviders();
  const allFast = ALL_MODELS.filter(
    (m) => m.tier === "fast" && available.has(m.provider)
  );

  const usedProviders = new Set<string>();
  const twoModels: ModelDescriptor[] = [];
  for (const m of allFast) {
    if (!usedProviders.has(m.provider)) {
      twoModels.push(m);
      usedProviders.add(m.provider);
    }
    if (twoModels.length === 2) break;
  }

  if (twoModels.length === 0) {
    throw new Error("NO_LLM: No models available for dual-chat verification.");
  }

  if (twoModels.length === 1) {
    const single = await withTimeout(
      dispatchCall(twoModels[0], system, messages[messages.length - 1]?.content ?? ""),
      15000
    );
    return { content: single, agreed: true, usedTieBreaker: false };
  }

  const userText = messages[messages.length - 1]?.content ?? "";

  const [resA, resB] = await Promise.allSettled([
    withTimeout(dispatchCall(twoModels[0], system, userText), 15000),
    withTimeout(dispatchCall(twoModels[1], system, userText), 15000),
  ]);

  const textA = resA.status === "fulfilled" ? resA.value : "";
  const textB = resB.status === "fulfilled" ? resB.value : "";

  if (!textA && !textB) {
    throw new Error("NO_LLM: Both models failed in dual-chat.");
  }
  if (!textA) return { content: textB, agreed: true, usedTieBreaker: false };
  if (!textB) return { content: textA, agreed: true, usedTieBreaker: false };

  const overlap = tokenOverlap(textA, textB);
  const AGREE_THRESHOLD = 0.40;

  if (overlap >= AGREE_THRESHOLD) {
    const merged = textA.length >= textB.length ? textA : textB;
    return { content: merged, agreed: true, usedTieBreaker: false };
  }

  if (looksFactual(textA, textB)) {
    const remainingFast = allFast.find(
      (m) => !usedProviders.has(m.provider) && isHealthy(`${m.provider}:${m.id}`)
    );
    if (remainingFast) {
      try {
        const resC = await withTimeout(
          dispatchCall(remainingFast, system, userText),
          12000
        );
        const overlapAC = tokenOverlap(textA, resC);
        const overlapBC = tokenOverlap(textB, resC);
        const winner = overlapAC >= overlapBC ? textA : textB;
        return { content: winner, agreed: false, usedTieBreaker: true };
      } catch {
        // tie-breaker failed — fall through to uncertainty path
      }
    }
  }

  const uncertaintyNote =
    "\n\n> *Note: I want to be transparent — there's some nuance here and I'm giving you my best verified answer.*";
  const primary = textA.length >= textB.length ? textA : textB;
  return { content: primary + uncertaintyNote, agreed: false, usedTieBreaker: false };
}

export function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match?.[0] ?? raw) as T;
  } catch {
    return fallback;
  }
}

/** Returns list of currently-configured providers for observability. */
export function getActiveProviders(): string[] {
  return [...availableProviders()];
}

/** Returns pool snapshot for a tier — for health dashboard (§10.6). */
export function getPoolSnapshot(tier: ModelTier): { provider: string; model: string; healthy: boolean }[] {
  const available = availableProviders();
  return ALL_MODELS
    .filter((m) => m.tier === tier && available.has(m.provider))
    .map((m) => ({
      provider: m.provider,
      model: m.id,
      healthy: isHealthy(`${m.provider}:${m.id}`),
    }));
}
