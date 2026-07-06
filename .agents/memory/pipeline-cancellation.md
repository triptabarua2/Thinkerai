---
name: Pipeline cancellation (stop button) pattern
description: How the stop/cancel-mid-stream feature is wired between mobile and thinkerCore; important gotchas.
---

The stop button (frontend) cancels an in-flight thinkerCore run via cooperative
cancellation, not a hard kill — thinkerCore only checks a `checkCancelled()`
flag at stage boundaries (after intent/clarification, top of plannerLoop, top
of builderReviewerLoop, before consensus). It cannot interrupt mid-LLM-call.

**Why:** thinkerCore runs as a long synchronous-ish async function with no
natural task-cancellation primitive; polling a `cancelled` flag on the job
record at each stage boundary was the least invasive way to add stoppability
without restructuring the pipeline into a cancellable task tree.

**How to apply:**
- The route handler's post-`await runThinkerCore(...)` cleanup (`markJobComplete`)
  must check `getJob(jobId)?.status !== "cancelled"` before overwriting status —
  otherwise a cancelled job gets silently flipped back to "complete"/"failed"
  after `checkCancelled()` already emitted the cancelled `done` event and returned.
- On the client, aborting the fetch/AbortController is a *separate* signal from
  the server-side cancel — both must fire: `POST /:jobjobId/cancel` tells the
  server to stop advancing stages, and `controller.abort()` stops the local SSE
  read loop immediately (since the server may still be mid-stage until its next
  checkpoint).
- Treat `AbortError` in the catch block as a deliberate stop, not a connection
  failure — otherwise the message gets wrongly requeued for offline retry and
  shows a misleading "connection lost" bubble.
- After a build.mjs-based esbuild bundle workflow (`node ./dist/index.mjs`),
  source edits require a manual `node ./build.mjs` + workflow restart — the
  dist bundle does not auto-rebuild like the `pnpm run dev` script does.
