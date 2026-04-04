---
phase: 02-screenshot-ai-services
plan: 01
subsystem: utils + screenshot-service
tags: [screenshot, utils, retry, timeout, screenshotone]
dependency_graph:
  requires: []
  provides: [src/utils.js, src/screenshot.js]
  affects: [src/analyze.js, src/annotate.js, src/app.js]
tech_stack:
  added: [screenshotone-api-sdk]
  patterns: [lazy-client-init, retry-loop, promise-race-timeout]
key_files:
  created: [test-screenshot.js]
  modified: [src/utils.js, src/screenshot.js, .env.example]
decisions:
  - Lazy client construction in screenshot.js to allow module load without API keys
  - Client created inside captureScreenshot() via getClient() helper — throws clear error if keys missing
metrics:
  duration: 2 minutes
  completed: "2026-04-04"
  tasks: 2
  files: 4
---

# Phase 02 Plan 01: Screenshot Service and Shared Utils Summary

Implemented shared JSON retry/fence-strip/timeout infrastructure in utils.js and the screenshotOne screenshot capture service with retry logic, Blob-to-Buffer conversion, and clear error messaging.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add shared retry/timeout helpers and fix .env.example | a57a3ef | src/utils.js, .env.example |
| 2 | Implement screenshot.js with screenshotOne API and test script | 3b926ec | src/screenshot.js, test-screenshot.js |

## What Was Built

### src/utils.js (expanded)
Three new functions added to the existing 5-function module:
- `stripMarkdownFences(text)` — removes ```json / ``` wrappers from AI responses
- `withJsonRetry(apiFn, maxAttempts=2)` — retries the full API call (not just parse) on JSON parse failure (REL-01, D-07)
- `withTimeout(promise, ms, label)` — Promise.race-based timeout with configurable label for stage-specific errors (D-10)
- Module now exports 8 functions total

### src/screenshot.js (full implementation)
- screenshotOne SDK client via `getClient()` helper (lazy init, fails fast with clear error if keys absent)
- TakeOptions: 1200px viewport, fullPage, PNG, blockAds, blockCookieBanners, 2s delay
- Blob-to-Buffer conversion: `Buffer.from(await imageBlob.arrayBuffer())` (SDK returns Blob not Buffer)
- Retry loop (2 attempts) for 5xx/timeout resilience per D-08
- Returns `{ buffer, base64 }` per brief section 8.2
- Error message format: `"Screenshot capture failed: ..."` per D-09/REL-02

### .env.example
Added `SCREENSHOTONE_SECRET_KEY=your_secret_here` — was missing from original file. Now documents all 7 required env vars.

### test-screenshot.js
Standalone test script: `node test-screenshot.js [url]` (defaults to https://example.com). Saves PNG to `./output/test-screenshot.png` and prints size, base64 length, and timing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Deferred screenshotone.Client construction to call time**
- **Found during:** Task 2 verification
- **Issue:** SDK validates both API keys in the Client constructor and throws immediately if either is empty. Original plan initialized the Client at module load time (top-level `const client = new screenshotone.Client(...)`). With no real keys in .env, requiring the module crashed Node before `captureScreenshot` could be inspected.
- **Fix:** Moved client construction into a `getClient()` helper called at the start of `captureScreenshot()`. This allows the module to load cleanly and throws a clear `"Screenshot capture failed: SCREENSHOTONE_ACCESS_KEY and SCREENSHOTONE_SECRET_KEY must be set"` error at call time instead of crashing at require time. Behavior with real keys is identical.
- **Files modified:** src/screenshot.js
- **Commit:** 3b926ec

## Known Stubs

None — all exports are fully implemented. `captureScreenshot` requires valid API keys to return data (by design — it calls an external paid API).

## Self-Check

Files exist:
- src/utils.js: FOUND
- src/screenshot.js: FOUND
- .env.example: FOUND
- test-screenshot.js: FOUND

Commits exist:
- a57a3ef: FOUND
- 3b926ec: FOUND

## Self-Check: PASSED
