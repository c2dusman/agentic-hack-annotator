<!-- generated-by: gsd-doc-writer -->
# Development Guide

This guide covers setting up a local development environment, available commands, code style conventions, and the branch/PR workflow for AnnotatorAI.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20.x LTS | See `package.json` `engines` — Node 20 matches the pre-provisioned VPS. Node 22 LTS is a valid upgrade post-hackathon. |
| npm | 10.x (bundled with Node 20) | No global Yarn/pnpm required. |
| PM2 | 6.x (global, VPS only) | `npm install -g pm2@latest` — only needed for production deployment, not local dev. |

## Local Setup

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd annotatorai
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Install Puppeteer's bundled Chromium** (run once after `npm install`)

   ```bash
   npx puppeteer browsers install chrome
   ```

   On macOS this is typically not required; on Ubuntu 22.04 it is mandatory.

4. **Create your `.env` file**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and supply your API keys. See `docs/CONFIGURATION.md` for the full variable reference. The four required keys are:

   ```
   SCREENSHOTONE_ACCESS_KEY=
   SCREENSHOTONE_SECRET_KEY=
   GEMINI_API_KEY=
   ANTHROPIC_API_KEY=
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   The server starts on `http://localhost:3000` (or the `PORT` value in `.env`). `nodemon` watches for file changes and restarts automatically.

6. **Open the app**

   Navigate to `http://localhost:3000` in your browser. Submit any public URL to run the full pipeline.

## Build Commands

There is no compile or bundle step. The table below lists all `package.json` scripts.

| Command | Description |
|---------|-------------|
| `npm start` | Start the server with plain `node`. Use in production or when you don't need auto-restart. |
| `npm run dev` | Start the server with `nodemon` for auto-restart on file changes. Use during local development only — not in production. |

### Production (VPS only)

The VPS process is managed by PM2, not npm scripts directly.

| Command | Description |
|---------|-------------|
| `pm2 start ecosystem.config.js` | Start or restart the app under PM2 (port 3001, `NODE_ENV=production`). |
| `pm2 stop annotatorai` | Stop the PM2-managed process. |
| `pm2 restart annotatorai` | Restart the process (e.g. after a deploy). |
| `pm2 logs annotatorai` | Tail live application logs. |
| `pm2 startup` | Generate a startup script so PM2 survives reboots. <!-- VERIFY: systemd startup command confirmed on Hostinger Ubuntu 22.04 VPS --> |

## Running Tests

Tests are standalone Node scripts — no test runner is required. Run each file directly:

```bash
# Render pipeline (Puppeteer + Sharp) — no API keys needed
node tests/test-render.js

# Screenshot capture — requires SCREENSHOTONE_* keys in .env
node test-screenshot.js

# Vision analysis — requires GEMINI_API_KEY in .env
node test-analyze.js

# Annotation copy — requires ANTHROPIC_API_KEY in .env
node test-annotate.js

# Puppeteer sanity check — no API keys needed
node test-puppeteer.js
```

`tests/test-render.js` is the primary automated test. It creates a mock screenshot, calls `renderCard` twice (with and without a focus hint), asserts the output is a 1080×1920 PNG under 500 KB, then cleans up the generated files. It exits with code `1` on failure.

The root-level `test-*.js` files are integration smoke tests that call live APIs and write output to `./output/`.

## Code Style

There is no linter or formatter configured in the project (no `.eslintrc`, `.prettierrc`, or `biome.json`). The following conventions are observed throughout the existing source files:

- **`'use strict'`** at the top of every `src/` module.
- **CommonJS** (`require` / `module.exports`) — no ES module syntax (`import`/`export`).
- **2-space indentation**, single quotes for strings, semicolons at end of statements.
- **`dotenv.config()`** called at the top of each module that reads environment variables (both `server.js` and individual `src/` modules).
- **Async/await** for all asynchronous operations; no raw Promise chains.
- **`console.error`** with ISO timestamp prefix for all error logging: `[${new Date().toISOString()}] ...`.
- **Template placeholder convention** in HTML templates: `{{TOKEN}}` strings replaced at render time via `String.prototype.replace` in `src/render.js`.

## Project Structure

```
annotatorai/
├── server.js               # Express entry point — routes, in-memory cache, cron cleanup
├── src/
│   ├── screenshot.js       # Stage 1 — ScreenshotOne API capture
│   ├── analyze.js          # Stage 2 — Gemini 2.5 Flash vision analysis
│   ├── annotate.js         # Stage 3 — Claude Sonnet 4 copy generation
│   ├── render.js           # Stage 4 — Puppeteer + Sharp card rendering
│   └── utils.js            # Shared helpers (retry, timeout, crop, cleanup)
├── templates/
│   ├── card.html           # Overview card template (1080×1920)
│   └── step-card.html      # Step detail card template (1080×1080)
├── public/
│   ├── index.html          # Single-page frontend
│   ├── app.js              # Vanilla JS — form, polling, gallery
│   └── style.css           # Frontend styles
├── tests/
│   └── test-render.js      # Automated render test (no API keys needed)
├── output/                 # Runtime PNG output — auto-deleted after 1 hour
├── ecosystem.config.js     # PM2 production config
└── .env.example            # Environment variable template
```

## Adding a New Pipeline Stage

1. Create `src/<stage>.js` with `'use strict'` and `module.exports`.
2. Call `require('dotenv').config()` at the top if the module reads any env var.
3. Export a single named async function following the pattern in the existing stages.
4. Wire it into the pipeline in `server.js` inside the `app.post('/api/generate', ...)` handler.
5. Add a corresponding `test-<stage>.js` smoke test at the project root.

## Branch Conventions

<!-- VERIFY: no .github/CONTRIBUTING.md or branch protection rules found in repo -->

There is no formal branching policy configured in the repository. The following lightweight conventions match the commit history:

- Work directly on `master` for solo development during the hackathon period.
- Use short descriptive branch names for distinct features if working with collaborators: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`.
- Commit message prefixes follow Conventional Commits style as observed in the log: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.

## PR Process

<!-- VERIFY: no .github/pull_request_template.md found — no formal PR template configured -->

There is no PR template in the repository. For any pull requests:

1. Keep PRs small and focused on a single concern.
2. Ensure `tests/test-render.js` passes locally (`node tests/test-render.js`).
3. Confirm the server starts cleanly (`npm start`) with all four API keys present.
4. Write a clear PR title using the same Conventional Commits prefix as the commit messages.
5. Note any new environment variables introduced and update `.env.example` accordingly.

## Deployment

See `docs/CONFIGURATION.md` for the full environment variable reference and PM2 config details.

Quick deploy sequence on the Hostinger VPS:

```bash
# Pull latest code
git pull origin master

# Install any new dependencies
npm install

# Restart the PM2 process
pm2 restart annotatorai

# Confirm it is running
pm2 status
```

<!-- VERIFY: nginx or Caddy reverse-proxy configuration forwards HTTPS traffic to port 3001 on the VPS -->
