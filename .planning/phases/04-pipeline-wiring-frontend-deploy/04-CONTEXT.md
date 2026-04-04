# Phase 4: Pipeline Wiring + Frontend + Deploy - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire all existing pipeline services (screenshot, analyze, annotate, render) into a single Express POST route, build the vanilla HTML/CSS/JS web UI with loading states and error display, add periodic file cleanup, and deploy the complete app live on the Hostinger VPS via PM2. This is the finish line — a live URL, one input, one image out.

</domain>

<decisions>
## Implementation Decisions

### Loading Progress UX
- **D-01:** Simulated timer steps on the frontend — show fixed labels at ~5s intervals (Capturing... Analyzing... Writing... Rendering...) per brief Section 9. No SSE or polling.
- **D-02:** Show "Taking longer than usual..." message after 30 seconds if response hasn't arrived yet — subtle reassurance without adding complexity.

### File Cleanup
- **D-03:** node-cron running every 10 minutes to call cleanupOldFiles() — deletes output PNGs older than 1 hour. Reliable even during long-running sessions. Also run cleanup once on startup.

### VPS Deployment
- **D-04:** Git push to GitHub + git pull on VPS — standard, repeatable, traceable. SSH in, pull, npm install, pm2 restart.
- **D-05:** Use Puppeteer's bundled Chromium (no executablePath needed) — current render.js already works this way. Install system shared libs on VPS for the bundled Chrome to run.
- **D-06:** Run on port 3001 — VPS already has n8n/Supabase on other ports, avoid conflicts.

### Error Handling
- **D-07:** Simple red-bordered error message box on frontend — show stage-specific error text from server. No retry button; user clicks Generate again.
- **D-08:** Server-side URL validation before pipeline starts — use existing isValidUrl() from utils.js, return 400 immediately for invalid URLs. Fast feedback, no wasted API calls.

### Claude's Discretion
- Exact CSS styling values for the web UI (spacing, transitions, hover states)
- Loading spinner animation style (CSS spinner, pulsing dots, etc.)
- PM2 ecosystem.config.js structure and settings
- Exact wording of simulated progress labels (following brief Section 9 as guide)
- Whether to add client-side URL validation in addition to server-side

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `annotator-project-brief.md` Section 5 — Full pipeline architecture (POST /api/generate flow)
- `annotator-project-brief.md` Section 8.1 — server.js route specification (POST /api/generate, input validation, sanitizeFocus, timeout)
- `annotator-project-brief.md` Section 9 — Complete Web UI specification (design, inputs, loading states, download, error states)
- `annotator-project-brief.md` Section 10 — VPS deployment instructions
- `annotator-project-brief.md` Section 12 — Error handling strategy

### Project Planning
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Phase 4 requirements: PIPE-01, UI-01, UI-02, UI-03, UI-04, REL-04, DEPLOY-01
- `CLAUDE.md` — Tech stack research with PM2 gotchas (watch: false), Puppeteer VPS flags, node-cron guidance

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Express 5.1, CommonJS, VPS specs (4 CPU / 16GB RAM), port 3001
- `.planning/phases/02-screenshot-ai-services/02-CONTEXT.md` — AI service signatures, retry logic, 60s timeout, stage-specific errors
- `.planning/phases/03-card-template-render/03-CONTEXT.md` — renderCard() signature, template placeholders, Sharp optimization

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/screenshot.js` — captureScreenshot(url) returns {buffer, base64}
- `src/analyze.js` — analyzeScreenshot(base64, focus) returns structured JSON
- `src/annotate.js` — generateAnnotations(analysisData, focus) returns {cardTitle, cardSubtitle, steps[]}
- `src/render.js` — renderCard(annotationData, screenshotBase64, focus, pageUrl) returns {filename, filepath}
- `src/utils.js` — isValidUrl(), sanitizeFocus(), generateId(), ensureOutputDir() (cleanupOldFiles not yet implemented)
- `templates/card.html` — Complete card template with all placeholders
- `server.js` — Express 5.1 app with health check, static serving, error handler (no /api/generate route yet)

### Established Patterns
- CommonJS modules (require/module.exports)
- Environment variables via dotenv
- Pipeline functions accept focus as optional parameter (null when absent)
- Puppeteer browser cleanup via try/finally
- Stage-specific error messages (screenshot/analysis/copy/render)

### Integration Points
- `server.js` needs POST /api/generate route wiring all 4 pipeline services sequentially
- `public/index.html`, `public/style.css`, `public/app.js` are stubs ready to be filled
- `/output` directory already served as static files
- node-cron needs to be added to package.json dependencies
- PM2 ecosystem.config.js needs to be created for VPS deployment

</code_context>

<specifics>
## Specific Ideas

- Brief Section 9 has exact UI spec: dark background (#0D0D0D), centered 600px layout, pink Generate button, emoji step labels for progress
- Brief Section 8.1 specifies: normalize focus via sanitizeFocus(), pass through entire pipeline, 60s timeout on generate route
- VPS is at 82.29.160.5:3001 with 4 CPU / 16GB RAM — plenty of headroom
- All three API keys already configured on VPS
- Pipeline typical run time: 10-30s, hard cap at 60s

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-pipeline-wiring-frontend-deploy*
*Context gathered: 2026-04-04*
