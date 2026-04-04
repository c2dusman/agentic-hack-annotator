# Phase 3: Card Template + Render - Research

**Researched:** 2026-04-04
**Domain:** Puppeteer HTML-to-PNG rendering, CSS card layout, Google Fonts in headless Chrome, Sharp PNG optimization
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Top-aligned crop — show the top portion of the page (hero/nav area), crop width to fit card slot, take as much height as the slot allows. Most recognizable part of any website.
- **D-02:** Rounded corners (12px border-radius) with pink border (2px solid rgba(255,45,107,0.4)) on screenshot slot.
- **D-03:** Google Fonts @import in the HTML template's `<style>` tag — DM Sans for body, Space Grotesk for step labels. Per brief §7.
- **D-04:** Wait for font load before screenshot — use `document.fonts.ready` or short delay (~500ms) to prevent fallback sans-serif flash.
- **D-05:** Flexbox with equal spacing — steps container uses CSS flex-direction: column with gap. 3 steps = more breathing room, 5 steps = tighter but readable. Handles 3-5 step range naturally.
- **D-06:** 2-line CSS clamp on step descriptions — prevents layout breakage from long Claude text while keeping most content visible.
- **D-07:** Optimize PNG via Sharp — compressionLevel 9, palette: false. Reduces file size 30-50% with no visible quality loss. Expected final size ~50-150KB.

### Claude's Discretion

