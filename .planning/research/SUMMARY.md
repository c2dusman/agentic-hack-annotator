# Project Research Summary

**Project:** AnnotatorAI
**Domain:** Automated URL-to-annotated-image pipeline (screenshot capture + AI vision + AI copywriting + Puppeteer card render)
**Researched:** 2026-04-04
**Confidence:** HIGH

## Executive Summary

AnnotatorAI is a stateless, single-request pipeline that converts a URL into a 1080x1920 social card with AI-generated tutorial annotations. The product is architecturally straightforward — a sequential 6-step pipeline behind a single Express POST endpoint — but the integration surface is wide: two external AI APIs (Gemini 2.5 Flash for vision, Claude Sonnet for copy), one screenshot API (screenshotOne), and one local headless browser (Puppeteer for card rendering). Research confirms this is a well-understood pattern with established Node.js conventions. The primary risk is not architectural complexity but execution: each integration has a specific failure mode that must be guarded against proactively, not reactively.

The recommended approach is to build and validate each pipeline stage in isolation (screenshot → vision → copy → render → optimize → cleanup) before wiring them together. Services should be one file per stage with explicit typed inputs/outputs, all orchestrated by a thin `pipeline.js` coordinator. The key performance trade-off is that all 6 steps are inherently sequential, meaning total latency is the sum of each step (21–43s is realistic). This is acceptable for the hackathon use case, but users must see a stage-by-stage progress indicator or they will abandon the page. The one-click, zero-signup experience is the core product differentiator — scope must be held hard at single URL, single card, download-and-go.

The critical risks are: (1) Puppeteer crashing silently on the Linux VPS without the required sandbox flags — this must be validated on the actual VPS before any other integration work; (2) AI responses returning JSON wrapped in markdown fences, which breaks JSON.parse without a sanitizer; (3) screenshotOne returning a blank or error page that Gemini then analyzes as valid content; (4) orphaned Chromium processes accumulating when errors are not caught in try/finally blocks. All four are preventable with specific, one-time implementation choices documented in detail in PITFALLS.md.

---

## Key Findings

### Recommended Stack

The stack is lean and purpose-fit. Node.js 20 LTS is the current VPS environment (note: EOL this month — upgrade to Node 22 post-hackathon). Express 5.1 is now the npm default and should be used over 4.x on this greenfield project. The two AI SDKs are `@google/genai` (v1.x — the new unified Google SDK, NOT the frozen `@google/generative-ai` 0.24.x) and `@anthropic-ai/sdk` (v0.82.x). Puppeteer 24.x handles HTML-to-PNG card rendering; screenshotOne API handles the input URL screenshot capture (avoids running two Chrome processes on a constrained VPS). Sharp 0.34.x post-processes the Puppeteer output for compression. PM2 v6 manages the VPS process with `watch: false` — setting watch to true causes infinite restart loops when Puppeteer writes output files.

**Core technologies:**
- Node.js 20 LTS: runtime — matches pre-provisioned VPS; upgrade to 22 LTS post-hackathon
- Express 5.1: HTTP server and API routing — now the npm latest default; use v5 on greenfield
- screenshotOne API + SDK: input URL screenshot capture — avoids double Chrome instances on VPS
- `@google/genai` v1.x: Gemini 2.5 Flash vision analysis — new unified SDK with structured output (JSON schema enforcement); the old SDK is frozen and cannot do this
- `@anthropic-ai/sdk` v0.82.x: Claude Sonnet 4 annotation copywriting — official SDK, Node 18+ required
- Puppeteer 24.x: HTML template to PNG rendering — single reusable browser instance at server startup
- Sharp 0.34.x: final PNG compression pass — wraps libvips; 10-30x faster than pure-JS alternatives
- node-cron v3: scheduled file cleanup — survives PM2 restarts unlike setTimeout; use over setInterval
- PM2 v6 (global): VPS process management — `watch: false`, `max_memory_restart: '800M'`

### Expected Features

The MVP is a lean 10-feature set. Every P1 feature is either a pipeline step or a user-facing necessity for the pipeline to feel usable. There are zero luxury features in P1 — the scope boundary is tight and well-justified by the 24-hour hackathon deadline.

