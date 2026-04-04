# Phase 4: Pipeline Wiring + Frontend + Deploy - Research

**Researched:** 2026-04-04
**Domain:** Express route integration, vanilla JS frontend UX, node-cron file cleanup, PM2 deployment
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Simulated timer steps on the frontend — show fixed labels at ~5s intervals (Capturing... Analyzing... Writing... Rendering...) per brief Section 9. No SSE or polling.
- **D-02:** Show "Taking longer than usual..." message after 30 seconds if response hasn't arrived yet — subtle reassurance without adding complexity.
- **D-03:** node-cron running every 10 minutes to call cleanupOldFiles() — deletes output PNGs older than 1 hour. Reliable even during long-running sessions. Also run cleanup once on startup.
- **D-04:** Git push to GitHub + git pull on VPS — standard, repeatable, traceable. SSH in, pull, npm install, pm2 restart.
- **D-05:** Use Puppeteer's bundled Chromium (no executablePath needed) — current render.js already works this way. Install system shared libs on VPS for the bundled Chrome to run.
- **D-06:** Run on port 3001 — VPS already has n8n/Supabase on other ports, avoid conflicts.
- **D-07:** Simple red-bordered error message box on frontend — show stage-specific error text from server. No retry button; user clicks Generate again.
- **D-08:** Server-side URL validation before pipeline starts — use existing isValidUrl() from utils.js, return 400 immediately for invalid URLs. Fast feedback, no wasted API calls.

### Claude's Discretion

- Exact CSS styling values for the web UI (spacing, transitions, hover states)
- Loading spinner animation style (CSS spinner, pulsing dots, etc.)
- PM2 ecosystem.config.js structure and settings
- Exact wording of simulated progress labels (following brief Section 9 as guide)
- Whether to add client-side URL validation in addition to server-side

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-01 | User can submit a URL and receive a 1080x1920 annotated PNG image | Server.js POST /api/generate wires captureScreenshot → analyzeScreenshot → generateAnnotations → renderCard sequentially; all four functions already exist and have the correct signatures |
| UI-01 | Web UI with URL input field and optional focus hint field | UI-SPEC fully defined; index.html stub + style.css stub + app.js stub all exist in public/; complete DOM structure documented in 04-UI-SPEC.md |
| UI-02 | Loading state shows step-by-step progress (screenshot → analysis → copy → render) | setInterval cycling through 4 emoji labels every 5000ms; 30s threshold appends long-running notice; no SSE needed (D-01, D-02) |
| UI-03 | Generated image displayed with Download button | Result section hidden initially; on success response show `<img>` full-width + `<a href download>` link; imageUrl path comes from server response |
| UI-04 | Error states shown with meaningful messages | Red-bordered div (D-07); server returns stage-specific error strings from each pipeline module; frontend displays them verbatim |
| REL-04 | Output files auto-cleaned after 1 hour | cleanupOldFiles() already implemented in utils.js; node-cron already in package.json dependencies; wire cron at startup in server.js (D-03) |
</phase_requirements>

---

## Summary

All four pipeline modules (`screenshot.js`, `analyze.js`, `annotate.js`, `render.js`) are complete and tested. The `utils.js` helpers — including `cleanupOldFiles()`, `isValidUrl()`, `sanitizeFocus()`, and `withTimeout()` — are fully implemented. The `server.js` has Express 5.1 scaffolding, static serving, health check, and error handler, but the POST `/api/generate` route is missing. The frontend stubs (`public/index.html`, `public/style.css`, `public/app.js`) exist but contain only placeholder comments. The `ecosystem.config.js` is already correctly configured with `watch: false` and `PORT: 3001`.

This phase is primarily wiring work: connect existing pieces into a single route, build the vanilla HTML/CSS/JS frontend against the fully specified UI-SPEC, add the cron-based file cleanup to `server.js`, and execute the git-pull deployment on the VPS. There is no novel architecture to design — every piece has a known contract from prior phases.

The critical risk is the hard deadline (April 5, 2026 23:59:59 UTC), which means the deployment sequence must be correct on the first attempt. The VPS is at `82.29.160.5:3001` and all three API keys are already configured there.

**Primary recommendation:** Wire `POST /api/generate` first (highest value, tests the entire pipeline end-to-end), then build the frontend, then deploy and smoke-test live on VPS.

---

## Standard Stack

### Core (already in package.json — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | ^5 | HTTP server, routing, static serving | Already running; POST route is the only addition |
| node-cron | ^4 | Schedule cleanup every 10 minutes | Already in dependencies per D-03; just needs wiring |
| dotenv | ^17 | Load .env on startup | Already used throughout |

