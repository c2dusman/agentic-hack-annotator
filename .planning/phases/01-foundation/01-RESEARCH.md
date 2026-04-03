# Phase 1: Foundation - Research

**Researched:** 2026-04-04
**Domain:** Node.js / Express 5 server scaffolding, Puppeteer on Linux VPS, PM2 process management
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use Express 5.1 (not 4.x from brief) — npm default, no migration cost on greenfield
- **D-02:** Use `@google/genai` ^1.x (not `@google/generative-ai`) — old SDK frozen, lacks Gemini 2.5 structured output
- **D-03:** Use native `fetch` (not `axios`) — Node 20 has built-in fetch, unnecessary dependency
- **D-04:** Use Puppeteer ^24 (not ^22 from brief) — current version, better headless defaults
- **D-05:** Develop locally first, then deploy to VPS for verification — catch bugs locally where iteration is fast
- **D-06:** Use raw VPS IP for now — domain available but not pointed yet, fine for hackathon judging
- **D-07:** Create full folder structure with stub files upfront per brief Section 3 — all directories and empty-export modules created in Phase 1, later phases fill them in

### Claude's Discretion

- Exact stub file content (empty exports with TODO comments vs minimal placeholders)
- PM2 ecosystem.config.js structure
- .gitignore contents
- Health check response format (as long as it returns 200 with JSON)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPLOY-01 | App runs on Hostinger VPS (Ubuntu 22.04) via PM2 | PM2 ecosystem.config.js pattern, `pm2 startup`, `pm2 save` |
| DEPLOY-02 | Puppeteer launches with all 4 Linux sandbox flags | `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu` — verified from pptr.dev/troubleshooting |
| DEPLOY-03 | Health check endpoint at GET /api/health | Express route returning `{ status: "ok" }` with 200 |
| REL-03 | Puppeteer browser instances cleaned up via try/finally (no orphaned Chrome) | try/finally pattern in render.js stub — browser.close() guaranteed |

</phase_requirements>

---

## Summary

Phase 1 establishes the complete project skeleton: Express 5.1 server with a health check endpoint and static file serving, the full folder structure with stub modules, Puppeteer validated under Linux sandbox flags, and PM2 configured for auto-restart. All four requirements are purely scaffolding and infrastructure — no AI pipeline logic is implemented here.

The most critical validation in this phase is confirming Puppeteer works on the actual Hostinger VPS with the exact system Chrome path (`/usr/bin/chromium-browser`). Puppeteer 24.x bundles its own Chromium but the brief explicitly specifies `executablePath: '/usr/bin/chromium-browser'` — meaning system Chrome is used, not the bundled one. System libs must be installed first. This is a hard blocker for Phase 3 if skipped.

The full folder structure (per brief Section 3) should be created with stubs in this phase. Later phases depend on these paths existing. This is a one-time skeleton setup that costs minutes to do correctly and saves confusing "module not found" errors in subsequent phases.

**Primary recommendation:** Create skeleton → verify health endpoint locally → deploy to VPS → confirm Puppeteer with system Chrome → commit. Do not move to Phase 2 until the VPS health check is green and Puppeteer takes a test screenshot successfully.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 20.19.2 (local) / 20.x LTS on VPS | Runtime | Project spec requirement; VPS already provisioned |
| Express | 5.2.1 (npm latest) | HTTP server, routing, static files | Decision D-01: greenfield, no migration cost; npm `latest` tag since March 31 2025 |
| Puppeteer | 24.40.0 (npm latest) | Validate headless Chrome on VPS; later used for card rendering | Decision D-04: ^24 for better headless defaults |
| dotenv | 17.4.0 (npm latest) | Load `.env` API keys | Mandatory — never hardcode keys |
| uuid | 13.0.0 (npm latest) | Generate unique output filenames | Used in utils.js `generateId()` |
| node-cron | 4.2.1 (npm latest) | Schedule 1-hour output cleanup (REL-04, Phase 4) — stub in this phase | Survives PM2 restarts cleanly |
| PM2 | 6.0.6 (global, local) | Process management, auto-restart, startup hook | Production-grade; brief Section 10 specifies it |

