# Roadmap: AnnotatorAI

## Overview

Four phases follow the natural pipeline build order: scaffold the server and validate Puppeteer on the actual VPS first, then build the screenshot and AI services in isolation, then build and visually verify the card template on the VPS, then wire everything end-to-end with the frontend and deploy for judging. Every phase delivers something independently verifiable. Phase 4 is the finish line — a live URL, one input, one image out.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Express server scaffolded and Puppeteer confirmed working on VPS
- [ ] **Phase 2: Screenshot + AI Services** - All three data-pipeline services built and tested in isolation
- [ ] **Phase 3: Card Template + Render** - HTML template designed and Puppeteer render producing correct 1080x1920 PNGs on VPS
- [ ] **Phase 4: Pipeline Wiring + Frontend + Deploy** - Full end-to-end app live on Hostinger VPS

## Phase Details

### Phase 1: Foundation
**Goal**: A running Express server on the Hostinger VPS with Puppeteer confirmed working under Linux sandbox flags
**Depends on**: Nothing (first phase)
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, REL-03
**Success Criteria** (what must be TRUE):
  1. GET /api/health returns 200 with JSON from the live VPS URL
  2. Puppeteer launches and takes a test screenshot on the VPS without crashing (all 4 sandbox flags active)
  3. App restarts automatically after a crash via PM2 and health check stays green
  4. Static files in /public are served correctly from the VPS root URL
**Plans:** 1/2 plans executed
Plans:
- [x] 01-01-PLAN.md — Project skeleton scaffolding with all files, configs, stubs, and local health check verification
- [ ] 01-02-PLAN.md — VPS deployment, Puppeteer verification, PM2 setup, and human sign-off

### Phase 2: Screenshot + AI Services
**Goal**: All three pipeline services (screenshot capture, Gemini vision, Claude copywriting) built and returning correct structured output when called with test inputs
**Depends on**: Phase 1
**Requirements**: PIPE-02, PIPE-03, PIPE-04, FOCUS-01, FOCUS-02, FOCUS-03, FOCUS-04, REL-01, REL-02
**Success Criteria** (what must be TRUE):
  1. screenshotOne call with a real URL returns a valid PNG buffer (dimensions and pixel density validated)
  2. Gemini call with a screenshot buffer returns parseable JSON with pageTitle, pageTopic, detectedFocus, and elements array
  3. Claude call with vision JSON returns parseable JSON with cardTitle, cardSubtitle, and steps array
  4. When a focus hint is provided, both Gemini and Claude output reflect that focus goal
  5. When no focus hint is provided, Gemini infers a topic and Claude copy aligns to the inferred focus
  6. AI JSON parsing retries up to 2 times and strips markdown fences before failing with a clear error message
**Plans:** 4 plans (3 complete + 1 gap closure)
Plans:
- [x] 02-01-PLAN.md — Shared retry infrastructure, .env.example fix, screenshotOne capture service + test
- [x] 02-02-PLAN.md — Gemini 2.5 Flash vision analysis with structured output + test
- [x] 02-03-PLAN.md — Claude Sonnet copywriting service + full pipeline test
- [ ] 02-04-PLAN.md — Gap closure: add step-count-to-element-count constraint to Claude prompts

### Phase 3: Card Template + Render
**Goal**: The HTML card template renders a correct 1080x1920 dark-themed PNG via Puppeteer, with fonts embedded and all content slots filled
**Depends on**: Phase 2
**Requirements**: PIPE-05, TMPL-01, TMPL-02, TMPL-03, FOCUS-05
**Success Criteria** (what must be TRUE):
  1. Rendered PNG is exactly 1080x1920 pixels with dark background (#0D0D0D) and pink accents (#FF2D6B)
  2. Card displays title, subtitle, screenshot crop, numbered steps, and footer with correct layout (no overlap or clipping)
  3. DM Sans and Space Grotesk fonts render correctly on the VPS (no fallback sans-serif visible)
  4. Focus badge appears on the card when a focus hint was provided and is absent when not provided
  5. Puppeteer page is always closed in a finally block — no orphaned Chrome processes accumulate
**Plans**: TBD
**UI hint**: yes

### Phase 4: Pipeline Wiring + Frontend + Deploy
**Goal**: A live, publicly accessible app where a user submits a URL and downloads a finished annotated image
**Depends on**: Phase 3
**Requirements**: PIPE-01, UI-01, UI-02, UI-03, UI-04, REL-04
**Success Criteria** (what must be TRUE):
  1. User can visit the VPS URL in a browser, enter a URL, click Generate, and download a finished 1080x1920 PNG without any manual steps
  2. Loading state shows step-by-step stage labels (screenshot, analysis, copy, render) while the pipeline runs
  3. Generated image is displayed in the browser with a working Download button
  4. Submitting an invalid URL or a URL that fails to screenshot shows a meaningful error message (not a generic server error)
  5. Output PNG files are automatically deleted from the server after 1 hour
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/2 | In Progress|  |
| 2. Screenshot + AI Services | 3/4 | Gap closure | - |
| 3. Card Template + Render | 0/? | Not started | - |
| 4. Pipeline Wiring + Frontend + Deploy | 0/? | Not started | - |