### No New Dependencies Required

All libraries for Phase 4 are already in `package.json`. Node-cron was added to dependencies during prior phases. There is nothing to install.

**Version verification (confirmed from existing package.json):**
- `express@^5` — resolves to 5.1.x (current npm latest)
- `node-cron@^4` — resolves to 4.x (current; compatible with Node 20)
- All other pipeline dependencies already verified in prior phases

---

## Architecture Patterns

### Recommended Project Structure (no changes to file layout)

```
server.js               ← Add POST /api/generate + cron wiring (the only backend change)
public/
  index.html            ← Full HTML markup per UI-SPEC (replace stub)
  style.css             ← Full styles per UI-SPEC color/spacing/typography (replace stub)
  app.js                ← Form submit handler, fetch, loading cycle, result/error display (replace stub)
ecosystem.config.js     ← Already correct — no changes needed
```

### Pattern 1: POST /api/generate Route

**What:** Express route that calls all four pipeline functions sequentially, wrapped in try/catch with a 60-second timeout, returning `{ imageUrl }` on success or `{ error }` on failure.

**When to use:** This is the only API route to add.

**Shape:**
```javascript
// CommonJS, no imports needed beyond what server.js already has
const { captureScreenshot } = require('./src/screenshot');
const { analyzeScreenshot }  = require('./src/analyze');
const { generateAnnotations } = require('./src/annotate');
const { renderCard }          = require('./src/render');
const { isValidUrl, sanitizeFocus, withTimeout } = require('./src/utils');

app.post('/api/generate', async (req, res, next) => {
  const { url, focus: rawFocus } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Please enter a valid URL starting with http:// or https://' });
  }

  const focus = sanitizeFocus(rawFocus);

  try {
    const result = await withTimeout(
      (async () => {
        const { base64 } = await captureScreenshot(url);
        const analysisData = await analyzeScreenshot(base64, focus);
        const annotationData = await generateAnnotations(analysisData, focus);
        const { filename } = await renderCard(annotationData, base64, focus, url);
        return filename;
      })(),
      60000,
      'Generation'
    );

    const imageUrl = `/output/${result}`;
    res.json({ imageUrl });
  } catch (err) {
    // Stage-specific errors propagate from each module naturally
    res.status(500).json({ error: err.message });
  }
});
```

**Key notes:**
- `withTimeout` is already in `utils.js` — use it, don't re-implement
- `sanitizeFocus()` returns `null` for empty/missing focus — all pipeline modules handle `null` correctly
- Stage-specific error strings bubble from each module (e.g. `"Screenshot capture failed: ..."`)

### Pattern 2: node-cron Wiring in server.js

**What:** Schedule cleanup every 10 minutes and run once on startup.

```javascript
const cron = require('node-cron');
const { cleanupOldFiles, ensureOutputDir } = require('./src/utils');

// Run once on startup
ensureOutputDir();  // already in server.js
cleanupOldFiles();  // add this

// Schedule every 10 minutes
cron.schedule('*/10 * * * *', () => {
  cleanupOldFiles();
});
```

**Source:** node-cron README — cron expression `*/10 * * * *` = every 10 minutes. Confidence HIGH.

### Pattern 3: Frontend Fetch Flow

**What:** Vanilla JS form submit → POST fetch → simulated loading cycle → display result or error.

**Shape (app.js):**
```javascript
const form = document.getElementById('generate-form');
const urlInput = document.getElementById('url-input');
const focusInput = document.getElementById('focus-input');
const generateBtn = document.getElementById('generate-btn');
const loadingSection = document.getElementById('loading-section');
const resultSection = document.getElementById('result-section');
const errorSection = document.getElementById('error-section');
const statusText = document.getElementById('status-text');
const resultImage = document.getElementById('result-image');
const downloadBtn = document.getElementById('download-btn');
const errorText = document.getElementById('error-text');

const STAGES = [
  '📸 Capturing screenshot...',
  '🔍 Analyzing page...',
  '✍️ Writing annotations...',
  '🎨 Rendering image...'
];

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const url = urlInput.value.trim();
  const focus = focusInput.value.trim();

  // Client-side validation (D-08 requires server-side; client-side is bonus per discretion)
  if (!url) { showInlineError('URL is required'); return; }
  if (!isValidUrlClient(url)) { showInlineError('Please enter a valid URL starting with http:// or https://'); return; }

  startLoading();

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, focus })
    });
    const data = await response.json();

    if (!response.ok) {
      showError(data.error || 'Generation failed.');
    } else {
      showResult(data.imageUrl);
    }
  } catch (err) {
    showError('Network error. Please try again.');
  } finally {
    stopLoading();
  }
});
```