- Exact CSS values for padding, margins, font sizes within the card layout
- Screenshot crop dimensions (height of the screenshot slot in the card)
- Focus badge exact positioning and sizing (per brief §7 spec guidelines)
- Sharp quality parameters beyond compressionLevel

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-05 | Puppeteer renders HTML template to PNG at 1080x1920 with Sharp optimization | Verified: `page.setContent` + `page.screenshot({ clip: { width:1080, height:1920 } })` works locally; Sharp `compressionLevel: 9` buffer pipeline confirmed |
| TMPL-01 | Dark-themed card (#0D0D0D) with pink accents (#FF2D6B) at 1080x1920 | CSS custom properties + fixed-size root `div` at 1080×1920px; brief §7 has exact color tokens |
| TMPL-02 | Card displays title, subtitle, screenshot crop, numbered steps, and footer | All 7 placeholder strings from brief §7 fully documented; step HTML block format specified |
| TMPL-03 | Google Fonts (DM Sans + Space Grotesk) render correctly in headless Puppeteer | Verified locally: `@import` + `document.fonts.ready` approach works; `waitUntil: 'domcontentloaded'` + `page.evaluate(() => document.fonts.ready)` is the correct sequence |
| FOCUS-05 | Focus badge appears on output card when hint is provided, hidden when not | `{{FOCUS_BADGE_STYLE}}` = `''` when focus provided, `'display:none'` when null — exact mechanism from brief §7 |

</phase_requirements>

---

## Summary

Phase 3 implements the last missing pipeline module: `renderCard()` in `src/render.js` and the full `templates/card.html`. The render function receives AI-generated annotation data (cardTitle, cardSubtitle, steps[]) and a screenshot base64 string, injects them into the HTML template via string replacement of 7 placeholders, runs the result through Puppeteer to produce a 1080×1920 PNG, then passes the buffer through Sharp for compression before writing to `/output/`.

All core mechanics are verified working on the local machine: Puppeteer's `page.setContent()` + `page.screenshot()` pipeline runs correctly; base64 images render inside HTML; `document.fonts.ready` resolves successfully for Google Fonts loaded via `@import`; Sharp's `compressionLevel: 9` buffer pipeline produces valid output. The biggest runtime risk is Google Fonts network availability on the VPS — a known Puppeteer/headless gotcha that requires `waitUntil: 'domcontentloaded'` followed by an explicit `document.fonts.ready` await rather than `waitUntil: 'networkidle0'` (which can time out on VPS networks).

The template itself is fully specified in brief §7 — dimensions, colors, fonts, layout wireframe, placeholder strings, step HTML block, and focus badge are all defined. Claude's discretion covers only the CSS numeric values (padding, font sizes, crop height) within those constraints.

**Primary recommendation:** Use `page.setContent(html, { waitUntil: 'domcontentloaded' })` then `page.evaluate(() => document.fonts.ready)` for font loading. Do NOT use `waitUntil: 'networkidle0'` — it hangs on VPS networks. Write the populated HTML directly into `setContent` (no temp file needed) since base64 images and @import both work via `setContent`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| puppeteer | 24.4.0 (installed: 24.40.0) | Render HTML template to 1080×1920 PNG | Already installed, `getLaunchOptions()` stub ready, Linux flags validated in Phase 1 |
| sharp | 0.34.5 (installed: 0.34.5) | Compress Puppeteer PNG output buffer | Already installed, buffer-in buffer-out API confirmed working |
| fs (built-in) | Node 20 built-in | Read card.html template, write output PNG | No dep needed — `fs.readFileSync` for template, `fs.writeFileSync` for output |
| path (built-in) | Node 20 built-in | Resolve template path, output directory | No dep needed |
| uuid | 13.x (installed) | Generate unique output filenames | Already installed, `generateId()` in utils.js ready |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | 17.x (installed) | Load OUTPUT_DIR env var | Already loaded by server.js at startup |

**Installation:** All dependencies already installed — no `npm install` needed for this phase.

---

## Architecture Patterns

### Recommended Project Structure

Phase 3 creates exactly two files:

```
templates/
└── card.html          # Full dark-themed card template (replace stub)
src/
└── render.js          # Replace stub with full implementation
```

Output files land in:

```
output/
└── {uuid}.png         # Generated card images (cleaned up after 1hr)
```

### Pattern 1: setContent + fonts.ready (VERIFIED LOCALLY)

**What:** Load populated HTML string directly into Puppeteer page; wait for DOM + fonts before screenshotting.

**When to use:** Always — this is the only approach that reliably handles `@import` Google Fonts without hanging on VPS networks.

**Do NOT use** `waitUntil: 'networkidle0'` — it requires all network requests to idle for 500ms, which can time out on a VPS with restricted egress. Google Fonts CDN requests may take 2-5s on a cold VPS.

```javascript
// Source: verified locally against puppeteer 24.40.0
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920 });
await page.setContent(populatedHtml, { waitUntil: 'domcontentloaded' });
// Wait for Google Fonts to finish loading
await page.evaluate(() => document.fonts.ready);
const pngBuffer = await page.screenshot({
  type: 'png',
  clip: { x: 0, y: 0, width: 1080, height: 1920 }
});
```

### Pattern 2: Sharp Buffer Compression (VERIFIED LOCALLY)

**What:** Take Puppeteer's raw PNG buffer, run through Sharp to reduce file size.

```javascript
// Source: verified locally against sharp 0.34.5
const sharp = require('sharp');
const optimized = await sharp(pngBuffer)
  .png({ compressionLevel: 9, palette: false })
  .toBuffer();
```

### Pattern 3: Template Placeholder Replacement (7 placeholders)

**What:** Use `String.prototype.replaceAll()` (or chained `.replace()`) to substitute all 7 placeholders from brief §7.

```javascript
// Source: brief §7 + §8.5
function buildStepsHtml(steps) {
  return steps.map(step => `
    <div class="step">
      <div class="step-number">${step.number}</div>
      <div class="step-content">
        <span class="step-label">${step.label}</span>
        <span class="step-description">${step.description}</span>
      </div>
    </div>
  `).join('');
}

function populateTemplate(template, annotationData, screenshotBase64, focus, pageUrl) {
  return template
    .replace('{{CARD_TITLE}}', annotationData.cardTitle)
    .replace('{{CARD_SUBTITLE}}', annotationData.cardSubtitle)
    .replace('{{SCREENSHOT_BASE64}}', screenshotBase64)
    .replace('{{STEPS_HTML}}', buildStepsHtml(annotationData.steps))
    .replace('{{PAGE_URL}}', pageUrl || '')
    .replace('{{FOCUS_LABEL}}', focus || '')
    .replace('{{FOCUS_BADGE_STYLE}}', focus ? '' : 'display:none');
}
```

**IMPORTANT:** `renderCard()` currently only receives `(annotationData, screenshotBase64, focus)` — it does NOT receive `pageUrl`. Either add `pageUrl` as a 4th parameter, or omit the footer URL from the rendered output (show a static "AnnotatorAI" footer instead). Decision: add `pageUrl` as 4th parameter to match brief §8.5.

### Pattern 4: renderCard() Full Flow

```javascript
// Source: brief §8.5 + Phase 1 getLaunchOptions() stub + verified patterns above
async function renderCard(annotationData, screenshotBase64, focus = null, pageUrl = '') {
  let browser = null;
  let page = null;
  try {
    const template = fs.readFileSync(path.join(__dirname, '../templates/card.html'), 'utf8');
    const html = populateTemplate(template, annotationData, screenshotBase64, focus, pageUrl);

    browser = await puppeteer.launch(getLaunchOptions());
    page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);

    const pngBuffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1080, height: 1920 }
    });

    const optimized = await sharp(pngBuffer)
      .png({ compressionLevel: 9, palette: false })
      .toBuffer();

    const { generateId, ensureOutputDir } = require('./utils');
    ensureOutputDir();
    const filename = `${generateId()}.png`;
    const filepath = path.join(process.env.OUTPUT_DIR || './output', filename);
    fs.writeFileSync(filepath, optimized);

    return { filename, filepath };
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}
```

### Pattern 5: Card HTML Template Structure

**What:** 1080×1920 fixed-size dark card with all 7 placeholder slots.

Key CSS principles:
- Root `div.card` is exactly `width: 1080px; height: 1920px; overflow: hidden` — prevents Puppeteer from rendering beyond the clip region.
- Use `box-sizing: border-box` on everything — prevents width calculation surprises.
- Screenshot slot: `object-fit: cover; object-position: top` achieves the D-01 top-aligned crop without needing JavaScript image manipulation.
- Steps container: `display: flex; flex-direction: column; gap: Xpx` — CSS handles 3-5 step variation naturally (D-05).
- Step descriptions: `-webkit-line-clamp: 2` with `display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden` for 2-line clamp (D-06). Puppeteer uses Chromium so `-webkit-` prefix is correct.
- Focus badge: `<div class="focus-badge" style="{{FOCUS_BADGE_STYLE}}">{{FOCUS_LABEL}}</div>` — inline style overrides CSS display.

```html
<!-- Source: brief §7 exact spec -->
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,700&family=Space+Grotesk:wght@600&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.card {
  width: 1080px;
  height: 1920px;
  background: #0D0D0D;
  overflow: hidden;
  font-family: 'DM Sans', sans-serif;
  color: #CCCCCC;
  display: flex;
  flex-direction: column;
  padding: 80px 72px;
}

.focus-badge {
  display: inline-block;
  background: #FF2D6B;
  color: #FFFFFF;
  font-size: 28px;
  font-weight: 700;
  padding: 10px 24px;
  border-radius: 100px;
  margin-bottom: 32px;
  align-self: flex-start;
}

.card-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 72px;
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1.1;
  margin-bottom: 16px;
}

.pink-divider {
  width: 80px;
  height: 4px;
  background: #FF2D6B;
  margin-bottom: 24px;
}

.card-subtitle {
  font-size: 36px;
  color: #CCCCCC;
  line-height: 1.4;
  margin-bottom: 48px;
}

.screenshot-slot {
  width: 100%;
  flex: 0 0 520px;  /* fixed height — Claude's discretion */
  border-radius: 12px;
  border: 2px solid rgba(255, 45, 107, 0.4);
  overflow: hidden;
  margin-bottom: 48px;
}

.screenshot-slot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;  /* D-01: top-aligned crop */
  display: block;
}

.steps-container {
  display: flex;
  flex-direction: column;
  gap: 28px;
  flex: 1;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.step-number {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #FF2D6B;
  color: #FFFFFF;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 26px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.step-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 32px;
  font-weight: 600;
  color: #FFFFFF;
}

.step-description {
  font-size: 28px;
  color: #CCCCCC;
  line-height: 1.4;
  /* D-06: 2-line clamp */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.footer {
  margin-top: auto;
  padding-top: 32px;
  font-size: 24px;
  color: rgba(255,255,255,0.3);
  border-top: 1px solid rgba(255,255,255,0.1);
}
</style>
</head>
<body>
<div class="card">
  <div class="focus-badge" style="{{FOCUS_BADGE_STYLE}}">{{FOCUS_LABEL}}</div>
  <div class="card-title">{{CARD_TITLE}}</div>
  <div class="pink-divider"></div>
  <div class="card-subtitle">{{CARD_SUBTITLE}}</div>
  <div class="screenshot-slot">
    <img src="data:image/png;base64,{{SCREENSHOT_BASE64}}" alt="Page screenshot">
  </div>
  <div class="steps-container">
    {{STEPS_HTML}}
  </div>
  <div class="footer">AnnotatorAI &middot; {{PAGE_URL}}</div>
</div>
</body>
</html>
```

### Anti-Patterns to Avoid

- **`waitUntil: 'networkidle0'` with Google Fonts:** VPS network may throttle/block fonts.googleapis.com. `networkidle0` waits for zero network connections for 500ms — Google Fonts CDN requests can keep the connection count non-zero, causing a 30s timeout. Use `waitUntil: 'domcontentloaded'` + `document.fonts.ready` instead.
- **`page.goto('file://...')` for template:** Writing a temp file and using `goto` works but introduces file path encoding issues on paths with spaces (the VPS path may not have spaces, but the pattern is fragile). Use `page.setContent()` directly — it accepts the full HTML string and base64 image data embeds work correctly.
- **Not closing `page` before `browser`:** If `page.screenshot()` throws, `browser.close()` alone is sufficient but closing `page` first is cleaner and avoids rare CDP disconnect warnings. Add `page.close()` in the finally block before `browser.close()`.
- **`overflow: visible` on `.card`:** With `height: 1920px` and dynamic step counts, content can push below the 1920px boundary. Always set `overflow: hidden` on `.card` so the screenshot clip at 1080×1920 is clean.
- **Replacing `{{SCREENSHOT_BASE64}}` with `replaceAll()`:** The base64 string appears once; `.replace()` is sufficient. `replaceAll()` is fine but unnecessary. If you use `.replace()` for all 7 placeholders, chain them — don't call `.replace()` on the original string each time.
- **Sharp `palette: true` on a photo card:** `palette: true` uses quantization (fewer colors) — appropriate for flat-color graphics but degrades screenshot images embedded in the card. Per D-07: `palette: false`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Screenshot-to-card crop | Manual image crop logic in JavaScript | CSS `object-fit: cover; object-position: top` | Browser handles resize + crop natively in the template; no Sharp resize step needed |
| Font availability check | setTimeout polling | `document.fonts.ready` Promise (Web Fonts API) | Browser resolves this promise when all declared fonts are loaded or fell back |
| PNG compression | Custom byte manipulation | `sharp().png({ compressionLevel: 9 })` | Sharp wraps libvips — handles zlib compression correctly |
| Unique output filenames | Timestamp strings | `generateId()` (uuid v4) from utils.js | Already implemented in Phase 1; uuid avoids collisions |
| Output directory creation | Manual `mkdir` | `ensureOutputDir()` from utils.js | Already implemented; handles race conditions |

**Key insight:** The card template is a full web page rendered by Chromium — use CSS for all layout, cropping, and clamping. JavaScript in render.js only handles string substitution and Puppeteer control.

---

## Common Pitfalls

### Pitfall 1: Google Fonts Timeout on VPS

**What goes wrong:** `page.setContent(html, { waitUntil: 'networkidle0' })` hangs for 30s then throws `TimeoutError`. The card is never rendered.

**Why it happens:** `networkidle0` tracks all pending network connections including the Google Fonts CSS request and each individual font file request. On a VPS, these requests may be slow, throttled, or blocked. Each font weight/style is a separate request — DM Sans + Space Grotesk can be 4-6 requests.

**How to avoid:** Use `waitUntil: 'domcontentloaded'` (fires after HTML parses, before resources load) then explicitly await `page.evaluate(() => document.fonts.ready)`. Verified working locally.

**Warning signs:** `TimeoutError: Navigation timeout of 30000ms exceeded` in Puppeteer logs.

### Pitfall 2: Card Content Overflowing 1920px Height

**What goes wrong:** With 5 steps and long descriptions, the total content height exceeds 1920px. The screenshot clip at `height: 1920` cuts through a step mid-render.

**Why it happens:** CSS flexbox distributes space based on content size. Without `overflow: hidden` and fixed heights, elements push the card taller than 1920px.

**How to avoid:**
- `.card { overflow: hidden; height: 1920px; }` — hard cap.
- Screenshot slot: use `flex: 0 0 Npx` (fixed, non-growing) — do not use `flex: 1` on the screenshot.
- Steps container: use `flex: 1` with `overflow: hidden` — it fills remaining space and clips if steps overflow.
- Step descriptions: `-webkit-line-clamp: 2` limits each description to 2 lines (D-06).
- Test with 5 steps (max from AI) and long descriptions before final tuning.

**Warning signs:** Footer not visible in rendered PNG; steps cut off; card appears shorter than 1920px.

### Pitfall 3: {{SCREENSHOT_BASE64}} Replacement in Large Strings

**What goes wrong:** The screenshot base64 string from screenshotOne (1200px wide, full-page PNG) can be 500KB-2MB of base64 text. JavaScript string `.replace()` on a 5MB HTML string is fine, but watch for template literal size.

**Why it happens:** Node.js has no practical string size limit here, but if the base64 string itself contains characters that look like placeholder patterns (extremely unlikely for base64) it could cause issues.

**How to avoid:** Replace `{{SCREENSHOT_BASE64}}` last in the chain (after all other replacements) — this keeps the string smaller during the other substitutions. For screenshotOne full-page screenshots the base64 may be very long. The `data:image/png;base64,...` src attribute accepts strings of any length in modern Chromium.

**Warning signs:** Template HTML > 10MB (check with `html.length` before passing to setContent).

### Pitfall 4: Orphaned Puppeteer Browser on Error

**What goes wrong:** If `page.setContent()` or `page.screenshot()` throws, `browser` is never closed. Each request leaks a Chromium process (300-500MB RAM). After 3-4 requests the VPS runs out of memory.

**Why it happens:** `await browser.close()` after a throw is never reached if not in a finally block.

**How to avoid:** The existing stub already has `finally { if (browser) await browser.close(); }`. Keep this pattern exactly. Also close `page` before `browser` in finally. Verified: the stub in `src/render.js` already has this.

**Warning signs:** `pm2 logs` shows increasing memory; `htop` shows multiple `chrome` processes.

### Pitfall 5: Font Size Mismatch Between Local and VPS

**What goes wrong:** Card looks correct locally but step text overflows or appears cut off on VPS. 

**Why it happens:** If Google Fonts fails to load on VPS (e.g. blocked CDN), Chromium falls back to system `sans-serif`. The fallback font has different metrics — different character widths mean text that fits in 2 lines locally overflows to 3 lines on VPS. The `-webkit-line-clamp: 2` then hides the third line, but the step label above may also be taller.

**How to avoid:** Ensure `document.fonts.ready` resolves before screenshotting (confirms fonts loaded). If fonts consistently fail on VPS, add font-size fallback CSS or self-host fonts as base64 data URIs inside the template (adds ~200KB to template but eliminates network dependency). For the hackathon deadline, the `document.fonts.ready` wait is sufficient — VPS has internet access and fonts.googleapis.com is generally accessible.

**Warning signs:** Card renders with visually different text (too wide, no ligatures) compared to local test.

---

## Code Examples

Verified patterns from local testing:

### Complete renderCard Skeleton (Verified)

```javascript
// Source: verified locally — puppeteer 24.40.0 + sharp 0.34.5
'use strict';
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { generateId, ensureOutputDir } = require('./utils');

function getLaunchOptions() {
  return {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  };
}

function buildStepsHtml(steps) {
  return steps.map(step => `
    <div class="step">
      <div class="step-number">${step.number}</div>
      <div class="step-content">
        <span class="step-label">${escapeHtml(step.label)}</span>
        <span class="step-description">${escapeHtml(step.description)}</span>
      </div>
    </div>
  `).join('\n');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function renderCard(annotationData, screenshotBase64, focus = null, pageUrl = '') {
  let browser = null;
  let page = null;
  try {
    const templatePath = path.join(__dirname, '../templates/card.html');
    const template = fs.readFileSync(templatePath, 'utf8');

    const stepsHtml = buildStepsHtml(annotationData.steps);
    const html = template
      .replace('{{CARD_TITLE}}', escapeHtml(annotationData.cardTitle))
      .replace('{{CARD_SUBTITLE}}', escapeHtml(annotationData.cardSubtitle))
      .replace('{{STEPS_HTML}}', stepsHtml)
      .replace('{{PAGE_URL}}', escapeHtml(pageUrl))
      .replace('{{FOCUS_LABEL}}', escapeHtml(focus || ''))
      .replace('{{FOCUS_BADGE_STYLE}}', focus ? '' : 'display:none')
      .replace('{{SCREENSHOT_BASE64}}', screenshotBase64); // last — largest substitution

    browser = await puppeteer.launch(getLaunchOptions());
    page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);

    const rawBuffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1080, height: 1920 }
    });

    const optimized = await sharp(rawBuffer)
      .png({ compressionLevel: 9, palette: false })
      .toBuffer();

    ensureOutputDir();
    const filename = `${generateId()}.png`;
    const filepath = path.join(process.env.OUTPUT_DIR || './output', filename);
    fs.writeFileSync(filepath, optimized);

    return { filename, filepath };
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { renderCard, getLaunchOptions };
```

### HTML Escape (Required)

Step labels and descriptions come from Claude API. They should not contain `<`, `>`, or `&` given the prompts, but escaping is defensive programming for a hackathon where any input URL can produce unexpected AI output.

### Screenshot Slot CSS (Verified pattern)

```css
/* object-fit: cover + object-position: top achieves D-01 top-aligned crop */
.screenshot-slot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  display: block;
}
```

This replaces any need for Sharp resize/crop of the input screenshot. The base64 string from Phase 2 (1200px wide, full-page PNG) is fed directly as `data:image/png;base64,...` — the browser downscales it to fit the slot.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| puppeteer | PIPE-05 card rendering | Yes | 24.40.0 (installed) | — |
| sharp | PIPE-05 PNG optimization | Yes | 0.34.5 (installed) | — |
| Node.js | Runtime | Yes | 20.x | — |
| Google Fonts CDN | TMPL-03 font loading | Yes (locally verified) | — | System sans-serif fallback (visible quality difference) |
| Output directory | File write | Created on startup by `ensureOutputDir()` | — | — |

**Missing dependencies with no fallback:** None.

**Risk to flag for execution:** Google Fonts availability on the VPS is not locally verified — internet access from the VPS is expected (API keys were configured on VPS in Phase 2), but if fonts.googleapis.com is blocked, add self-hosted base64 font embedding. This is LOW risk given the VPS already makes outbound API calls.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `waitUntil: 'networkidle0'` for font loading | `waitUntil: 'domcontentloaded'` + `document.fonts.ready` | Puppeteer v20+ | Avoids 30s timeouts on VPS; fonts.ready is the correct Web Fonts API |
| `headless: 'new'` string | `headless: true` | Puppeteer v22 | `'new'` is deprecated; `true` is the default and uses new headless |
| Write temp file + `page.goto('file://...')` | `page.setContent(html)` | Puppeteer v1+ | Eliminates file path encoding edge cases; base64 images work in setContent |
| Sharp `.resize()` input screenshot to fit card | CSS `object-fit: cover` in template | CSS3 | Zero extra processing; browser renders correctly at display size |

---

## Open Questions

1. **pageUrl 4th parameter in renderCard()**
   - What we know: Brief §8.5 says render.js must replace `{{PAGE_URL}}`. Current stub signature is `renderCard(annotationData, screenshotBase64, focus)` — no `pageUrl`.
   - What's unclear: Phase 4 will wire this — does it pass the URL? Yes, based on brief §5 pipeline diagram the URL is available in the server route.
   - Recommendation: Add `pageUrl = ''` as 4th parameter to `renderCard()`. This is a non-breaking change (default empty string). Phase 4 will pass the actual URL. Document clearly in render.js exports.

2. **Screenshot slot height**
   - What we know: Claude's discretion per CONTEXT.md. Card is 1920px tall. Header area (title + subtitle) needs ~350-400px. Steps area (3-5 steps × ~120px each) needs ~400-600px. Footer ~60px. Padding top+bottom ~160px.
   - Remaining for screenshot slot: ~500-550px.
   - Recommendation: Set `flex: 0 0 520px` on `.screenshot-slot`. Test with 5 steps; adjust to 480px if 5 steps overflow.

---

## Validation Architecture

Nyquist validation is disabled (`workflow.nyquist_validation: false` in `.planning/config.json`). Skipping this section.

---

## Sources

### Primary (HIGH confidence)

- `annotator-project-brief.md §7` — Complete HTML template spec (dimensions, colors, fonts, placeholders, step block, focus badge)
- `annotator-project-brief.md §8.5` — renderCard() module signature and full behavior spec
- Local verification — `page.setContent()` + `page.screenshot()` pipeline on puppeteer 24.40.0 (this session)
- Local verification — `document.fonts.ready` resolves correctly for Google Fonts @import (this session)
- Local verification — `sharp().png({ compressionLevel: 9, palette: false }).toBuffer()` on sharp 0.34.5 (this session)
- Local verification — base64 `data:image/png;base64,...` renders in `page.setContent()` (this session)

### Secondary (MEDIUM confidence)

- CLAUDE.md — Puppeteer launch flags, Sharp/Puppeteer version compatibility table, `headless: true` default behavior
- `.planning/phases/03-card-template-render/03-CONTEXT.md` — All locked decisions D-01 through D-07

### Tertiary (LOW confidence)

- None — all critical claims verified locally or against official spec docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages installed and verified working locally
- Architecture: HIGH — patterns verified with live Puppeteer/Sharp calls this session
- Pitfalls: HIGH — font timeout pitfall is a documented headless Chrome issue; others verified via local testing
- Template spec: HIGH — exact values from authoritative brief §7

**Research date:** 2026-04-04
**Valid until:** 2026-04-05 (deadline is tomorrow — research is immediately actionable)
