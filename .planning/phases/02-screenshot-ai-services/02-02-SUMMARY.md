---
phase: 02-screenshot-ai-services
plan: 02
subsystem: analyze-service
tags: [gemini, vision-analysis, structured-output, focus-hint, retry]
dependency_graph:
  requires: [src/utils.js, src/screenshot.js]
  provides: [src/analyze.js]
  affects: [src/annotate.js, src/app.js]
tech_stack:
  added: []
  patterns: [structured-output-schema, dual-prompt-template, focus-hint-injection, json-retry]
key_files:
  created: [test-analyze.js]
  modified: [src/analyze.js]
decisions:
  - Gemini responseSchema with Type.OBJECT enforces JSON at the API level — no regex parsing needed
  - withJsonRetry wraps the full API call (not just JSON.parse) with 2 attempts for transient failures
  - FOCUS_PROMPT and NO_FOCUS_PROMPT as separate template constants for clean conditional selection
  - inlineData.data receives raw base64 string (no data URI prefix) per @google/genai multimodal pattern
metrics:
  duration: 3 minutes
  completed: "2026-04-04"
  tasks: 2
  files: 2
---

# Phase 02 Plan 02: Gemini Vision Analysis Service Summary

Gemini 2.5 Flash vision analysis with JSON schema enforcement, focus-aware dual-prompt selection, retry logic, and end-to-end test script that chains screenshot capture into analysis.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement analyze.js with Gemini vision and structured output | cd52451 | src/analyze.js |
| 2 | Create test-analyze.js standalone test script | d485dc0 | test-analyze.js |

## What Was Built

### src/analyze.js (full implementation, replaced stub)

- `GoogleGenAI` and `Type` imported from `@google/genai` (new unified SDK, NOT the deprecated `@google/generative-ai`)
- `FOCUS_PROMPT` — prompts Gemini to identify 3-5 elements relevant to the user-provided focus hint via `{{FOCUS_HINT}}` placeholder replacement
- `NO_FOCUS_PROMPT` — prompts Gemini to identify 3-5 most important elements and infer `detectedFocus` for fully-automated generation
- `RESPONSE_SCHEMA` — `Type.OBJECT` schema enforcing `pageTitle`, `pageTopic`, `detectedFocus`, and `elements` array with `minItems: 3`, `maxItems: 5`; each element requires `id`, `label`, `description`, `position`
- `responseMimeType: 'application/json'` + `responseSchema` in config enforce JSON at API level — no regex parsing
- `contents` uses `[{ parts: [{ text }, { inlineData: { data: base64Image, mimeType: 'image/png' } }] }]` multimodal structure
- `withJsonRetry(fn, 2)` wraps the full API call (handles transient failures and parse errors)
- Error wrapped as `"Analysis failed: could not interpret screenshot — {original message}"`
- Exports `{ analyzeScreenshot }`

### test-analyze.js (new)

- Chains `captureScreenshot(url)` → `analyzeScreenshot(base64, focus)` for end-to-end integration test
- Defaults to `https://example.com`; accepts URL as `argv[2]` and focus hint as `argv[3]`
- Saves analysis JSON to `./output/test-analysis.json`
- Prints `pageTitle`, `pageTopic`, `detectedFocus`, element count, and per-element `[id] label (position)`
- Usage: `node test-analyze.js` or `node test-analyze.js https://github.com "How to create a repository"`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — `analyzeScreenshot` is fully implemented. Requires valid `GEMINI_API_KEY` in `.env` to return live data (by design — calls external paid API).

## Self-Check

Files exist:
- src/analyze.js: FOUND
- test-analyze.js: FOUND

Commits exist:
- cd52451: FOUND
- d485dc0: FOUND

## Self-Check: PASSED
