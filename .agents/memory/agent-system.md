---
name: Agent System Architecture
description: How the 17-agent system is wired between mobile and API server
---

## Agent Types (17 total)
ceo, planner, research, coding, browser, file, git, devops, memory, security, qa, video, image, music, canvas, automation, report

## Key files
- `artifacts/mobile/lib/agents.ts` — AgentType union, AgentDef interface, AGENTS record, AGENT_LIST array, detectAgentType()
- `artifacts/api-server/src/routes/chat.ts` — AGENT_SYSTEMS record with full system prompts per agent; Claude primary via @anthropic-ai/sdk; DeepSeek fallback; demo last
- `artifacts/mobile/components/AgentPanel.tsx` — tappable bar; opens Modal 2-col FlatList; onAgentChange prop wired in [id].tsx

**Why:** systemHint was renamed to capability in agents.ts refactor — any old code referencing systemHint will break.

**How to apply:** When adding new agents: add to AgentType union + AGENTS record + AGENT_SYSTEMS in chat.ts + demoResponses.ts. All four must stay in sync.