### Supporting (stub imports in Phase 1, filled in later phases)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sharp | 0.34.5 | Post-process output PNG | Phase 3 (render); import stub in render.js |
| @google/genai | 1.48.0 | Gemini vision analysis | Phase 2; import stub in analyze.js |
| @anthropic-ai/sdk | 0.82.0 | Claude copywriting | Phase 2; import stub in annotate.js |
| screenshotone-api-sdk | latest | Capture input URL screenshot | Phase 2; import stub in screenshot.js |

**Installation (all runtime dependencies at once):**
```bash
npm install express@^5 puppeteer@^24 dotenv uuid node-cron sharp @google/genai @anthropic-ai/sdk screenshotone-api-sdk
npm install -D nodemon
```

**Version verification (confirmed 2026-04-04 via npm registry):**
- express: 5.2.1
- puppeteer: 24.40.0
- sharp: 0.34.5
- dotenv: 17.4.0
- node-cron: 4.2.1
- uuid: 13.0.0
- @anthropic-ai/sdk: 0.82.0
- @google/genai: 1.48.0
- pm2: 6.0.6 (global)

---

## Architecture Patterns

### Recommended Project Structure

Exact structure from brief Section 3 (canonical reference):

```
/annotatorai
├── package.json
├── package-lock.json
├── .env                      <- API keys (never commit)
├── .env.example              <- Template for env vars
├── .gitignore
├── README.md
├── ecosystem.config.js       <- PM2 config
├── server.js                 <- Express app entry point
├── /src
│   ├── screenshot.js         <- screenshotOne API (stub in Phase 1)
│   ├── analyze.js            <- Gemini vision (stub in Phase 1)
│   ├── annotate.js           <- Claude copywriting (stub in Phase 1)
│   ├── render.js             <- Puppeteer render (stub with try/finally in Phase 1)
│   └── utils.js              <- Shared helpers (implement all 5 functions in Phase 1)
├── /templates
│   └── card.html             <- HTML card template (stub in Phase 1)
├── /public
│   ├── index.html            <- Web UI (stub in Phase 1)
│   ├── style.css             <- Web UI styles (stub in Phase 1)
│   └── app.js                <- Web UI JavaScript (stub in Phase 1)
└── /output
    └── .gitkeep              <- Generated images stored here (gitignored)
```

### Pattern 1: Express 5 App Entry with Static Serving

Express 5 async error propagation is automatic — thrown errors in async route handlers propagate to error middleware without wrapping in `try/catch`. Route syntax is unchanged from Express 4 for this phase's simple routes.

```javascript
// server.js skeleton
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { ensureOutputDir } from './src/utils.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));
app.use('/output', express.static(join(__dirname, 'output')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (Express 5 requires 4-param signature)
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

ensureOutputDir();

app.listen(PORT, () => {
  console.log(`AnnotatorAI running on port ${PORT}`);
});
```

Note: Express 5 supports both CommonJS (`require`) and ESM (`import`). The brief uses CommonJS-style module syntax. Use whichever matches the package.json `"type"` field — omitting `"type": "module"` defaults to CommonJS, which matches the brief's `require()` patterns.

### Pattern 2: Puppeteer Launch with VPS Sandbox Flags (REL-03 + DEPLOY-02)

The brief specifies `executablePath: '/usr/bin/chromium-browser'` — this uses system Chrome, not Puppeteer's bundled Chromium. System Chrome must be installed on the VPS separately.

```javascript
// From brief Section 10 + CLAUDE.md verified pattern
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ],
  executablePath: '/usr/bin/chromium-browser'
});
```

For the Phase 1 Puppeteer smoke test (run once on VPS to verify setup):

```javascript
// test-puppeteer.js (temporary verification script, delete after confirming)
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  executablePath: '/usr/bin/chromium-browser'
});
const page = await browser.newPage();
await page.goto('https://example.com');
await page.screenshot({ path: '/tmp/test-screenshot.png' });
await browser.close();
console.log('Puppeteer OK — screenshot saved to /tmp/test-screenshot.png');
```

**try/finally for REL-03 (no orphaned Chrome):**

```javascript
// render.js stub pattern — browser MUST close even on error
export async function renderCard(annotationData, screenshotBase64, focus = null) {
  let browser = null;
  try {
    browser = await puppeteer.launch({ /* VPS flags */ });
    // Phase 3 fills in rendering logic here
    return { filename: '', filepath: '' };
  } finally {
    if (browser) await browser.close();
  }
}
```

