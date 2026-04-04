# Phase 3: Card Template + Render - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

HTML card template (`templates/card.html`) designed at 1080x1920 with dark theme and pink accents, populated with AI annotation data + cropped screenshot, and rendered to PNG via Puppeteer. Sharp optimizes the final output. No frontend wiring (Phase 4), no AI service changes.

</domain>

<decisions>
## Implementation Decisions

### Screenshot Crop Strategy
- **D-01:** Top-aligned crop — show the top portion of the page (hero/nav area), crop width to fit card slot, take as much height as the slot allows. Most recognizable part of any website.
- **D-02:** Rounded corners (12px border-radius) with pink border (2px solid rgba(255,45,107,0.4)) per brief §7 spec.

### Font Loading
- **D-03:** Google Fonts @import in the HTML template's `<style>` tag — DM Sans for body, Space Grotesk for step labels. Per brief §7.
- **D-04:** Wait for font load before screenshot — use `document.fonts.ready` or short delay (~500ms) to prevent fallback sans-serif flash.

### Step Layout
- **D-05:** Flexbox with equal spacing — steps container uses CSS flex-direction: column with gap. 3 steps = more breathing room, 5 steps = tighter but readable. Handles 3-5 step range naturally.
- **D-06:** 2-line CSS clamp on step descriptions — prevents layout breakage from long Claude text while keeping most content visible.

### Sharp Post-Processing
- **D-07:** Optimize PNG via Sharp — compressionLevel 9, palette: false. Reduces file size 30-50% with no visible quality loss. Expected final size ~50-150KB.

### Claude's Discretion
- Exact CSS values for padding, margins, font sizes within the card layout
- Screenshot crop dimensions (height of the screenshot slot in the card)
- Focus badge exact positioning and sizing (per brief §7 spec guidelines)
- Sharp quality parameters beyond compressionLevel

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `annotator-project-brief.md` §7 — Complete HTML template spec: dimensions, colors, fonts, layout wireframe, placeholder strings, step HTML block, focus badge HTML
- `annotator-project-brief.md` §8 — Module signatures including `renderCard(annotationData, screenshotBase64, focus)`

### Project Planning
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Phase 3 requirements: PIPE-05, TMPL-01, TMPL-02, TMPL-03, FOCUS-05
- `CLAUDE.md` — Tech stack with Puppeteer/Sharp version compatibility and gotchas

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Puppeteer launch flags (D-05), Express scaffolding
- `.planning/phases/02-screenshot-ai-services/02-CONTEXT.md` — AI output structure (cardTitle, cardSubtitle, steps[]), Gemini elements 3-5 range (D-04)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/render.js` — Stub exists with `renderCard(annotationData, screenshotBase64, focus)` signature, `getLaunchOptions()` with all 4 sandbox flags, browser cleanup in finally block
- `src/utils.js` — `generateId()` for output filenames, `ensureOutputDir()` for output directory creation
- `src/analyze.js` — Returns `{ pageTitle, pageTopic, detectedFocus, elements[] }` — elements used for step count
- `src/annotate.js` — Returns `{ cardTitle, cardSubtitle, steps[] }` where each step has `{ stepTitle, stepDescription }`

### Established Patterns
- CommonJS modules (no ESM)
- Environment variables via dotenv
- All sandbox flags in `getLaunchOptions()` already defined

### Integration Points
- `renderCard()` receives output from `analyzeScreenshot()` and `generateAnnotations()` — these are the data sources for template placeholders
- `templates/card.html` needs to be created (directory doesn't exist yet)
- Phase 4 will call `renderCard()` from the Express `/api/generate` route
- Sharp processes the Puppeteer output buffer before saving to `output/` directory

</code_context>

<specifics>
## Specific Ideas

- Brief §7 has exact wireframe layout with all content slots positioned
- Template uses placeholder strings: `{{CARD_TITLE}}`, `{{CARD_SUBTITLE}}`, `{{SCREENSHOT_BASE64}}`, `{{STEPS_HTML}}`, `{{FOCUS_BADGE}}`
- Step HTML block is generated per step in render.js (not in template)
- Focus badge is conditionally shown — pink pill badge above card title when focus hint provided
- VPS has 4 CPU / 16GB RAM — no resource concerns for Puppeteer rendering

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-card-template-render*
*Context gathered: 2026-04-04*
