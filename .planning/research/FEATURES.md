# Feature Research

**Domain:** Automated screenshot annotation / URL-to-social-image pipeline
**Researched:** 2026-04-04
**Confidence:** MEDIUM — core pipeline features verified across multiple sources; social-card market patterns from WebSearch (not single official source)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| URL input field | The entire value prop starts here — no URL input = no product | LOW | Standard text input; validate URL format client-side |
| Single-click generate action | Users expect one button to trigger the full pipeline | LOW | Submit triggers backend pipeline; no multi-step wizard |
| Loading / progress indicator | AI pipeline takes 10–30s; no feedback = users assume broken | LOW | Spinner or progress steps (screenshot → analysis → copy → render) |
| Downloadable output image | If users can't save the result, the tool has no value | LOW | Simple anchor download of the rendered PNG |
| Error messages that explain what went wrong | Bad URL, unreachable site, AI timeout — users need actionable feedback | MEDIUM | Map pipeline stage errors to human-readable messages |
| Correct output dimensions (9:16) | Social media creators know platform specs; wrong ratio = unusable | LOW | 1080×1920px enforced at Puppeteer render stage |
| Visible annotation text on the card | Core product promise — if annotations are absent or unreadable, product fails | MEDIUM | Font size, contrast, and layout must be legible at small sizes |
| Screenshot faithfully represents the URL | If the screenshot looks wrong (blank, partial, wrong page), output is worthless | MEDIUM | screenshotOne full-page + viewport options; handle JS-heavy sites |
| Reasonable generation time (under 60s) | Users abandon async tools after ~60s of silence | MEDIUM | Pipeline must complete screenshot → AI → render in under 60s; retry budget is tight |

### Differentiators (Competitive Advantage)

Features that set AnnotatorAI apart. Not required to launch, but deliver outsized value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Optional focus hint for directed annotation | Lets user control WHAT the annotation explains — turns generic screenshots into targeted tutorials | LOW | Single optional text field; drives Gemini prompt and Claude copy prompt |
| Auto-inferred annotation when no focus hint given | Zero-friction path for users who don't know what to highlight — AI decides the most important element | MEDIUM | Gemini must reliably identify the most salient UI area without guidance; prompt engineering matters |
| Dual AI pipeline (vision + copywriting) | Gemini excels at spatial UI analysis; Claude excels at human-quality copy — using both produces better output than one model | HIGH | Two sequential API calls; adds latency but output quality is meaningfully higher |
| Dark-themed card with branded pink accents | Output looks intentionally designed rather than auto-generated; social-media-ready aesthetic out of the box | LOW | Pre-built Puppeteer HTML template; no user configuration needed |
| Tutorial-style copy framing | Annotations read as education ("Here's how X works") not just description ("This is X") — more shareable | MEDIUM | Claude prompt must enforce instructional voice; validate in output quality testing |
| Stateless / zero sign-up experience | No account creation friction; arrive, paste URL, get image, leave | LOW | Already planned; reinforces hackathon demo-ability |
| Auto-cleanup of output files (1-hour TTL) | Privacy-respecting default; reduces VPS disk pressure | LOW | Cron or setTimeout delete; already in PROJECT.md |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem valuable but would hurt the project — especially under a 24-hour deadline.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Batch / bulk URL processing | Power users want to process 10+ URLs at once | Multiplies API costs, adds queue complexity, risks rate limiting, and is a full architectural change — kills hackathon timeline | Single URL per request; users can re-submit manually |
| User accounts and history | "I want to see my past generations" | Auth system, session storage, database — none of this exists in the stack and none is needed to judge the core product | Stateless; users download images locally |
| Image editor / annotation customization UI | "Let me move the annotation box" or "change the font" | Destroys the one-click value prop; adds canvas/editor complexity that dwarfs the core pipeline | Fixed opinionated template; the AI chooses placement |
| Multiple card templates / themes | "Can I get a light theme?" | Template switching means maintaining multiple Puppeteer HTML files; judging is on output quality not variety | Single high-quality dark template; nail one before adding others |
| Real-time streaming progress | "Show me the annotation being written live" | Requires WebSocket or SSE infrastructure; overkill for a 10-30s pipeline | Simple polling or single loading state with step labels |
| Social media direct publish / share | "Post this to my Instagram" | OAuth integrations, platform API permissions, rate limits — a separate product surface | Download and let users post themselves |
| Custom branding / white-label | "Put my logo on the card" | Parameterized templates, logo upload, storage — multi-day scope | Fixed AnnotatorAI branding on output card |
| PDF or multi-page output | "Give me a 5-slide carousel" | Requires multi-shot pipeline, page composition, and PDF export — 3× the complexity | Single 9:16 card; one strong image beats five weak ones |

---

## Feature Dependencies

```
URL Input
    └──requires──> Screenshot Capture (screenshotOne API)
                       └──requires──> Gemini Vision Analysis
                                          └──requires──> Claude Copywriting
                                                             └──requires──> Puppeteer Card Render
                                                                                └──requires──> File Download

Focus Hint (optional) ──enhances──> Gemini Vision Analysis (focus-aware prompt)
Focus Hint (optional) ──enhances──> Claude Copywriting (aligned to focus)

Loading Indicator ──requires──> Pipeline to emit stage events (or fixed-step UX)

Error Handling ──wraps──> Each pipeline stage independently

Auto-cleanup (1hr TTL) ──requires──> Puppeteer Card Render (file must exist first)
```

### Dependency Notes