**Must have (table stakes):**
- URL input + optional focus hint field — the entire value prop; focus hint threads through both Gemini and Claude prompts
- Single generate button with loading state showing pipeline stages — 10-40s pipeline requires step-by-step feedback or users assume the tool is broken
- Screenshot capture via screenshotOne API — full page, 1200px viewport
- Gemini 2.5 Flash vision analysis with structured JSON output — auto-infers what to annotate when no focus hint given
- Claude Sonnet 4 tutorial-style annotation copywriting — instructional voice, not descriptive
- Puppeteer card render at 1080x1920 with dark theme and pink accents — correct 9:16 ratio for Stories/Reels
- Downloadable output image — if users cannot save the result, the tool has no value
- Meaningful per-stage error messages — bad URL, blank screenshot, AI timeout each need distinct messages
- Auto-cleanup of output files after 1 hour — privacy default; disk pressure prevention

**Should have (competitive):**
- Optional focus hint for directed annotation — turns generic screenshots into targeted tutorials with minimal complexity
- Auto-inferred annotation (no focus hint path) — zero-friction for users who don't know what to highlight
- Stateless / zero sign-up experience — reduces demo friction and is already planned

**Defer (v2+):**
- Shareable output URL / CDN link — useful but not required for hackathon judging
- Multiple card templates (light theme, minimal) — add only after validating the dark template converts
- Batch/bulk URL processing — requires queue architecture; kills hackathon timeline
- Screenshot preview before annotating — nice UX addition but adds a round-trip before the main action
- Brand customization (logo, colors) — high implementation cost relative to core value
- User accounts and history — auth + database; not in scope

### Architecture Approach

The architecture is a single-route Express server with a 6-stage sequential pipeline implemented as one service file per stage. There is no database, no queue, no auth, and no background workers — the pipeline runs synchronously per HTTP request. Each service takes a typed input and returns a typed output, making any single stage swappable without touching the others. Output files are UUID-named PNGs in `/tmp/annotator/` with a 1-hour TTL managed by node-cron. The frontend is vanilla HTML/CSS/JS served as static files — no framework needed.

**Major components:**
1. `server.js` — Express bootstrap, static serving, PM2 entry point; launches the single Puppeteer browser instance at startup and stores it on `app.locals.browser`
2. `routes/generate.js` — thin route handler: validate input, call pipeline, return `{ imageUrl }` or `{ error }`
3. `services/pipeline.js` — sequential step orchestrator: screenshot → vision → copy → render → optimize → cleanup
4. `services/screenshot.js` — screenshotOne API call; returns PNG buffer (never written to disk)
5. `services/vision.js` — Gemini 2.5 Flash; returns structured JSON `{ pageTitle, mainTopic, annotations[], inferredFocus }`
6. `services/copy.js` — Claude Sonnet; returns `{ headline, subheadline, steps[], callout }`
7. `services/render.js` — injects copy into `templates/card.html`, uses `app.locals.browser` to create a page, screenshots at 1080x1920, closes page in `finally`
8. `services/optimize.js` — Sharp compression pass; returns final PNG path
9. `services/cleanup.js` — node-cron job runs every 15 minutes deleting files older than 1 hour
10. `templates/card.html` — dark-themed 1080x1920 layout with embedded fonts (not CDN), CSS variables for injected content
11. `public/` — vanilla HTML/CSS/JS frontend; fetch POST, stage-labeled loading, image preview, download button

### Critical Pitfalls

1. **Puppeteer sandbox flags on Linux VPS** — Always launch with `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu --no-first-run --no-zygote`. Missing any of these causes silent crashes on Ubuntu 22.04. Validate on the actual VPS with a minimal test before wiring the full pipeline.

2. **AI JSON wrapped in markdown fences** — Never call `JSON.parse()` directly on raw Gemini or Claude output. Always strip backtick code fences first. Use Gemini's `responseMimeType: 'application/json'` + `responseSchema` for API-level enforcement; use an explicit "respond with only a JSON object, no markdown" system prompt for Claude.

3. **screenshotOne returns blank or error page** — HTTP 200 does not mean the page rendered meaningful content. Validate the screenshot buffer with Sharp (`metadata()` for dimensions, `stats()` for near-white pixel density) before passing to Gemini. Catch HTTP 422 timeout errors explicitly.

