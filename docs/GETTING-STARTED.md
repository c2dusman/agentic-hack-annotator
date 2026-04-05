<!-- generated-by: gsd-doc-writer -->
# Getting Started with AnnotatorAI

AnnotatorAI takes any webpage URL and produces a professionally annotated vertical image (1080×1920) plus per-step square cards (1080×1080) — fully automated, no design tools required.

This guide covers local development setup from a clean checkout to a running server.

---

## Prerequisites

### Node.js

Node.js **20.x LTS** is required (the project spec target for the Hostinger VPS). Node 18.17+ also satisfies the `sharp` Node-API v9 requirement, but v20 is recommended to match production.

```bash
node --version   # must be >= 20.3.0
npm --version    # bundled with Node 20
```

> Note: Node 20 reaches EOL in April 2026. For local development beyond that date, Node 22 LTS is a drop-in replacement.

### API accounts

You need accounts and keys for four external services before the pipeline can run:

| Service | Key(s) needed | Where to obtain |
|---|---|---|
| ScreenshotOne | `SCREENSHOTONE_ACCESS_KEY` + `SCREENSHOTONE_SECRET_KEY` | https://screenshotone.com (free tier available) |
| Google AI Studio (Gemini) | `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| Anthropic (Claude) | `ANTHROPIC_API_KEY` | https://console.anthropic.com |

### System libraries (Linux / Ubuntu only)

Puppeteer bundles its own Chromium but depends on shared system libraries. On Ubuntu 22.04 (the production VPS OS), install them once before `npm install`:

```bash
sudo apt-get update && sudo apt-get install -y \
  ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 \
  libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 \
  libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
  libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
  libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
  libxss1 libxtst6 lsb-release wget xdg-utils
```

<!-- VERIFY: confirm the above package list against current Puppeteer 24.x troubleshooting docs -->

On macOS, no additional system libraries are needed.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/c2dusman/agentic-hack-annotator.git
cd agentic-hack-annotator
```

### 2. Install dependencies

```bash
npm install
```

This installs all production dependencies (Express, Puppeteer, Sharp, `@google/genai`, `@anthropic-ai/sdk`, etc.) and the `nodemon` dev dependency.

After `npm install`, Puppeteer downloads its own Chromium binary. If the download fails or the binary is missing, run:

```bash
npx puppeteer browsers install chrome
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your four API keys:

```dotenv
PORT=3000
SCREENSHOTONE_ACCESS_KEY=your_key_here
SCREENSHOTONE_SECRET_KEY=your_secret_here
GEMINI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
OUTPUT_DIR=./output
BASE_URL=http://localhost:3000
```

All four API keys are required. The server will throw an error on first use if any are missing. See [docs/CONFIGURATION.md](./CONFIGURATION.md) for full details on every variable.

---

## First Run

### Start the development server

```bash
npm run dev
```

`nodemon` watches for file changes and restarts automatically. The server starts on port 3000 by default.

Alternatively, to start without auto-restart:

```bash
npm start
```

### Verify the server is running

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Generate your first image

Open your browser at `http://localhost:3000`. Enter any public URL in the input field (e.g. `stripe.com`) and optionally a focus hint (e.g. "how to create an account"). Click **Generate**.

The pipeline takes 15–45 seconds depending on the target page and API response times. When complete, the annotated 1080×1920 overview card displays in the browser, with an option to generate per-step cards and download all images as a ZIP.

---

## Common Setup Issues

### Puppeteer crashes silently on Linux

**Symptom:** The server starts but image generation fails with a Chromium-related error or hangs.

**Cause:** Missing system shared libraries required by the bundled Chromium binary.

**Fix:** Install the Ubuntu system dependencies listed in the Prerequisites section above. Then restart the server.

### `Error: SCREENSHOTONE_ACCESS_KEY is not set`

**Cause:** `.env` file not created or the key value is still the placeholder `your_key_here`.

**Fix:** Confirm that `.env` exists at the project root and all four API key variables are filled with real values (not placeholder strings).

### Port 3000 already in use

**Symptom:** `Error: listen EADDRINUSE :::3000`

**Fix:** Either stop the process using port 3000, or set a different port in `.env`:

```dotenv
PORT=3001
```

### `sharp` installation fails

**Symptom:** `npm install` errors with a pre-build or libvips message.

**Cause:** `sharp` uses native Node-API bindings. It requires Node >=18.17.0 or >=20.3.0. Older Node versions are not supported.

**Fix:** Upgrade Node to 20.x LTS, then reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Gemini or Claude API key errors

**Symptom:** Generation fails with a 400 or 401 error from the AI step.

**Fix:** Verify that the key in `.env` is active and has sufficient quota. Google AI Studio keys are free-tier by default; Anthropic keys require a funded account for `claude-sonnet-4-5`.

---

## Running the Tests

The project includes standalone test scripts for individual pipeline stages. Each script requires a valid `.env` file.

```bash
# Test screenshot capture only
node test-screenshot.js

# Test Gemini vision analysis only (requires a local screenshot)
node test-analyze.js

# Test Claude annotation copy only
node test-annotate.js

# Test Puppeteer card rendering with mock data (no external APIs needed)
node tests/test-render.js

# Test Puppeteer launch and screenshot locally
node test-puppeteer.js
```

`tests/test-render.js` generates a real PNG from mock data and writes it to `output/`. It is the safest first test to confirm Puppeteer is working correctly without consuming API credits.

---

## Next Steps

- **Configuration reference** — Full list of environment variables and PM2 options: [docs/CONFIGURATION.md](./CONFIGURATION.md)
- **Architecture overview** — Pipeline stages, data flow, and component diagram: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **Production deployment** — The live instance runs on a Hostinger Ubuntu 22.04 VPS managed by PM2. See `ecosystem.config.js` and [docs/CONFIGURATION.md](./CONFIGURATION.md#ecosystemconfigjs-pm2--production-only) for production-specific settings.
