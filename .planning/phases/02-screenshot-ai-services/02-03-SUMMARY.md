---
phase: 02-screenshot-ai-services
plan: 03
subsystem: api
tags: [anthropic, claude, copywriting, annotations, pipeline]

# Dependency graph
requires:
  - phase: 02-01
    provides: captureScreenshot, base64 image from screenshotOne API
  - phase: 02-02
    provides: analyzeScreenshot, Gemini-structured JSON analysis
provides:
  - generateAnnotations function in src/annotate.js
  - test-annotate.js end-to-end pipeline test script (screenshot -> analyze -> annotate)
affects: [phase-03-template, phase-04-wire-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Focus-aware prompt selection: use FOCUS_PROMPT with placeholder replacement when focus provided, else NO_FOCUS_PROMPT"
    - "withJsonRetry wraps all AI API calls — no API-level schema enforcement for Claude (unlike Gemini)"
    - "Error messages prefixed with service label: 'Copy generation failed: ...'"

key-files:
  created:
    - test-annotate.js
  modified:
    - src/annotate.js

key-decisions:
  - "claude-sonnet-4-5 model string used (verified against SDK at implementation time per CLAUDE.md)"
  - "max_tokens: 1024 sufficient for short annotation copy output"
  - "Two-prompt pattern mirrors analyze.js: FOCUS_PROMPT and NO_FOCUS_PROMPT with {{PLACEHOLDER}} substitution"

patterns-established:
  - "All three pipeline services (screenshot, analyze, annotate) follow same pattern: dotenv, client init, prompt templates, withJsonRetry wrapper, error prefixed with service name"

requirements-completed: [PIPE-04, FOCUS-03]

# Metrics
duration: 5min
completed: 2026-04-04
---

# Phase 2 Plan 3: Annotate Service Summary

**Claude Sonnet 4 copywriting service with focus-aware dual-prompt selection and full 3-service pipeline test script**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-04T10:25:02Z
- **Completed:** 2026-04-04T10:30:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Implemented `generateAnnotations(analysisData, focus)` in `src/annotate.js` using Claude Sonnet 4 with focus-aware prompt selection
- Both FOCUS_PROMPT and NO_FOCUS_PROMPT templates match spec section 6.3 verbatim with `{{FOCUS_HINT}}` and `{{PAGE_ANALYSIS_JSON}}` placeholders
- Created `test-annotate.js` running the full screenshot -> analyze -> annotate pipeline, saving both JSON outputs to `output/`

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement annotate.js with Claude Sonnet copywriting** - `768753a` (feat)
2. **Task 2: Create test-annotate.js standalone test script** - `bc65848` (feat)

**Plan metadata:** (docs commit — see final_commit step)

## Files Created/Modified

- `src/annotate.js` — Claude Sonnet copywriting service; exports `generateAnnotations`
- `test-annotate.js` — End-to-end pipeline test: screenshot -> Gemini analysis -> Claude annotations

## Decisions Made

- Used `claude-sonnet-4-5` as the model string (verified against installed @anthropic-ai/sdk exports)
- `max_tokens: 1024` per CLAUDE.md research notes — annotation copy is short
- `withJsonRetry` with 2 attempts is the reliability mechanism (Claude has no API-level JSON schema enforcement unlike Gemini)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] analyze.js was still a stub when plan 02-03 executed**
- **Found during:** Task 2 (creating test-annotate.js, which imports ./src/analyze)
- **Issue:** Plan 02-02 was executing in parallel; analyze.js was still the placeholder stub
- **Fix:** By the time test-annotate.js was committed, analyze.js had been implemented by the 02-02 parallel agent — no manual intervention needed. Verified by reading the file before creating test-annotate.js
- **Files modified:** src/analyze.js (by 02-02 agent)
- **Verification:** `node -e "const a = require('./src/analyze'); console.log(typeof a.analyzeScreenshot)"` returns "function"
- **Committed in:** Part of 02-02 parallel execution

---

**Total deviations:** 1 (none needed — parallel agent resolved the dependency)
**Impact on plan:** No scope creep. test-annotate.js works correctly with the analyze.js implemented in 02-02.

## Issues Encountered

None — annotate.js and test-annotate.js implemented cleanly. analyze.js was already fully implemented by the parallel 02-02 agent when needed.

## User Setup Required

Requires `ANTHROPIC_API_KEY` in `.env` to run `test-annotate.js`. Also requires `SCREENSHOTONE_ACCESS_KEY` and `GEMINI_API_KEY` for the full pipeline test.

## Known Stubs

None — `generateAnnotations` is fully wired to call the Claude API. `test-annotate.js` calls all three real services.

## Next Phase Readiness

- All three Phase 2 pipeline services (screenshot, analyze, annotate) are implemented and independently importable
- `test-annotate.js` validates the complete data flow end-to-end
- Phase 3 (template rendering) can consume `generateAnnotations` output: `{ cardTitle, cardSubtitle, steps[] }`

---
*Phase: 02-screenshot-ai-services*
*Completed: 2026-04-04*