### Pattern 3: PM2 ecosystem.config.js (DEPLOY-01)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'annotatorai',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,          // CRITICAL: must be false — watch: true causes infinite restarts when Puppeteer writes PNG files
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

VPS startup commands (brief Section 10):
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # generates systemd hook command — run the output command as root
```

### Pattern 4: utils.js — All 5 Functions

All 5 functions should be fully implemented in Phase 1 (not stubbed), since server.js calls `ensureOutputDir()` at startup and later phases use all helpers.

```javascript
// src/utils.js
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';

export function generateId() {
  return uuidv4();
}

export function ensureOutputDir() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

export function cleanupOldFiles() {
  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();
  const files = readdirSync(OUTPUT_DIR);
  for (const file of files) {
    if (file === '.gitkeep') continue;
    const filepath = join(OUTPUT_DIR, file);
    const { mtimeMs } = statSync(filepath);
    if (now - mtimeMs > ONE_HOUR) {
      unlinkSync(filepath);
    }
  }
}

export function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeFocus(focus) {
  if (!focus || typeof focus !== 'string') return null;
  const trimmed = focus.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 100);
}
```

### Anti-Patterns to Avoid

- **`watch: true` in PM2 config:** Every Puppeteer PNG write triggers PM2 to detect a file change and restart the process — infinite restart loop. Always `watch: false`.
- **`headless: 'new'` string:** Deprecated since Puppeteer v22. Use `headless: true` (boolean). The new headless mode is now the default.
- **`headless: 'shell'`:** Skips some rendering features including accurate CSS/font rendering. Never use for card rendering.
- **`axios` or `node-fetch`:** Node 20 has native `fetch`. No third-party HTTP client needed (Decision D-03).
- **`@google/generative-ai` (old SDK):** Frozen at 0.24.x, lacks Gemini 2.5 structured output. Import stub must use `@google/genai` (Decision D-02).
- **Hardcoded API keys:** Always use `process.env` via dotenv. Verify `.env` is in `.gitignore` before first commit.
- **Skipping `executablePath` on VPS:** Without specifying the system Chrome path, Puppeteer falls back to its bundled Chromium. The bundled binary may fail silently if Ubuntu system shared libs are missing. Use the explicit path.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Process management / auto-restart | Custom crash recovery daemon | PM2 | PM2 handles crash restart, log rotation, startup hooks, cluster mode — all battle-tested |
| Unique filename generation | Custom timestamp + random ID | `uuid` v13 | UUID v4 guarantees global uniqueness; no collision risk with concurrent requests |
| Output cleanup scheduling | `setInterval` in server startup | `node-cron` | `setInterval` resets on PM2 restarts, leaving orphaned files; node-cron runs on schedule regardless |
| URL validation | Regex | `new URL()` + protocol check | The WHATWG URL API handles edge cases regex misses; one-liner, zero dependency |
| Focus sanitization | Complex validation | Simple `trim() + slice(0, 100)` in `sanitizeFocus()` | Brief spec explicitly defines this behavior; overcomplicate nothing in Phase 1 |

**Key insight:** Phase 1 is scaffolding — resist adding any logic that belongs to Phase 2 or 3. The only "real" implementations needed are utils.js (5 small functions) and the health check endpoint.

---

## Runtime State Inventory

Step 2.5: SKIPPED — this is a greenfield phase (no existing code, no rename/refactor). Nothing to inventory.

---

## Environment Availability

### Local Development Machine

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | 24.1.0 (local) | — |
| npm | Package install | Yes | 11.3.0 | — |
| PM2 (global) | Process management testing | Yes | 6.0.6 | — |
| Puppeteer | DEPLOY-02 validation | Yes (via npm install) | 24.40.0 | — |
| System Chrome/Chromium | Puppeteer `executablePath` | NOT applicable locally | — | Use bundled Chromium locally; system path only on VPS |

Note: Local Node.js is v24.1.0, not v20. This is fine for local dev — all packages are compatible with Node 18+. The VPS will run Node 20.x as specified. Do not change local Node version.

### Hostinger VPS (Ubuntu 22.04) — Required State Before Phase 1 Deploy Step

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Node.js 20.x | Runtime | Must install | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt-get install -y nodejs` |
| chromium-browser | DEPLOY-02 (executablePath) | Must install | `sudo apt-get install -y chromium-browser` — this is the binary the brief's executablePath points to |
| PM2 (global) | DEPLOY-01 | Must install | `npm install -g pm2` |
| Ubuntu system libs for Chromium | DEPLOY-02 | Partially present | Run the full lib install command (see Pitfalls section) |
| SSH access | Deployment | Ready (per CONTEXT.md specifics) | Keys configured |
| API keys | Phase 2+ | Ready (per CONTEXT.md specifics) | screenshotOne, Gemini, Anthropic — .env setup in Phase 1 even though not used until Phase 2 |

