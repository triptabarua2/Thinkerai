# Thinker AI

A multi-agent AI operating system that understands goals, plans work, debates solutions, and delivers verified outcomes. Built as a mobile-first app (Expo + React Native) backed by an Express API server running 12 pipeline agents coordinated by Thinker Core.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/mobile run dev` — run the mobile/web app (port 8081)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## AI Provider Keys (add at least one as a Secret)

| Secret | Provider | Models |
|--------|----------|--------|
| `ANTHROPIC_API_KEY` | Anthropic | claude-haiku-4-5 / claude-sonnet-4-6 / claude-opus-4-8 |
| `OPENAI_API_KEY` | OpenAI | gpt-4o-mini / gpt-4o |
| `DEEPSEEK_API_KEY` | DeepSeek | deepseek-chat |
| `GEMINI_API_KEY` | Google | gemini-1.5-flash / gemini-1.5-pro |

Pool health: `GET /api/healthz/pool`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + SSE streaming
- DB: PostgreSQL + Drizzle ORM
- Mobile: Expo 54 + React Native + Expo Router
- Validation: Zod (zod/v4), drizzle-zod
- Build: esbuild (CJS bundle)

## Where Things Live

- `artifacts/api-server/src/core/thinkerCore.ts` — Thinker Core (pipeline orchestrator, dynamic routing engine)
- `artifacts/api-server/src/agents/` — all 12 agents (Intent, Clarification, Strategy, Planner, Research, Builder, Reviewer, Critic, Judge, Consensus, Design + clarificationAgent)
- `artifacts/api-server/src/lib/llm.ts` — Model Pool Manager (multi-provider failover, pool health)
- `artifacts/api-server/src/lib/thinkCredits.ts` — Think Credits system (Section 21)
- `lib/db/src/schema/index.ts` — DB schema source of truth
- `artifacts/mobile/app/chat/[id].tsx` — main chat screen
- `artifacts/mobile/components/` — all UI components (BlueprintApprovalCard, SignatureQuestionCard, etc.)

## Architecture (PDF Spec V1)

### 12 Agents (PDF §5)
1. **Intent Agent** — classifies message, detects language, selects thinking level
2. **Clarification Agent** — Smart Clarification, 3-Level Deep, Signature Question, Goal Discovery Mode
3. **Strategy Agent** — business/product thinking, Founder Mode, idea validation
4. **Planner Agent** — converts requirements into ordered steps
5. **Research Agent** — optional web context (plan-step flagged)
6. **Design Agent** — image/visual asset generation
7. **Builder Agent** — produces the deliverable (code, content, config)
8. **Reviewer Agent** — 5-point quality checklist
9. **Critic Agent** — adversarial independent review
10. **Judge Agent** — scores on 5 criteria, decides approval
11. **Consensus Agent** — 3-persona multi-model vote (borderline/high-risk)
12. **Clarification loop** — dynamic re-entry on vague answers

### Dynamic Routing Engine (PDF §20)
- `next_action`: proceed | retry | replan | clarify | escalate | direct_answer | halt
- Loop detection thresholds (builder:3, planner_cycle:2, clarification:4, consensus_cycle:2)
- Full routing_history trace in Pipeline State

### Model Pool Manager (PDF §19, §20.3)
- 5-second timeout triggers failover
- Provider diversity: no two models in same pool share a provider
- Pool health: 20% failure rate in 1-hour window removes model
- Failover is always free (0 credits to user)

### Think Credits (PDF §21)
- Low=1cr, Medium=9cr, High=66cr, Consensus=99cr
- Free Trial: 50 (one-time), Pro: 1500/month, Founder: 5000/month
- Confirm required for any action >3 credits
- Deduct on completion, not dispatch

### Plan Tiers & Feature Gates (PDF §18)
- **Free**: Basic clarification, Planner, Builder, Reviewer+Judge only, 3 versions
- **Pro**: Smart Clarification, Strategy, Design, Founder Mode, 10 versions
- **Founder**: Consensus Agent, Decision Memory, Priority Queue, 25 versions

## Product

A mobile AI app where users describe a goal and a 12-agent pipeline clarifies, strategizes, plans, builds, reviews, and delivers a verified answer. Supports 100+ languages, automatic language detection, RTL rendering, version history, decision memory, and Think Credits pricing.

## User Preferences

_Populate as you build._

## Gotchas

- Always run `pnpm --filter @workspace/db run push` after schema changes
- API server uses SSE (text/event-stream) — do not set response-altering middleware
- Mobile app sends `domain` field to pipeline — Intent Agent skips when domain is pre-selected
- Model pool requires at least one API key set as a Secret — without keys the pipeline returns a demo message
- `llmParallel` is used by Consensus Agent — calls all 3 providers simultaneously
- `esbuild` version is pinned to `0.27.3` — do not upgrade without testing

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- PDF spec: `attached_assets/Thinker_AI_V1_Architecture_Spec_COMPLETE_1782448797774.pdf`
