---
phase: 04-pipeline-wiring-frontend-deploy
plan: "01"
subsystem: pipeline-wiring-and-frontend
tags:
  - express
  - api-route
  - node-cron
  - frontend
  - vanilla-js
  - dark-theme

dependency_graph:
  requires:
    - src/screenshot.js (captureScreenshot)
    - src/analyze.js (analyzeScreenshot)
    - src/annotate.js (generateAnnotations)
    - src/render.js (renderCard)
    - src/utils.js (isValidUrl, sanitizeFocus, cleanupOldFiles, ensureOutputDir, withTimeout)
  provides:
    - POST /api/generate endpoint
    - Complete web frontend (index.html + style.css + app.js)
    - node-cron cleanup every 10 minutes
  affects:
    - server.js (modified)
    - public/index.html (replaced stub)
    - public/style.css (replaced stub)
    - public/app.js (replaced stub)

tech_stack:
  added:
    - node-cron (cron scheduling for file cleanup)
  patterns:
    - Sequential async pipeline: captureScreenshot -> analyzeScreenshot -> generateAnnotations -> renderCard
    - 60s withTimeout wrapper around entire pipeline
    - setInterval stage cycling at 5000ms for loading UX
    - setTimeout at 30000ms for long-running notice (D-02)
    - Client-side URL validation mirrors server-side (D-08)

key_files:
  created: []
  modified:
    - server.js
    - public/index.html
    - public/style.css
    - public/app.js

decisions:
  - "D-08: Client-side URL validation (isValidUrlClient) mirrors server-side isValidUrl() — both check http/https protocol"
  - "Express 5 async route used with inline try/catch per research pitfall 4 — prevents unhandled rejection double-send"
  - "focus: focus || undefined in fetch body — omits key when empty, cleaner than sending empty string to server"

metrics:
  duration: "105 seconds"
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_modified: 4
---

# Phase 04 Plan 01: Pipeline Wiring and Frontend Summary

Complete POST /api/generate route wiring all 4 pipeline services sequentially with 60s timeout, plus dark-themed vanilla frontend with emoji loading stages, 30s long-running notice, result display, and red-bordered error box.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire POST /api/generate route and cron cleanup | fc11bde | server.js |
| 2 | Build complete frontend (index.html + style.css + app.js) | 4529c85 | public/index.html, public/style.css, public/app.js |

## What Was Built

### Task 1 — server.js Pipeline Route

- Added `POST /api/generate` route that chains `captureScreenshot -> analyzeScreenshot -> generateAnnotations -> renderCard` sequentially
- URL validation via `isValidUrl()` returns HTTP 400 before any API calls fire
- 60-second `withTimeout` wrapper around entire pipeline with descriptive 'Generation' label
- `node-cron` schedules `cleanupOldFiles()` every 10 minutes (D-03)
- `cleanupOldFiles()` also called once on server startup to clear stale files immediately
- Destructured multi-function utils import replaces single `ensureOutputDir` import

### Task 2 — Complete Frontend (3 files)

**public/index.html:**
- Single `main.container` layout, max-width 600px centered
- Form with URL (type=url, required), Focus (optional text), Generate button, inline error paragraph
- Loading section with CSS spinner, status-text paragraph, long-running-notice paragraph
- Result section with img + anchor download button
- Error section with error-box styling

**public/style.css:**
- Dark theme: page background #0D0D0D, card #1A1A1A, accent #FF2D6B, error #FF4444
- DM Sans font (400 + 600 weights only)
- CSS spinner via `@keyframes spin` at 0.8s linear infinite
- All spacing per UI-SPEC 8-point scale (4/8/16/24/32/48/64px tokens)
- Full hover/focus/disabled states on button and inputs

**public/app.js:**
- STAGES array with 4 emoji labels matching UI-SPEC Copywriting Contract exactly
- `startLoading()`: disables button, starts 5s `setInterval` stage cycling, starts 30s `setTimeout` for long-running notice
- `stopLoading()`: clears interval and timeout, hides loading section, re-enables button
- `showResult(imageUrl)`: sets img.src, sets anchor href + download attribute
- `showError(message)`: fills error-text, shows error-section
- `isValidUrlClient()`: mirrors server-side logic (http/https protocol check)
- form submit handler: client validation -> startLoading -> fetch -> handle response -> stopLoading (finally)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Created files exist
- server.js: modified in place
- public/index.html: verified contains generate-form, loading-section, result-section, error-section
- public/style.css: verified contains #0D0D0D, #FF2D6B, @keyframes spin
- public/app.js: verified contains /api/generate, setInterval, 30000

### Commits exist
- fc11bde: feat(04-01): wire POST /api/generate route and cron cleanup
- 4529c85: feat(04-01): build complete frontend per UI-SPEC contract

### Cross-file links verified
- All 13 DOM IDs referenced in app.js exist in index.html
- app.js POSTs to /api/generate; server.js defines app.post('/api/generate')
- server.js calls captureScreenshot, analyzeScreenshot, generateAnnotations, renderCard in order

## Self-Check: PASSED