**Loading cycle (setInterval per D-01, D-02):**
```javascript
let stageIndex = 0;
let stageInterval = null;
let longRunningTimeout = null;

function startLoading() {
  generateBtn.disabled = true;
  loadingSection.hidden = false;
  resultSection.hidden = true;
  errorSection.hidden = true;
  stageIndex = 0;
  statusText.textContent = STAGES[0];

  stageInterval = setInterval(() => {
    stageIndex = (stageIndex + 1) % STAGES.length;
    statusText.textContent = STAGES[stageIndex];
  }, 5000);

  longRunningTimeout = setTimeout(() => {
    statusText.textContent += ' Taking longer than usual...';
  }, 30000);
}

function stopLoading() {
  clearInterval(stageInterval);
  clearTimeout(longRunningTimeout);
  loadingSection.hidden = true;
  generateBtn.disabled = false;
}
```

**Download link pattern (triggers browser save dialog):**
```javascript
function showResult(imageUrl) {
  resultImage.src = imageUrl;
  downloadBtn.href = imageUrl;
  downloadBtn.download = imageUrl.split('/').pop();
  resultSection.hidden = false;
}
```

### Pattern 4: CSS Loading Spinner

**What:** Pure CSS rotating arc — no library, no SVG, just a `::after` pseudo-element with `border-radius: 50%` and a partial border.

```css
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255,45,107,0.2);
  border-top-color: #FF2D6B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Anti-Patterns to Avoid

- **Don't set `req.setTimeout(60000)` on the Express 5 route** — use `withTimeout()` from utils.js instead. Express 5 handles async errors natively; no extra error wrapping needed.
- **Don't call `browser.close()` explicitly in server.js** — render.js already does this in its `try/finally` block.
- **Don't use `watch: true` in ecosystem.config.js** — already set correctly; every Puppeteer output write would trigger a restart loop. Confirm before deploying.
- **Don't use `headless: 'new'` string** — render.js already uses `headless: true` (boolean); leave it.
- **Don't use `executablePath`** — D-05 says use Puppeteer's bundled Chromium; render.js already omits it. The VPS needs system shared libs installed separately.
- **Don't forget `BASE_URL` in .env on VPS** — the imageUrl returned is a relative `/output/filename.png` path; the browser constructs the full URL. `BASE_URL` is in `.env.example` but is not referenced by the current code — leave it unused.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File cleanup scheduling | Custom setInterval in server.js | node-cron (already installed) | node-cron survives PM2 restarts; setInterval resets and leaves orphaned files on restart |
| URL validation | Custom regex | `isValidUrl()` from utils.js | Already implemented and tested; uses `new URL()` which handles edge cases |
| Focus sanitization | Inline trim/truncate | `sanitizeFocus()` from utils.js | Already handles null, empty string, whitespace-only, over-100-chars |
| Promise timeout | Manual `Promise.race` | `withTimeout()` from utils.js | Already implemented; accepts label for logging |
| Pipeline sequential calls | Promise chaining | `async/await` in the route handler | Clearest error surface; stage errors propagate naturally |

**Key insight:** All utility functions needed for Phase 4 are already implemented. The implementation risk is wiring, not invention.

---

## Common Pitfalls

### Pitfall 1: server.js PORT Mismatch

**What goes wrong:** server.js defaults to `PORT = process.env.PORT || 3000`. The ecosystem.config.js sets `PORT: 3001` in its env block. If the app is started with `node server.js` directly (not via PM2), it runs on 3001 via .env only if `.env` has `PORT=3001`.
**Why it happens:** Two sources of PORT: .env file and ecosystem.config.js env block.
**How to avoid:** Set `PORT=3001` in the VPS `.env` file AND in ecosystem.config.js (already done). Both agree on 3001.
**Warning signs:** Browser shows "Connection refused" on port 3001 but health check works on 3000.

### Pitfall 2: Static File Path for Output Images

**What goes wrong:** `renderCard()` writes files to `process.env.OUTPUT_DIR || './output'`. The server serves `/output` as static from `path.join(__dirname, 'output')`. If the server starts from a different working directory (e.g., `/var/www/annotatorai` vs `~/annotatorai`), the relative path `./output` may not resolve to the same directory that Express is serving.
**Why it happens:** `./output` is relative to `process.cwd()`, not `__dirname`.
**How to avoid:** Set `OUTPUT_DIR=./output` in `.env` (matches CWD when PM2 starts from project root). Alternatively, use `path.join(__dirname, '../output')` in render.js — but existing code uses process.env, so `.env` is the fix.
**Warning signs:** 404 on the returned imageUrl even though the file was written.

### Pitfall 3: node-cron Require Path

**What goes wrong:** Calling `require('node-cron')` when the package hasn't been installed or was installed as `node-cron` in an older major version with API changes.
**Why it happens:** `package.json` has `node-cron@^4` but if `npm install` was not run after it was added, the module isn't present.
**How to avoid:** Run `npm install` on the VPS after `git pull`. The package is already in `package.json` — this is a deploy-step reminder, not a code fix.
**Warning signs:** `Cannot find module 'node-cron'` on startup.

### Pitfall 4: Express 5 Async Error Handling

**What goes wrong:** In Express 4, unhandled async errors in route handlers would silently hang or cause uncaught rejections. In Express 5, async errors ARE automatically forwarded to the error handler — but only if the route handler is `async` and throws. If the handler uses `.catch()` and never throws, errors won't reach the error handler.
**Why it happens:** Mixed async/catch patterns.
**How to avoid:** Use the `async (req, res, next) => { try { ... } catch (err) { res.status(500).json({ error: err.message }); } }` pattern consistently. The error is handled inline on the route, not deferred to the global error handler — this is cleaner for the pipeline use case.
**Warning signs:** Error responses return 500 with HTML (default Express error page) instead of JSON.

### Pitfall 5: Download Button Requires Correct `download` Attribute

**What goes wrong:** `<a href="/output/abc.png" download>Download Image</a>` — the `download` attribute triggers a save dialog only for same-origin URLs. Since the image is served from the same Express server, this works. But if the image URL is ever made cross-origin (CDN, etc.), `download` is ignored by browsers due to CORS.
**Why it happens:** Browser security policy.
**How to avoid:** Keep images served from the same origin (same VPS, same port). This is already the case.
**Warning signs:** Click opens image in new tab instead of downloading.

### Pitfall 6: VPS Puppeteer System Library Dependencies

**What goes wrong:** Puppeteer's bundled Chromium launches but immediately crashes on the VPS with an error like `error while loading shared libraries: libnss3.so`.
**Why it happens:** Puppeteer bundles Chromium but not system-level shared libraries. Ubuntu 22.04 may not have all required libs pre-installed.
**How to avoid:** Run the system dependency install on VPS (one-time setup):
```bash
sudo apt-get install -y libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 \
  libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 \
  libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0 \
  libgbm1 ca-certificates fonts-liberation libappindicator3-1 \
  libu2f-udev libvulkan1 wget xdg-utils