- **Focus hint enhances both AI stages:** The same focus string must thread through Gemini and Claude prompts; a missing or mismatched focus breaks the directed-annotation value prop.
- **Screenshot quality gates everything downstream:** If screenshotOne returns a blank or partial page, Gemini has nothing useful to analyze. Error detection at this stage prevents wasted AI calls.
- **Loading indicator requires stage awareness:** Either the backend emits stage-level progress (screenshot done, analysis done, render done) or the frontend shows a fixed-step animation. The latter is simpler and sufficient.
- **Download requires a known file path:** The Puppeteer render must write to a predictable location the Express route can serve; cleanup TTL must not fire before download completes.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what is needed to validate the concept and satisfy hackathon judging.

- [x] URL input + optional focus hint field
- [x] Single generate button with loading state showing pipeline stages
- [x] screenshotOne screenshot capture (full page, 1200px viewport)
- [x] Gemini 2.5 Flash vision analysis with focus-aware prompt, structured JSON output
- [x] Claude Sonnet 4 tutorial-style annotation copywriting
- [x] Puppeteer HTML card render at 1080×1920, dark theme, pink accents
- [x] Image download button (direct file download)
- [x] Meaningful error messages for each failure stage
- [x] Auto-cleanup of output files after 1 hour
- [x] Deployed on Hostinger VPS via PM2

### Add After Validation (v1.x)

Features to add once the core is proven to work reliably.

- [ ] Shareable link to output image (CDN or direct URL) — useful for social sharing without download
- [ ] Generation history via local storage (no backend needed) — gives power users access to recent outputs
- [ ] Preview of captured screenshot before annotation — lets users confirm the right page was captured

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Multiple card templates (light theme, minimal, branded) — add only after validating the dark template converts well
- [ ] Batch processing — requires queue architecture; only worth building if volume demands it
- [ ] Focus hint suggestions powered by AI pre-analysis — useful UX but adds a pre-flight API call
- [ ] Brand customization (logo, colors) — high implementation cost relative to core value

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| URL input + generate button | HIGH | LOW | P1 |
| Loading state with stage labels | HIGH | LOW | P1 |
| Screenshot capture (screenshotOne) | HIGH | LOW | P1 |
| Gemini vision analysis | HIGH | MEDIUM | P1 |
| Claude annotation copywriting | HIGH | MEDIUM | P1 |
| Puppeteer card render (1080×1920) | HIGH | MEDIUM | P1 |
| Image download | HIGH | LOW | P1 |
| Error handling per pipeline stage | HIGH | MEDIUM | P1 |
| Optional focus hint field | HIGH | LOW | P1 |
| Auto-inferred annotation (no focus hint) | HIGH | MEDIUM | P1 |
| Auto-cleanup (1hr TTL) | MEDIUM | LOW | P1 |
| Shareable output URL | MEDIUM | LOW | P2 |
| Screenshot preview before annotating | MEDIUM | MEDIUM | P2 |
| Local storage history | LOW | MEDIUM | P3 |
| Multiple templates | MEDIUM | HIGH | P3 |
| Batch processing | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for hackathon launch (April 5, 23:59 UTC)
- P2: Add if time remains after P1 is deployed and tested
- P3: Post-hackathon consideration only

---

## Competitor Feature Analysis

The direct competitor class is URL-to-social-card tools. No single product does exactly what AnnotatorAI does (screenshot + AI vision + AI copy + 9:16 card), but adjacent products inform what users expect.

| Feature | OG Image Generators (Vercel OG, HCTI) | Social Card Repurposers (Predis.ai) | AnnotatorAI Approach |
|---------|----------------------------------------|--------------------------------------|----------------------|
| Input | Title + description text params | URL or text prompt | URL (full page screenshot) |
| Visual content | Template-rendered HTML | AI-generated image or template | Actual screenshot embedded in card |
| Annotation / copy | Static template text | AI-generated caption/hashtags | AI vision analysis + tutorial-style copy |
| Output ratio | 1200×630 (landscape OG) | Platform-variable | 1080×1920 (9:16 portrait for Stories/Reels) |
| Customization | Template params | Style presets | None — fully automated, opinionated output |
| Use case | Link previews, blog sharing | Social media campaigns | Tutorial cards, product explainers, carousels |
| Account required | API key for devs | Yes | No |

**Key differentiation:** AnnotatorAI is the only tool in this space that starts with a live screenshot and uses computer vision to identify what to annotate rather than requiring the user to supply text. This is the moat — competitors require users to already know what they want to say.

---

## Sources

- [Automated OG Image Generation with Screenshot API — DEV Community](https://dev.to/quangthien27/automated-og-image-generation-build-dynamic-social-cards-with-a-screenshot-api-2mog) — pipeline feature patterns, caching, error handling norms
- [ScreenshotOne API Documentation](https://screenshotone.com/docs/options/) — screenshot API capabilities (format, full-page, stealth, webhooks)
- [Vercel OG Image Generation](https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images) — social card standard dimensions and template patterns
- [Predis.ai URL-to-Social-Post](https://predis.ai/resources/turn-url-into-social-media-content-with-ai-tools/) — URL-input social content generation, market expectations
- [HTML/CSS to Image — Social Cards](https://docs.htmlcsstoimage.com/use-cases/social-cards/) — social card feature baseline
- [How to Beat AI Feature Creep — Built In](https://builtin.com/articles/beat-ai-feature-creep) — anti-feature and scope discipline patterns
- [App Store Screenshots 2026 Design Guide — AppScreenshotStudio](https://medium.com/@AppScreenshotStudio/app-store-screenshots-that-convert-the-2026-design-guide-4438994689d6) — annotation placement and copy best practices
- [Pixelied Screenshot Annotation Tool](https://pixelied.com/features/annotate-screenshots) — annotation UX patterns and visual expectations

---

*Feature research for: automated screenshot annotation / URL-to-9:16-social-card pipeline*
*Researched: 2026-04-04*
