# Phase 2: Screenshot + AI Services - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Three isolated data-pipeline services — screenshot capture (screenshotOne API), Gemini 2.5 Flash vision analysis, and Claude Sonnet copywriting — each built and tested independently with structured output, focus-hint awareness, retry logic, and meaningful error messages. No frontend wiring (Phase 4), no template rendering (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### AI Prompt Strategy
- **D-01:** Follow brief prompts exactly as written in annotator-project-brief.md §6 — no adaptation unless output quality is poor
- **D-02:** Gemini uses strict schema enforcement via `responseMimeType: 'application/json'` and `responseSchema` — API enforces exact JSON shape, no manual parsing
- **D-03:** Claude returns structured JSON `{cardTitle, cardSubtitle, steps[]}` — not plain text with parsing
- **D-04:** Gemini elements[] array fixed at 3-5 elements — predictable for template layout, avoids overflow

### Screenshot Config
- **D-05:** screenshotOne viewport width: 1200px (per brief spec)
- **D-06:** Screenshot format: PNG full quality — lossless input for best Gemini vision analysis

### Error & Retry Logic
- **D-07:** AI calls (Gemini + Claude) retry up to 2 times on unparseable output — strip markdown fences before retrying (per REL-01)
- **D-08:** screenshotOne retries once on timeout/5xx — fail after that
- **D-09:** Error messages are stage-specific: "Screenshot capture failed", "Analysis failed: could not interpret screenshot", "Copy generation failed" — per REL-02
- **D-10:** Total pipeline timeout: 60 seconds hard cap — typical run 10-30s, 60s catches edge cases

### Isolated Testing
- **D-11:** Standalone test scripts per service: `test-screenshot.js`, `test-analyze.js`, `test-annotate.js` — run via `node test-xxx.js`
- **D-12:** Default test URL: https://example.com — simple, always available, fast
- **D-13:** Test scripts save output files to `/output` directory — screenshot PNG and JSON responses for visual inspection, auto-cleaned by existing cleanup logic

### Claude's Discretion
- Full-page vs viewport-only screenshot capture — pick what gives Gemini the best analysis input
- screenshotOne wait strategy for JS-heavy pages (delay + network idle vs timeout) — balance reliability and speed

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `annotator-project-brief.md` — Complete project brief with API specs (§6), prompt templates (§6), module signatures (§8), pipeline architecture (§5)

### Project Planning
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Phase 2 requirements: PIPE-02, PIPE-03, PIPE-04, FOCUS-01 through FOCUS-04, REL-01, REL-02
- `CLAUDE.md` — Tech stack research with version compatibility, gotchas, "what not to use" guidance

### Phase 1 Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Package version decisions (D-01 through D-04), scaffolding approach, VPS specs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils.js` — `isValidUrl()` for URL validation, `sanitizeFocus()` for focus hint (100 char limit), `generateId()` for output filenames, `ensureOutputDir()` for output directory
- `src/screenshot.js` — Stub with `captureScreenshot(url)` signature ready to implement
- `src/analyze.js` — Stub with `analyzeScreenshot(base64Image, focus = null)` signature, comment notes @google/genai
- `src/annotate.js` — Stub with `generateAnnotations(analysisData, focus = null)` signature

### Established Patterns
- CommonJS modules (no ESM) — per Phase 1 decision
- Express 5.1 server with JSON middleware and error handler in `server.js`
- Environment variables via dotenv — all 3 API keys defined in `.env.example`

### Integration Points
- Phase 3 will consume `analyzeScreenshot()` and `generateAnnotations()` output to fill the card template
- Phase 4 will wire all three services into the Express `/api/generate` route
- `package.json` already declares all needed dependencies: `screenshotone-api-sdk`, `@google/genai`, `@anthropic-ai/sdk`

</code_context>

<specifics>
## Specific Ideas

- VPS has 4 CPU / 16GB RAM — no resource concerns for API calls
- All three API keys (screenshotOne, Gemini, Anthropic) already configured on VPS
- Brief §6 has exact prompt templates — use verbatim as starting point
- Gemini structured output eliminates response parsing fragility — critical reliability win

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-screenshot-ai-services*
*Context gathered: 2026-04-04*
