---
name: Third-party app connectors are UI-only mock state
description: Why the "connect apps" feature (chat input, profile linked accounts) has no real OAuth backend, and how to extend it consistently.
---

The mobile app has no OAuth/token infrastructure for third-party services (Google Drive, Notion, Slack, GitHub, Gmail, Calendar, etc.) — no provider secrets, no token storage table, no callback routes. Only Stripe has a real connector (via `REPLIT_CONNECTORS_HOSTNAME`, in `artifacts/api-server/src/lib/stripeClient.ts`).

Given that, the "connect apps" UI (chat input connector button → `ConnectorsSheet`, and `app/profile.tsx`'s "Linked Accounts" section) intentionally stores connection state as local, device-only state — an array of connected app ids in AsyncStorage (`useConnectors` hook, key `@thinker_connectors_v1`) — rather than faking a real data-access flow.

**Why:** Building real OAuth for even one of these providers requires picking a specific provider, provisioning API keys/secrets, and building token storage + refresh — a much larger scope than "add a button." The existing codebase already established this "mock/coming soon" convention itself (profile.tsx marks GitHub/Figma as "coming soon", `demoResponses.ts` mocks Slack actions), so matching it keeps the app internally consistent instead of half-wiring one provider while others stay fake.

**How to apply:** If the user asks to make a specific connector "actually work" (e.g., real Google Drive search), that's new scope — clarify which provider and note it likely needs a Replit integration/connector + new backend routes + token persistence, don't silently extend the mock. Don't add more mock providers without checking `useConnectors.ts`'s `CONNECTOR_APPS` list first (avoid duplicating an app under a different id).