4. **Puppeteer browser/page not closed on error path** — Always use `try/finally` — never `try/catch` alone — around the render page lifecycle. Unclosed pages accumulate Chromium processes; 10+ orphaned processes cause OOM kills on a 2GB VPS.

5. **Google Fonts failing in headless Chromium on Linux** — Embed fonts as base64 `@font-face` directly in the HTML template. CDN font loading is unreliable in headless Chrome on Ubuntu minimal images due to User-Agent detection and network idle timing.

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and Server Scaffold
**Rationale:** Everything else depends on a working Express server on the VPS. This phase also validates the VPS environment for Puppeteer — the #1 deployment pitfall. No AI integration code can be trusted until Puppeteer renders successfully on the actual VPS.
**Delivers:** Running Express server on VPS, static file serving, PM2 ecosystem config, Puppeteer launched and confirmed working with sandbox flags, `/tmp/annotator/` directory, minimal smoke-test endpoint.
**Addresses:** URL input form (static HTML served), basic project structure from ARCHITECTURE.md
**Avoids:** Pitfall 1 (Puppeteer sandbox crashes) — validate flags on VPS before any pipeline work; Pitfall 4 (browser not closed on error) — implement try/finally pattern from day one
**Research flag:** Standard patterns — skip phase research

### Phase 2: Screenshot Capture Service
**Rationale:** Screenshot quality gates all downstream AI calls. A broken or blank screenshot produces meaningless output from both Gemini and Claude, wasting API credits and misleading integration testing. This must be solid and validated before touching AI.
**Delivers:** `services/screenshot.js` calling screenshotOne API, returning a PNG buffer; screenshot validation (dimensions + brightness check) as a gate; explicit HTTP 422 / timeout error handling; URL encoding and SSRF protection (block private IP ranges, require HTTPS).
**Addresses:** "Screenshot faithfully represents the URL" table-stakes feature; error messages for screenshot failures
**Avoids:** Pitfall 5 (blank/error images passed to Gemini)
**Research flag:** Standard patterns — skip phase research

### Phase 3: AI Integration — Vision and Copy Services
**Rationale:** Both AI services can be developed and tested in parallel using mock inputs (vision uses the screenshot buffer; copy uses mock vision JSON). This parallelizes dev effort even though runtime is sequential. AI integration is the most fragile part of the pipeline — JSON parsing, prompt engineering, and model string verification need dedicated focus.
**Delivers:** `services/vision.js` (Gemini structured JSON from screenshot buffer), `services/copy.js` (Claude tutorial-style copy from vision JSON), JSON sanitizer for markdown-fenced responses, retry wrappers (max 3 attempts, exponential backoff) for both AI calls, prompt templates enforcing JSON-only output.
**Addresses:** Gemini vision analysis, Claude copywriting, auto-inferred annotation, focus hint threading through both prompts
**Avoids:** Pitfall 3 (markdown-fenced JSON breaking parse); verify correct SDK (`@google/genai` not `@google/generative-ai`); verify current Claude model string before coding
**Research flag:** Needs phase research — Gemini `responseSchema` configuration and Claude prompt structure for JSON-enforced output benefit from targeted API documentation review

### Phase 4: Card Template and Render Service
**Rationale:** The HTML template must be built and visually verified on the VPS (not just locally) before the render service is wired into the pipeline. Font rendering differences between macOS and Ubuntu headless Chrome are only visible by inspecting VPS output directly.
**Delivers:** `templates/card.html` (1080x1920 dark theme, pink accents, embedded base64 fonts), `services/render.js` (Puppeteer page creation using `app.locals.browser`, `setContent` + `waitForNetworkIdle`, 1080x1920 screenshot, page closed in `finally`), `services/optimize.js` (Sharp compression at quality 85), UUID-scoped output file naming.
**Addresses:** Correct output dimensions (9:16), dark-themed card with branded accents, visible annotation text
**Avoids:** Pitfall 2 (Google Fonts CDN fallback — use embedded base64); Pitfall 4 (browser page not closed — `finally` block mandatory)
**Research flag:** Standard patterns for Puppeteer render — skip phase research; template design is custom work

