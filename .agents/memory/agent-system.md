---
name: Agent System Architecture
description: How the 12-agent pipeline system is wired between mobile and API server
---

## Pipeline Agents (12 total per PDF spec)
intent, clarification, strategy, planner, research, design, builder, reviewer, critic, judge, consensus + thinkerCore orchestration

## Specialized Chat Agents (17 total)
ceo, planner, research, coding, browser, file, git, devops, memory, security, qa, video, image, music, canvas, automation, report

## Key files
- `artifacts/mobile/lib/agents.ts` — AgentType union, AgentDef interface, AGENTS record, AGENT_LIST array, detectAgentType()
- `artifacts/api-server/src/routes/chat.ts` — AGENT_SYSTEMS record with full system prompts per agent; Claude primary via @anthropic-ai/sdk; DeepSeek fallback; demo last
- `artifacts/mobile/components/AgentPanel.tsx` — tappable bar; opens Modal 2-col FlatList; onAgentChange prop wired in [id].tsx
- `artifacts/api-server/src/core/thinkerCore.ts` — Dynamic Routing Engine; reads next_action from every agent; loop detection; Strategy + Design agent routing
- `artifacts/api-server/src/types/pipeline.ts` — Full PipelineState with routing_history, loop_counts, failover_log, ThinkingLevel, PlanTier, AgentLog
- `artifacts/mobile/components/SignatureQuestionCard.tsx` — Signature Question UI (fires on every project-type request)

**Why:** systemHint was renamed to capability in agents.ts refactor — any old code referencing systemHint will break.

**How to apply:** When adding new agents: add to AgentType union + AGENTS record + AGENT_SYSTEMS in chat.ts + demoResponses.ts. All four must stay in sync.

## Dynamic Routing Engine (Section 20 of spec)
ThinkerCore reads `next_action` from every agent output:
- direct_answer → skip pipeline, single LLM call
- clarify → halt, return questions to user
- proceed → continue to next agent in sequence
- retry → increment loop_count, re-run same agent (capped at 3)
- replan → back to Planner with failure context (capped at 2 full cycles)
- escalate → invoke Consensus Agent

## New Events (mobile UI handles all these)
- signature_question → shows SignatureQuestionCard
- strategy_brief → renders strategy brief inline with assessment emoji
- thinking_summary → shows ThinkingLevel + estimated credits in pipeline label
- pipeline_halt → shows halt message with saved state notice
- failover → (future: shows generic delay message)

## Think Credits (Section 21 of spec)
- Located in: `artifacts/api-server/src/lib/thinkCredits.ts`
- Costs defined in CREDIT_COSTS record
- estimateSessionCredits(level) returns estimate per thinking level
- isFeatureGated(feature, tier) enforces plan tier gating

## Pipeline Route (extended)
POST /api/pipeline now accepts: planTier, thinkingLevel, signatureAnswer, signatureAnswered, existingRequirements, domain
