# AnnotatorAI

## What This Is

AnnotatorAI is a web application that takes a URL and an optional focus hint, then automatically generates a professionally annotated vertical image (9:16 ratio) ready for social media carousels and blog articles. The pipeline captures a screenshot, uses Gemini 2.5 Flash for vision analysis, Claude Sonnet for annotation copywriting, and Puppeteer to render the final dark-themed card image.

## Core Value

One URL in, one beautiful annotated image out — no manual editing, no design tools, fully automated.

## Requirements

### Validated

- [x] HTML template rendered via Puppeteer at 1080x1920 with dark theme and pink accents — Validated in Phase 3: card-template-render

### Active

- [ ] User can submit a URL and receive a professionally annotated 9:16 image
- [ ] User can optionally provide a focus hint to direct what the annotation explains
- [ ] When no focus hint is provided, AI infers the best annotation topic automatically
- [ ] Screenshot captured via screenshotOne API (full page, 1200px viewport)
- [ ] Gemini 2.5 Flash analyzes screenshot with focus-aware prompts, returns structured JSON
- [ ] Claude Sonnet writes tutorial-style annotation copy aligned to focus (or inferred focus)
- [x] HTML template rendered via Puppeteer at 1080x1920 with dark theme and pink accents (→ Validated)
- [ ] Web UI with URL input, optional focus hint input, loading states, and image download
- [ ] App deployed and running on Hostinger VPS via PM2
- [ ] Error handling with retry logic on AI calls and meaningful user-facing error messages
- [ ] Output images auto-cleaned after 1 hour

### Out of Scope

- Batch/bulk URL processing — single URL per request for v1
- User accounts or authentication — anonymous usage only
- Image editing or customization UI — output is fully automated
- Multiple template styles — single dark-themed template only
- Database storage — stateless, files cleaned up automatically

## Context

- **Hackathon project** for Hostinger Hackathon (Agentic Academy / Scrapes.ai community)
- **Hard deadline:** April 5, 2026 at 23:59:59 UTC (tomorrow)
- **Judging criteria:** Output quality, repeatability on any URL, documentation, workflow efficiency, implementation cost
- **Spec is pre-defined** — detailed project brief exists with exact folder structure, API specs, prompts, HTML template layout, and module signatures
- **API keys need setup** — screenshotOne, Gemini, and Anthropic keys not yet configured
- **VPS ready** — Hostinger VPS provisioned with SSH access
- **Prior work** — spec was developed with Claude Chat; this is the implementation phase

## Constraints

- **Deadline**: April 5, 2026 23:59:59 UTC — optimize for deployed and working over polish
- **Hosting**: Must be on Hostinger VPS (Ubuntu 22.04) — required for judging
- **Tech stack**: Node.js 20 + Express + vanilla HTML/CSS/JS — per spec, no frameworks
- **APIs**: screenshotOne for screenshots, Gemini 2.5 Flash for vision, Claude Sonnet 4 for copy
- **Cost**: ~$0.03-0.05 per generation — keep API usage lean
- **Puppeteer**: Must include Linux VPS flags (--no-sandbox, --disable-setuid-sandbox, etc.)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dual AI pipeline (Gemini + Claude) | Gemini excels at spatial vision analysis, Claude excels at copywriting | -- Pending |
| screenshotOne API over local Puppeteer for input | Reliable, handles complex pages, no double-Puppeteer overhead | -- Pending |
| Vanilla HTML/CSS/JS frontend | Minimal complexity, no build step, fast to deploy | -- Pending |
| Dark theme with pink accents | Professional look for social media, matches modern SaaS aesthetic | -- Pending |
| Focus hint as optional parameter | Makes tool useful for both directed tutorials and fully automated generation | -- Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-04 after Phase 3 completion*