### Phase 5: Pipeline Wiring and Frontend
**Rationale:** With all services validated in isolation, this phase connects them end-to-end and builds the user-facing UI. Latency profiling happens here — total wall time must be measured and stage labels must accurately reflect real pipeline timing.
**Delivers:** `services/pipeline.js` (sequential step orchestrator with error propagation), `routes/generate.js` (request validation, pipeline call, image response), complete frontend (`public/index.html`, `app.js`, `styles.css`) with URL input, focus hint field, stage-labeled loading indicator, image preview, download button, and error display.
**Addresses:** All P1 features from FEATURES.md; single-click generate; loading progress with stage labels; downloadable output; meaningful error messages
**Avoids:** Pitfall 7 (latency stacking — measure each step, display stage labels to manage perception); UX pitfall of showing generic errors
**Research flag:** Standard patterns — skip phase research

### Phase 6: File Cleanup, Rate Limiting, and Deployment Hardening
**Rationale:** These cross-cutting concerns are grouped together because they all relate to production reliability rather than feature delivery. They must be in place before any public traffic hits the server — not deferred as "nice to have." File cleanup in particular has a specific failure mode (setTimeout reset on PM2 restart) that only the cron approach avoids.
**Delivers:** `services/cleanup.js` (node-cron job every 15 minutes deleting files older than 1 hour), startup sweep deleting files older than 2 hours (safety net for prior accumulated files), per-IP rate limiting via `express-rate-limit` (5 req/min), PM2 `max_memory_restart: '800M'`, request timeout (120s), disk space guard before each request (reject with 503 if under 500MB), final smoke test on VPS.
**Addresses:** Auto-cleanup (1hr TTL), reasonable generation time (under 60s), VPS deployment via PM2
**Avoids:** Pitfall 6 (disk fills from leaked output files — cron not setTimeout); security mistake of no rate limiting
**Research flag:** Standard patterns — skip phase research

### Phase Ordering Rationale

- **VPS-first validation:** Puppeteer must be confirmed working on the target Linux environment before any dependent services are built. Discovering the sandbox flag requirement after writing the full pipeline wastes a day of work.
- **Data gates data:** Screenshot must be solid before AI integration begins. AI services should be tested with real screenshot buffers, not synthetic inputs, to surface format and size issues early.
- **Isolation before integration:** Building each service independently (Phases 2-4) means each stage can be unit-tested with mocks. Wiring happens only in Phase 5 when all stages are known-good.
- **Reliability before traffic:** Cleanup, rate limiting, and memory guards (Phase 6) are not features — they are production prerequisites. Deploying without them risks screenshotOne quota exhaustion and OOM crashes mid-demo.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (AI Integration):** Gemini `responseSchema` syntax and field naming in `@google/genai` v1.x SDK requires exact API documentation. Claude system prompt patterns for JSON-only output have nuance (temperature, stop sequences). Confirm the current Claude model string (`claude-sonnet-4-5` at research time — verify before coding).

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Express 5 + PM2 setup is exhaustively documented.
- **Phase 2 (Screenshot):** screenshotOne has official Node.js SDK docs; URL validation patterns are standard.
- **Phase 4 (Template + Render):** Puppeteer `setContent` + screenshot is a textbook use case; Sharp compression API is stable.
- **Phase 5 (Pipeline Wiring):** Sequential async pipeline is a basic Node.js pattern; Express route structure is standard.
- **Phase 6 (Cleanup + Hardening):** node-cron, express-rate-limit, and PM2 memory restart are well-documented and configuration-only.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core libraries verified against official docs and npm. One exception: screenshotOne SDK version number not confirmed via live fetch (MEDIUM for that package specifically). |
| Features | MEDIUM | Core pipeline features verified across multiple sources. Social-card market patterns derived from adjacent tools, not a single authoritative source. MVP scope is solid; v2 feature list is opinionated but reasonable. |
| Architecture | HIGH | Pipeline shape is fully specified and well-established. Service boundary patterns are standard Node.js. Build order dependencies are unambiguous. |
| Pitfalls | HIGH (Puppeteer/Linux), HIGH (AI JSON), MEDIUM (screenshotOne edge cases) | Puppeteer pitfalls verified against official docs and production reports. AI JSON fence-stripping is a widely-documented issue. screenshotOne blank image behavior inferred from API docs, not direct testing. |

**Overall confidence:** HIGH

### Gaps to Address