```
Then run `npx puppeteer browsers install chrome` after `npm install`.
**Warning signs:** Puppeteer throws during `browser.launch()` with a shared library error; render step fails with a cryptic exit code.

---

## Code Examples

### Complete POST /api/generate Route
```javascript
// Source: brief Section 8.1 + existing module signatures
const { captureScreenshot } = require('./src/screenshot');
const { analyzeScreenshot }  = require('./src/analyze');
const { generateAnnotations } = require('./src/annotate');
const { renderCard }          = require('./src/render');
const cron = require('node-cron');
const { isValidUrl, sanitizeFocus, cleanupOldFiles, ensureOutputDir, withTimeout } = require('./src/utils');

// In server initialization block (add to existing server.js after ensureOutputDir()):
ensureOutputDir();
cleanupOldFiles();  // run once on startup per D-03
cron.schedule('*/10 * * * *', () => cleanupOldFiles());  // every 10 min per D-03

// Route:
app.post('/api/generate', async (req, res) => {
  const { url, focus: rawFocus } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Please enter a valid URL starting with http:// or https://' });
  }

  const focus = sanitizeFocus(rawFocus);

  try {
    const filename = await withTimeout(
      (async () => {
        const { base64 } = await captureScreenshot(url);
        const analysisData = await analyzeScreenshot(base64, focus);
        const annotationData = await generateAnnotations(analysisData, focus);
        const { filename } = await renderCard(annotationData, base64, focus, url);
        return filename;
      })(),
      60000,
      'Generation'
    );

    res.json({ imageUrl: `/output/${filename}` });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Generation error for ${url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});
```

### Client-Side URL Validator (app.js)
```javascript
// Simple client-side check — mirrors isValidUrl() logic from utils.js
function isValidUrlClient(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
```

### PM2 Deployment Commands (VPS)
```bash
# After SSH into VPS
cd /var/www/annotatorai       # or wherever the project lives
git pull origin main
npm install                   # picks up any new deps (node-cron etc.)
pm2 restart annotatorai       # ecosystem.config.js already has correct name
pm2 save                      # persist restart list
```

### PM2 ecosystem.config.js (already correct — no changes)
```javascript
// Source: confirmed by reading existing ecosystem.config.js
module.exports = {
  apps: [{
    name: 'annotatorai',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,         // CRITICAL: do not change — Puppeteer writes trigger restarts
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node-cron | REL-04 cleanup scheduling | Local: in package.json | ^4 | — |
| PM2 | DEPLOY-01 process management | VPS: presumed installed (prior phases) | ^6 | — |
| Puppeteer system libs | PIPE-01 renderCard on VPS | VPS: unknown — must verify | — | Install via apt-get (see Pitfall 6) |
| Git on VPS | D-04 deployment | VPS: presumed available | — | scp alternative |
| Port 3001 | D-06 | VPS: confirmed free (n8n/Supabase on other ports) | — | — |

**Missing dependencies with no fallback:**
- Puppeteer system shared libraries on VPS — must be installed before first render attempt. If missing, the render step fails silently with a Chromium exit-code error. One-time `apt-get install` command (see Pitfall 6) resolves this.

**Missing dependencies with fallback:**
- None identified beyond the above.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling /api/status for progress | Simulated setInterval timer on frontend | D-01 decision | Eliminates SSE/WebSocket complexity; sufficient for 10-30s pipeline |
| Express 4 error handling for async | Express 5 native async error forwarding | Express 5.1 (March 2025) | No need for `express-async-errors` wrapper |
| `headless: 'new'` string | `headless: true` (boolean) | Puppeteer v22+ | String form deprecated; render.js already uses boolean |
| `@google/generative-ai` | `@google/genai` | ~2024 | analyze.js already uses correct new SDK |

---

## Open Questions

1. **Are Puppeteer system libs already installed on the VPS from Phase 2/3 testing?**
   - What we know: VPS was used to validate Puppeteer sandbox flags in Phase 1 (per STATE.md)
   - What's unclear: Whether the full set of shared libraries required by bundled Chromium was installed at that time vs just the sandbox flag validation
   - Recommendation: Include a "verify/install system libs" task in Wave 0 of the plan as a VPS setup check before running the full pipeline live

2. **Does the existing .env on VPS have `PORT=3001`?**
   - What we know: ecosystem.config.js env block sets PORT=3001; `.env.example` defaults PORT=3000
   - What's unclear: Which value is in the live `.env` on the VPS
   - Recommendation: Add an explicit "verify .env PORT=3001" step in the deployment task

3. **Is the project already cloned to the VPS, and at what path?**
   - What we know: VPS IP is 82.29.160.5; Phase 1 validated Puppeteer there; git workflow is D-04
   - What's unclear: The exact `/var/www/annotatorai` vs `~/annotatorai` path used
   - Recommendation: Deployment task should include a `pwd` + `ls` verification step before any `git pull`

---

## Sources

### Primary (HIGH confidence)

- Brief Section 8.1 — POST /api/generate route spec (body shape, validation, sanitizeFocus, 60s timeout)
- Brief Section 9 — Complete Web UI specification (all copy, loading states, download, error)
- Brief Section 10 — VPS deployment instructions (git clone, npm install, PM2 startup)
- Brief Section 12 — Error handling strategy (stage-specific messages, console logging format)
- `src/utils.js` — verified: cleanupOldFiles(), isValidUrl(), sanitizeFocus(), withTimeout() all implemented
- `src/render.js` — verified: renderCard() signature is `(annotationData, screenshotBase64, focus, pageUrl)`, returns `{ filename, filepath }`
- `ecosystem.config.js` — verified: watch: false, PORT: 3001, name: 'annotatorai'
- `package.json` — verified: node-cron@^4 already in dependencies; no new installs required
- `04-UI-SPEC.md` — verified: complete visual, interaction, and copy contract for all frontend components

### Secondary (MEDIUM confidence)

- node-cron README — `*/10 * * * *` cron expression for every-10-minutes scheduling, `cron.schedule()` API
- Puppeteer troubleshooting docs — Ubuntu 22.04 shared library list for bundled Chromium

### Tertiary (LOW confidence)

- None — all critical findings are verified from authoritative project sources or official docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already in package.json, no new libraries
- Architecture: HIGH — all module signatures verified by reading source; route pattern follows existing Express 5 conventions in server.js
- Frontend: HIGH — UI-SPEC fully specifies every component; brief Section 9 is the canonical source
- Deployment: MEDIUM — ecosystem.config.js verified correct; VPS path and .env state unknown until SSH
- Pitfalls: HIGH — PORT/static path/Puppeteer lib issues are well-documented and specific to this project's known configuration

**Research date:** 2026-04-04
**Valid until:** 2026-04-05 (deadline) — this project has a hard cutoff
