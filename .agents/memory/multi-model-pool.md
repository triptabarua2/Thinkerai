---
name: Multi-model pool architecture
description: How llm.ts implements the PDF §6.1/19/20.3 Model Pool Manager with failover across 4 providers.
---

# Multi-Model Pool Architecture

**Rule:** Provider diversity enforced — no two models in the same tier pool share a provider.

**Providers & env keys:**
- `ANTHROPIC_API_KEY` → claude-haiku-4-5 (fast), claude-sonnet-4-6 (mid), claude-opus-4-8 (strong)
- `OPENAI_API_KEY` → gpt-4o-mini (fast), gpt-4o (mid/strong)
- `DEEPSEEK_API_KEY` → deepseek-chat (fast/mid)
- `GEMINI_API_KEY` → gemini-1.5-flash (fast), gemini-1.5-pro (mid/strong)

**Failover (§19.2):** 5-second timeout per call. On timeout/error, next model in pool is tried. Up to 3 attempts per call. Failover is free (0 credits to user).

**Pool health (§19):** Models failing >20% of calls in a rolling 1-hour window are removed from their pool. Tracked in-memory via `poolHealth` Map in llm.ts.

**`llmParallel`:** Used by Consensus Agent — calls 3 providers simultaneously (§5.9).

**Pool dashboard:** `GET /api/healthz/pool` — returns active providers and per-tier health snapshot.

**Why:** PDF §6.6 — no magic numbers in code, pool driven by config (available env vars). Single-provider outage removes at most one model from any pool.

**How to apply:** When adding a new provider, add its `ModelDescriptor` entries to `ALL_MODELS` in llm.ts and add the env key check to `availableProviders()`.
