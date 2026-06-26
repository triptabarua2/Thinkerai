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

// ── Model Pool Manager (§20.3) ───────────────────────────────────────────────
/**
 * Calls the best available model for a tier with automatic failover.
 * On timeout (5s) or error, tries the next model in the pool.
 * Records pool health after every call.
 */
export async function llmCall(
  system: string,
  user: string,
  tier: ModelTier = "mid"
): Promise<string> {
  const excludeModels = new Set<string>();

  for (let attempt = 0; attempt < 3; attempt++) {
    const pool = buildPool(tier, excludeModels);
    if (pool.length === 0) break;

    const model = pool[0];
    const modelKey = `${model.provider}:${model.id}`;

    try {
      const result = await withTimeout(dispatchCall(model, system, user), TIMEOUT_MS);
      recordCall(modelKey, false);
      return result;
    } catch (err) {
      recordCall(modelKey, true);
      excludeModels.add(modelKey);
      // peer_audit_flag would be set here in full pipeline context
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
