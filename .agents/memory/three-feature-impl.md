---
name: Three-feature implementation
description: Lessons from adding FinalOutputCard share/copy, native voice via expo-av, and Stripe checkout wiring
---

## FinalOutputCard (Share/Copy)

**Rule:** When pipeline state (like `setFinalOutput(null)` or `pipelineStartTimeRef.current`) needs to be reset on new message, add the reset to ALL send paths — not just `sendMessageWithOptions`. The main `sendMessage` path also needs it.

**Why:** The review caught that `setFinalOutput(null)` was only in `sendMessageWithOptions` not `sendMessage`, so duration showed 0 on normal chat sends.

**How to apply:** Search for every call to `processSSEStream` — each of its callers needs the same pre-send state resets.

## expo-av Deprecation (SDK 54)

**Rule:** `expo-av` works in SDK 54 but prints a deprecation warning. The replacement is `expo-audio` (for recording) + `expo-video` (for playback).

**Why:** Expo deprecated expo-av in SDK 54. The API differs slightly (`Audio.Recording` → `useAudioRecorder` hook in expo-audio).

**How to apply:** If migrating voice recording, replace `expo-av` Audio with `expo-audio`'s `useAudioRecorder` hook. Task #3 (package version fixes) is a natural home for this migration.

## Port Conflicts (Old vs New API Server Workflows)

**Rule:** Two API server workflows co-exist: "API Server" (legacy, stale dist) and "artifacts/api-server: API Server" (canonical, rebuilds fresh). If port 8080 is taken, kill with `ps aux | grep "dist/index" | awk '{print $1}' | xargs kill -9`.

**Why:** The legacy workflow can hold port 8080 and prevent the canonical workflow from starting.

## CreditsUsageSection Animation Deps

**Rule:** Animation effects depending on async-fetched data must include the derived value in the useEffect dep array so animation re-runs when live data arrives.

**Why:** Empty dep array means usage bar stays at 0% if credits load after initial mount.

## Multipart Audio Upload Security

**Rule:** Always add both a Content-Length header check AND a streaming byte count guard in raw body collectors (10 MB limit for audio).

**Why:** Without a size limit, any caller can exhaust server memory.