**Missing dependencies with no fallback (must be addressed in Phase 1 plan):**
- `chromium-browser` on VPS — DEPLOY-02 cannot be verified without it
- `nodejs` 20.x on VPS — nothing runs without it
- Ubuntu Chromium system libs — Puppeteer crashes silently without them

**Missing dependencies with fallback:**
- None for Phase 1 scope

---

## Common Pitfalls

### Pitfall 1: `executablePath` Mismatch on VPS

**What goes wrong:** Puppeteer launches with `executablePath: '/usr/bin/chromium-browser'` but that path doesn't exist, or chromium-browser isn't installed, causing a silent launch failure or cryptic "Failed to launch the browser process" error.

**Why it happens:** The brief hardcodes the Hostinger Ubuntu path. Different distros/installations put Chromium at different paths (e.g., `/usr/bin/chromium`, `/snap/bin/chromium`).

**How to avoid:** After `sudo apt-get install -y chromium-browser`, verify the path: `which chromium-browser`. If it returns something other than `/usr/bin/chromium-browser`, update the `executablePath` in render.js accordingly.

**Warning signs:** `Error: Failed to launch the browser process!` or `spawn /usr/bin/chromium-browser ENOENT`

### Pitfall 2: Missing Ubuntu System Libs for Chromium

**What goes wrong:** Puppeteer/Chromium crashes on Ubuntu 22.04 with cryptic errors like `error while loading shared libraries: libgbm.so.1` or just hangs silently.

**Why it happens:** Headless Chrome requires a set of system-level shared libraries that are not installed by default on minimal Ubuntu VPS images.

**How to avoid:** Run the full lib install BEFORE first Puppeteer test on the VPS:
```bash
sudo apt-get install -y \
  libgbm-dev \
  libxkbcommon-x11-0 \
  libgtk-3-0 \
  libxss1 \
  libasound2 \
  libx11-xcb1 \
  libgconf-2-4 \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libxfixes3 \
  libxtst6 \
  fonts-liberation \
  libappindicator3-1 \
  xdg-utils
```

**Warning signs:** Any "library not found" or "SIGILL" crash when running the test-puppeteer script.

### Pitfall 3: PM2 `watch: true` Infinite Restart Loop

**What goes wrong:** PM2 watches the project directory for file changes. When Puppeteer writes a PNG to `/output/`, PM2 detects the new file, restarts the process, which aborts any in-flight request, and the next request triggers another Puppeteer write — infinite loop.

**Why it happens:** `watch: true` is PM2's change-detection mode, intended for dev auto-reload. It watches ALL subdirectories by default including `/output/`.

**How to avoid:** Always `watch: false` in ecosystem.config.js for production. Use `nodemon` locally for dev auto-restart instead.

**Warning signs:** PM2 log shows rapid restart entries whenever a generation request completes.

### Pitfall 4: Express 5 Path Routing Behavior Change

**What goes wrong:** In Express 5, wildcard routes changed. `app.get('*', ...)` is no longer valid — use `app.get('/{*path}', ...)` or `app.get(/.*/, ...)`.

**Why it happens:** Express 5 uses a new path-to-regexp version with stricter wildcard syntax.

**How to avoid:** Phase 1 only needs `/api/health` and static serving — neither uses wildcards. No action needed now. Document for Phase 4 when the catch-all route might be added.

**Warning signs:** Express 5 throws `TypeError: Invalid path` at startup if wildcard syntax from Express 4 is used.

### Pitfall 5: ESM vs CommonJS Mismatch

