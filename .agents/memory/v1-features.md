---
name: V1 Feature Implementation
description: All V1 spec features implemented — blueprint approval, version history, decision memory, language detection, domain picker fix, new SSE events
---

## What was built

### Backend (api-server)
- **Language detection** — IntentAgent detects ISO 639-1 language code via LLM + Unicode heuristics; `getLanguageName()` helper; emits `language_detected` SSE event
- **Blueprint Approval Gate** — ThinkerCore emits `blueprint_ready` event with steps+techStack+complexity before Builder runs for High/Consensus thinking; re-send with `blueprintApproved: true` + `existingPlan` resumes from Builder
- **Version History** — `saveVersion()` in thinkerCore saves each builder output as a `VersionSnapshot`; emits `version_saved` event; keeps last 10 versions
- **Decision Memory** — regex pattern detection for "always/never/from now on" phrases; emits `decision_saved` event; injected into agent requirements
- **New PipelineEvents** — `blueprint_ready`, `decision_saved`, `version_saved`, `language_detected`, `thinking_summary`, `strategy_brief`, `signature_question`
- **New PipelineState fields** — `detectedLanguage`, `decisionMemory[]`, `version_history[]`, `current_version`, `medium_fix_count`, `full_rebuild_count`, `blueprintApproved`
- **Domain picker** — pipeline route accepts `domain` and passes it to plannerAgent

### Frontend (mobile)
- **BlueprintApprovalCard** — shows plan steps with type badges, tech stack, approve/modify/start-over actions
- **VersionHistoryCard** — lists saved versions with timestamps; rollback button restores any previous version
- **DecisionMemoryBanner** — animated banner confirming when a rule was saved to decision memory
- **ChatScreen** — handles all new SSE events: `language_detected`, `decision_saved`, `version_saved`, `blueprint_ready`, `strategy_brief`, `thinking_summary`, `pipeline_halt`
- **Domain** — agent selection in AgentPanel now sets `selectedDomain` state and passes it in every API request
- **Version UI** — clock icon in header toggles version history panel; `v{N}` pill in composer

## Key architectural decisions
- Blueprint gate only fires for High/Consensus thinking; low/medium skip it (too fast to need approval)
- Version history capped at 10 entries (FIFO) to limit payload size
- Decision memory is injected as `_decision_memory` into requirements so all agents see it
- Rollback is free (0 credits) — it just restores content from local state, no API call needed

**Why:** Spec required these as V1 launch checklist items. Blueprint gate prevents wasted compute on wrong plans. Version history lets users iterate without losing work.
