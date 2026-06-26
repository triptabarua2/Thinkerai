---
name: DB schema complete
description: All PDF §7.1 pipeline state fields added, plus Think Credits and billing tables.
---

# DB Schema — Complete V1

**Push command:** `pnpm --filter @workspace/db push` (never `pnpm db:push` — wrong filter)

**Tables:**
- `conversations` — per-conversation metadata, planTier, language, fix counts
- `messages` — chat messages (role, content, agentType)
- `pipeline_states` — full pipeline state per conversation run; includes all §7.1 fields: `failover_log`, `peer_audit_flag`, `resume_from_agent`, `signature_question_response`, `constraint_findings`, `assumption_flags`, `domain`
- `agent_logs` — per-agent observability log (§9.2); includes `model_used`, `provider_used`
- `version_history` — up to 10 versions per project (§9.6)
- `decision_memory` — explicit user rules (§7.3)
- `user_preferences` — theme, language, plan tier preference
- `user_credits` — Think Credits balance per user (§21); quota, monthly refill, grace period
- `credit_transactions` — full credit deduction log (§21.5)
- `billing_events` — Stripe webhook events log (§18.4)

**Why:** PDF §7.1 added failover_log and other fields for Dynamic Routing Engine observability. §21 required separate credits table for balance tracking and per-action deduction audit trail.
