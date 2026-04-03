# Requirements: AnnotatorAI

**Defined:** 2026-04-04
**Core Value:** One URL in, one beautiful annotated image out — no manual editing, fully automated.

## v1 Requirements

### Pipeline

- [ ] **PIPE-01**: User can submit a URL and receive a 1080x1920 annotated PNG image
- [ ] **PIPE-02**: Screenshot captured via screenshotOne API (full page, 1200px viewport, PNG)
- [ ] **PIPE-03**: Gemini 2.5 Flash analyzes screenshot and returns structured JSON (pageTitle, pageTopic, detectedFocus, elements[])
- [ ] **PIPE-04**: Claude Sonnet writes tutorial-style annotation copy (cardTitle, cardSubtitle, steps[])
- [ ] **PIPE-05**: Puppeteer renders HTML template to PNG at 1080x1920 with Sharp optimization

### Focus Hint

- [ ] **FOCUS-01**: User can optionally provide a focus hint to direct annotations
- [ ] **FOCUS-02**: When focus provided, Gemini prioritizes elements relevant to the focus goal
- [ ] **FOCUS-03**: When focus provided, Claude aligns all copy to the focus goal
- [ ] **FOCUS-04**: When no focus provided, Gemini infers the best annotation topic automatically
- [ ] **FOCUS-05**: Focus badge appears on output card when hint is provided, hidden when not

### Template

- [ ] **TMPL-01**: Dark-themed card (#0D0D0D) with pink accents (#FF2D6B) at 1080x1920
- [ ] **TMPL-02**: Card displays title, subtitle, screenshot crop, numbered steps, and footer
- [ ] **TMPL-03**: Google Fonts (DM Sans + Space Grotesk) render correctly in headless Puppeteer

### Frontend

- [ ] **UI-01**: Web UI with URL input field and optional focus hint field
- [ ] **UI-02**: Loading state shows step-by-step progress (screenshot → analysis → copy → render)
- [ ] **UI-03**: Generated image displayed with Download button
- [ ] **UI-04**: Error states shown with meaningful messages

### Reliability

- [ ] **REL-01**: AI JSON parsing includes retry logic (max 2 attempts) with markdown fence sanitizer
- [ ] **REL-02**: All pipeline errors return meaningful user-facing messages
- [ ] **REL-03**: Puppeteer browser instances cleaned up via try/finally (no orphaned Chrome)
- [ ] **REL-04**: Output files auto-cleaned after 1 hour

### Deployment

- [ ] **DEPLOY-01**: App runs on Hostinger VPS (Ubuntu 22.04) via PM2
- [ ] **DEPLOY-02**: Puppeteer launches with all 4 Linux sandbox flags
- [ ] **DEPLOY-03**: Health check endpoint at GET /api/health

## v2 Requirements

### Enhanced Output

- **OUT-01**: Shareable link to output image (CDN or direct URL)
- **OUT-02**: Preview of captured screenshot before annotation begins
- **OUT-03**: Generation history via local storage (no backend needed)

### Templates

- **TMPL-04**: Light theme card template option
- **TMPL-05**: Minimal / clean template variant

### Scale

- **SCALE-01**: Batch processing of multiple URLs
- **SCALE-02**: Focus hint suggestions powered by AI pre-analysis

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / authentication | Stateless tool — no accounts needed for hackathon demo |
| Image editor / annotation customization UI | Destroys one-click value prop; adds massive complexity |
| Multiple card templates | Nail one high-quality template before adding variety |
| Social media direct publish | OAuth integrations are a separate product surface |
| Custom branding / white-label | Parameterized templates are multi-day scope |
| PDF or multi-page carousel output | 3x pipeline complexity; one strong image beats five weak ones |
| Real-time streaming progress | WebSocket/SSE overkill for 10-30s pipeline; fixed-step labels sufficient |
| Batch / bulk URL processing | Queue architecture, rate limiting, cost multiplication — post-hackathon |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | Phase 4 | Pending |
| PIPE-02 | Phase 2 | Pending |
| PIPE-03 | Phase 2 | Pending |
| PIPE-04 | Phase 2 | Pending |
| PIPE-05 | Phase 3 | Pending |
| FOCUS-01 | Phase 2 | Pending |
| FOCUS-02 | Phase 2 | Pending |
| FOCUS-03 | Phase 2 | Pending |
| FOCUS-04 | Phase 2 | Pending |
| FOCUS-05 | Phase 3 | Pending |
| TMPL-01 | Phase 3 | Pending |
| TMPL-02 | Phase 3 | Pending |
| TMPL-03 | Phase 3 | Pending |
| UI-01 | Phase 4 | Pending |
| UI-02 | Phase 4 | Pending |
| UI-03 | Phase 4 | Pending |
| UI-04 | Phase 4 | Pending |
| REL-01 | Phase 2 | Pending |
| REL-02 | Phase 2 | Pending |
| REL-03 | Phase 1 | Pending |
| REL-04 | Phase 4 | Pending |
| DEPLOY-01 | Phase 1 | Pending |
| DEPLOY-02 | Phase 1 | Pending |
| DEPLOY-03 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 — traceability mapped after roadmap creation*