**What goes wrong:** Mixing `import`/`export` and `require`/`module.exports` in the same project without setting `"type": "module"` in package.json causes `SyntaxError: Cannot use import statement in a module`.

**Why it happens:** The brief uses CommonJS syntax in its examples. Node.js defaults to CommonJS when `"type"` field is absent.

**How to avoid:** Pick one style and be consistent. The safest choice given the brief's examples is CommonJS (`require`/`module.exports`) — omit `"type": "module"` from package.json. If using ESM, set `"type": "module"` and rename all files to `.mjs` or use `import` consistently.

**Warning signs:** SyntaxError at startup about unexpected `import` or `export` tokens.

### Pitfall 6: Local Node Version vs VPS Node Version Mismatch

**What goes wrong:** Local machine runs Node 24.1.0; VPS runs Node 20.x. Code using Node 22+ APIs would work locally but fail on VPS.

**Why it happens:** Local environment is ahead of the pinned VPS version.

**How to avoid:** Stick to Node 20 API surface. No Node 22+ features (e.g., `--experimental-strip-types`, native glob with `fs.glob`). All packages in this stack support Node 18+.

**Warning signs:** VPS crashes on startup with "SyntaxError: Unexpected token" or "is not a function" for APIs that didn't exist in Node 20.

---

## Code Examples

### Health Check Endpoint (DEPLOY-03)
```javascript
// Source: brief Section 8.1
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### Static File Serving (DEPLOY-01 prerequisite)
```javascript
// Source: brief Section 8.1
app.use(express.static(join(__dirname, 'public')));
app.use('/output', express.static(join(__dirname, 'output')));
```

### Puppeteer VPS Launch (DEPLOY-02)
```javascript
// Source: brief Section 10
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ],
  executablePath: '/usr/bin/chromium-browser'
});
```

### render.js Stub with try/finally (REL-03)
```javascript
// Source: REQUIREMENTS.md REL-03
export async function renderCard(annotationData, screenshotBase64, focus = null) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      executablePath: '/usr/bin/chromium-browser'
    });
    // TODO Phase 3: implement full rendering
    throw new Error('render.js not yet implemented');
  } finally {
    if (browser) await browser.close();
  }
}
```

### .env.example (brief Section 4)
```
# Server
PORT=3000

# screenshotOne API
SCREENSHOTONE_ACCESS_KEY=your_key_here

# Google Gemini
GEMINI_API_KEY=your_key_here

# Anthropic Claude
ANTHROPIC_API_KEY=your_key_here