- **Claude model string:** The model identifier `claude-sonnet-4-5` was current at research time (2026-04-04). Verify the exact API name at `platform.claude.ai/docs/en/about-claude/models/overview` immediately before coding Phase 3. Using a stale model string causes silent API errors.
- **screenshotOne SDK version and API key format:** The `screenshotone-api-sdk` npm package version was not confirmed via live fetch (last updated June 2025 per npm, but exact current version uncertain). Confirm with `npm show screenshotone-api-sdk version` before installation. API key format (access_key query param vs. Authorization header) should be verified against current docs.
- **VPS RAM and disk headroom:** ARCHITECTURE.md notes that a single concurrent Puppeteer page uses ~100-150MB. The Hostinger VPS RAM size was not confirmed in research. If the VPS has only 1GB RAM, PM2 cluster mode and the `--single-process` Puppeteer flag should be evaluated before launch.
- **Gemini structured output schema syntax:** The `responseSchema` field format in `@google/genai` v1.x is the area most likely to require reading SDK source or changelog to get exactly right. Prioritize this during Phase 3 planning.

---

## Sources

### Primary (HIGH confidence)
- [pptr.dev/troubleshooting](https://pptr.dev/troubleshooting) — Puppeteer sandbox flags, system deps, --disable-dev-shm-usage
- [pptr.dev/guides/headless-modes](https://pptr.dev/guides/headless-modes) — headless: true default behavior since v22
- [ai.google.dev/gemini-api/docs/models/gemini-2.5-flash](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash) — Gemini model ID and structured output support
- [github.com/googleapis/js-genai](https://github.com/googleapis/js-genai) — @google/genai as the current unified SDK (replaces @google/generative-ai)
- [ai.google.dev/gemini-api/docs/structured-output](https://ai.google.dev/gemini-api/docs/structured-output) — responseMimeType, responseSchema
- [github.com/anthropics/anthropic-sdk-typescript](https://github.com/anthropics/anthropic-sdk-typescript) — SDK version 0.82.0, Node >= 18
- [sharp.pixelplumbing.com](https://sharp.pixelplumbing.com/) — Sharp API, libvips, Node-API v9 compatibility
- [expressjs.com](https://expressjs.com/) — Express 5.1 as npm latest; async middleware
- [pm2.keymetrics.io](https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/) — PM2 ecosystem config, max_memory_restart
- [nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases) — Node 20 EOL April 2026, Node 22 LTS until April 2027
- [screenshotone.com/screenshot-api/nodejs/](https://screenshotone.com/screenshot-api/nodejs/) — official Node.js SDK docs
- [screenshotone.com/docs/errors/timeout/](https://screenshotone.com/docs/errors/timeout/) — 422 timeout error handling

### Secondary (MEDIUM confidence)
- [bannerbear.com/blog/how-to-take-screenshots-with-puppeteer/](https://www.bannerbear.com/blog/how-to-take-screenshots-with-puppeteer/) — Puppeteer screenshot pipeline patterns
- [thelinuxcode.com/expressjs-tutorial-2026-practical-scalable-patterns-for-real-projects/](https://thelinuxcode.com/expressjs-tutorial-2026-practical-scalable-patterns-for-real-projects/) — Express controller/service separation pattern
- [community.n8n.io Gemini PSA](https://community.n8n.io/t/psa-extracting-output-from-gemini-models/83374) — markdown fence stripping for Gemini responses
- [medium.com Puppeteer production post (2026)](https://medium.com/@TheTechDude/puppeteer-memory-leaks-crashes-and-zombie-processes-6-months-of-screenshots-in-production-b2ae7e65df3f) — orphaned process patterns, try/finally requirement
- [dev.to OG Image Generation pipeline](https://dev.to/quangthien27/automated-og-image-generation-build-dynamic-social-cards-with-a-screenshot-api-2mog) — pipeline feature patterns
- [predis.ai URL-to-Social-Post](https://predis.ai/resources/turn-url-into-social-media-content-with-ai-tools/) — social card market expectations
- [AppScreenshotStudio 2026 design guide](https://medium.com/@AppScreenshotStudio/app-store-screenshots-that-convert-the-2026-design-guide-4438994689d6) — annotation placement and copy best practices

---
*Research completed: 2026-04-04*
*Ready for roadmap: yes*
