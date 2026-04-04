---
phase: 03-card-template-render
plan: 01
subsystem: render-pipeline
tags: [puppeteer, sharp, card-template, html-to-png, dark-theme]
dependency_graph:
  requires: [src/utils.js, templates/card.html, puppeteer, sharp]
  provides: [renderCard(), getLaunchOptions(), templates/card.html]
  affects: [src/app.js (Phase 4 wiring)]
tech_stack:
  added: []
  patterns:
    - "Puppeteer setContent + document.fonts.ready for font-safe rendering"
    - "Sharp compressionLevel 9 palette:false for lossless PNG compression"
    - "7-placeholder string replacement with SCREENSHOT_BASE64 last (largest)"
    - "escapeHtml defensive encoding for AI-generated content"
    - "finally block cleanup pattern for browser + page lifecycle"
key_files:
  created:
    - templates/card.html
    - tests/test-render.js
  modified:
    - src/render.js
decisions:
  - "waitUntil: domcontentloaded + document.fonts.ready avoids networkidle0 timeout on offline Google Fonts (D-04)"
  - "SCREENSHOT_BASE64 replaced last in populateTemplate — largest substitution goes last for predictable replace()"
  - "rgba(255,45,107,0.4) for screenshot border per D-02 — correct use of opacity variant for screenshot border"
metrics:
  duration: "144 seconds (~2.4 minutes)"
  completed: "2026-04-04"
  tasks: 3
  files: 3
---

# Phase 03 Plan 01: Card Template and Render Pipeline Summary

**One-liner:** 1080x1920 dark-themed card HTML template rendered via Puppeteer with 7-placeholder injection, Sharp PNG compression at level 9, and integration test confirming correct dimensions and file size.

## What Was Built

### templates/card.html
Full dark-themed card template for Puppeteer rendering at fixed 1080x1920:
- Background `#0D0D0D` with pink accent `#FF2D6B` on badge, divider, step circles, screenshot border
- DM Sans (body/title) and Space Grotesk (step labels/numbers) via Google Fonts @import
- All 7 placeholders: `{{CARD_TITLE}}`, `{{CARD_SUBTITLE}}`, `{{SCREENSHOT_BASE64}}`, `{{STEPS_HTML}}`, `{{PAGE_URL}}`, `{{FOCUS_LABEL}}`, `{{FOCUS_BADGE_STYLE}}`
- Focus badge toggled via `style="{{FOCUS_BADGE_STYLE}}"` (empty string or `display:none`)
- Screenshot slot with `flex: 0 0 520px`, `object-fit: cover`, `object-position: top`, `border-radius: 12px`
- Step descriptions clamped at 2 lines via `-webkit-line-clamp: 2`

### src/render.js
Complete renderCard() implementation:
- `escapeHtml()` — defensive HTML encoding for AI-generated content (replaces & < > ")
- `buildStepsHtml()` — generates step HTML blocks with escaped label/description
- `populateTemplate()` — 7-placeholder chain replace, SCREENSHOT_BASE64 last
- `renderCard(annotationData, screenshotBase64, focus, pageUrl)` — full Puppeteer pipeline
- `getLaunchOptions()` — unchanged from stub (all 4 VPS sandbox flags)
- browser/page always closed in finally block

### tests/test-render.js
Integration test using synthetic screenshot (no external API):
- Creates 1200x800 blue PNG via Sharp as mock screenshot
- Tests renderCard with focus hint → verifies 1080x1920 PNG
- Tests renderCard without focus hint → verifies 1080x1920 PNG
- Verifies file size 1KB–500KB (Sharp compression working; actual: 93.8KB)
- Cleans up output files after test

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create full card.html template | 2f2837e | templates/card.html |
| 2 | Implement renderCard() in render.js | f35f338 | src/render.js |
| 3 | Integration test with mock data | 046c12a | tests/test-render.js |

## Deviations from Plan

None — plan executed exactly as written.

The grep -c verification command in Task 1 uses alternation (`\|`) which counts matching lines not distinct patterns. The template contains all 7 placeholders on separate lines so the result is 7, which is correct — this is a nuance of the grep approach, not a template issue.

## Known Stubs

None — renderCard() is fully wired with real Puppeteer rendering, Sharp compression, and file output. No placeholder data flows to the output.

## Self-Check: PASSED

All created files verified on disk. All task commits verified in git log.