# Output
OUTPUT_DIR=./output
BASE_URL=http://localhost:3000
```

### .gitignore essentials
```
node_modules/
.env
output/*.png
output/*.jpg
output/temp_*.html
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Express 4.x | Express 5.1 (npm `latest`) | March 31, 2025 | Express 5 is now the default install; async error propagation built-in |
| `headless: 'new'` (string) | `headless: true` (boolean, default) | Puppeteer v22 | New headless is the default; old string option deprecated |
| `@google/generative-ai` 0.x | `@google/genai` 1.x | Late 2024 | Old SDK frozen; new SDK required for Gemini 2.5 and structured output |
| `puppeteer.launch({ headless: false })` on VPS | All 4 sandbox flags required | Always | VPS has no display server; flags prevent crash |

**Deprecated/outdated (do not use in this project):**
- `@google/generative-ai`: Frozen at 0.24.x, absent Gemini 2.5 structured output — use `@google/genai`
- `axios`: Node 20 native fetch covers all use cases in this project
- `headless: 'new'` string: Use `headless: true` boolean
- `uuid` v9 (brief's package.json): Current is v13 — no API change for `v4 as uuidv4`; use current

---

## Open Questions

1. **Chromium path on the specific Hostinger VPS image**
   - What we know: Brief specifies `/usr/bin/chromium-browser`; this is the Ubuntu 22.04 apt package path
   - What's unclear: Whether the Hostinger VPS image uses the snap package instead (which would put it at `/snap/bin/chromium`)
   - Recommendation: After `apt-get install -y chromium-browser`, run `which chromium-browser` to confirm path before writing it into render.js

2. **`"type": "module"` vs CommonJS for package.json**
   - What we know: Brief examples use CommonJS (`require`); Node 20 defaults to CommonJS without `"type": "module"`
   - What's unclear: Whether Claude's discretion for "stub file content" implies ESM style
   - Recommendation: Default to CommonJS (omit `"type": "module"`) — matches brief examples and avoids ESM gotchas with `__dirname`, `__filename`, and `require()`

---

## Validation Architecture

Phase 1 has no automated test framework configured. The validation for this phase is operational verification, not unit tests.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None in Phase 1 — operational smoke tests only |
| Config file | none |
| Quick run command | `curl http://localhost:3000/api/health` |
| Full suite command | Manual VPS verification checklist |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-03 | GET /api/health returns 200 JSON | smoke | `curl -s http://<VPS_IP>:3000/api/health` | N/A — curl test |
| DEPLOY-02 | Puppeteer launches with 4 sandbox flags | smoke | `node test-puppeteer.js` on VPS | Wave 0 — create script |
| DEPLOY-01 | PM2 keeps app alive after crash | manual | `pm2 list` shows `online` status; `kill <pid>` then confirm auto-restart | N/A — manual |
| REL-03 | try/finally present in render.js stub | code review | N/A — visual code review | Wave 0 — create stub |

### Sampling Rate
- **Per task commit:** `curl -s http://localhost:3000/api/health | grep ok`
- **Per wave merge:** Full VPS verification checklist (all 4 success criteria in phase description)
- **Phase gate:** All 4 success criteria TRUE before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `test-puppeteer.js` — temporary VPS smoke test script (delete after verification)
- [ ] `ecosystem.config.js` — must exist before PM2 deploy step
- [ ] `src/render.js` stub with try/finally — required for REL-03

---

## Project Constraints (from CLAUDE.md)

The following CLAUDE.md directives apply to all phases including this one:

| Directive | Constraint |
|-----------|------------|
| Tech stack | Node.js 20 + Express + vanilla HTML/CSS/JS — no frameworks |
| Screenshot API | screenshotOne for input URL screenshots (not local Puppeteer) |
| Vision | Gemini 2.5 Flash (`gemini-2.5-flash`) |
| Copywriting | Claude Sonnet 4 (`claude-sonnet-4-5` — verify at build time) |
| Puppeteer | Must include Linux VPS flags: `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu` |
| Cost | ~$0.03-0.05 per generation — keep API lean |
| Hosting | Hostinger VPS (Ubuntu 22.04) — required for judging |
| Deadline | April 5, 2026 23:59:59 UTC — deployed and working over polish |
| PM2 watch | `watch: false` always in production (infinite restart loop risk) |
| Headless | `headless: true` (boolean) not `'new'` string |
| HTTP client | Native `fetch` — no `axios` or `node-fetch` |
| Google SDK | `@google/genai` ^1.x — not `@google/generative-ai` |

---

## Sources

### Primary (HIGH confidence)
- `annotator-project-brief.md` (local) — folder structure §3, env vars §4, module specs §8, deployment §10, package.json §11
- `CLAUDE.md` (local) — tech stack decisions, version gotchas, what not to use, Puppeteer flags
- npm registry (live, 2026-04-04) — verified current versions: express 5.2.1, puppeteer 24.40.0, sharp 0.34.5, dotenv 17.4.0, node-cron 4.2.1, uuid 13.0.0, @anthropic-ai/sdk 0.82.0, @google/genai 1.48.0, pm2 6.0.6
- pptr.dev/troubleshooting — `--no-sandbox` and system dependency guidance (HIGH confidence)
- pptr.dev/guides/headless-modes — `headless: true` default since v22 (HIGH confidence)
- expressjs.com/2025/03/31/v5-1-latest-release.html — Express 5.1 is npm latest (HIGH confidence)

### Secondary (MEDIUM confidence)
- REQUIREMENTS.md (local) — REL-03 cleanup requirement, traceability table
- STATE.md (local) — project context, current blockers

### Tertiary (LOW confidence)
- None — all findings verified against local project specs and npm registry

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified live against npm registry 2026-04-04
- Architecture: HIGH — patterns sourced directly from project brief and CLAUDE.md directives
- Pitfalls: HIGH — most from CLAUDE.md "What NOT to Use" section and official Puppeteer docs

**Research date:** 2026-04-04
**Valid until:** 2026-04-12 (7 days — fast-moving npm ecosystem; re-verify Puppeteer version if VPS install happens after this date)
