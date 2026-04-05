<!-- generated-by: gsd-doc-writer -->
# Configuration

AnnotatorAI is configured entirely through environment variables loaded via `dotenv`. There are no YAML or JSON config files — all settings live in a `.env` file at the project root.

## Quick Start

```bash
cp .env.example .env
# Edit .env and fill in your API keys
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SCREENSHOTONE_ACCESS_KEY` | Yes | — | Access key for the ScreenshotOne API. Used to authenticate screenshot capture requests. |
| `SCREENSHOTONE_SECRET_KEY` | Yes | — | Secret key for the ScreenshotOne API. Used alongside the access key for request signing. |
| `GEMINI_API_KEY` | Yes | — | API key for Google Gemini. Used by the vision analysis step (`gemini-2.5-flash` model). |
| `ANTHROPIC_API_KEY` | Yes | — | API key for Anthropic Claude. Used by the annotation copywriting step (`claude-sonnet-4-5` model). |
| `PORT` | No | `3000` | HTTP port the Express server listens on. |
| `OUTPUT_DIR` | No | `./output` | Directory where generated PNG files are written. Created automatically if it does not exist. |
| `BASE_URL` | No | `http://localhost:3000` | Base URL of the running server. Referenced in `.env.example`; not currently read by application code at runtime. <!-- VERIFY: confirm whether BASE_URL is consumed by any frontend or deployment script --> |

### Notes on required variables

The four API keys (`SCREENSHOTONE_ACCESS_KEY`, `SCREENSHOTONE_SECRET_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`) have no defaults and no fallback logic. The server will throw an error at the point of first use if any of them is missing or empty.

The `SCREENSHOTONE_*` keys are validated eagerly in `src/screenshot.js` — the module throws before making any network call if either key is absent. The Gemini and Anthropic keys are passed directly to their respective SDK constructors on module load.

## .env.example

The canonical variable list lives in `.env.example` at the project root:

```dotenv
PORT=3000
SCREENSHOTONE_ACCESS_KEY=your_key_here
SCREENSHOTONE_SECRET_KEY=your_secret_here
GEMINI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
OUTPUT_DIR=./output
BASE_URL=http://localhost:3000
```

Never commit the real `.env` file. `.env.example` is safe to commit because it contains only placeholder values.

## Config File Format

There is one structured config file beyond `.env`:

### `ecosystem.config.js` (PM2 — production only)

Used by PM2 to manage the Node.js process on the Hostinger VPS.

```js
module.exports = {
  apps: [{
    name: 'annotatorai',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

Key fields:

| Field | Value | Purpose |
|---|---|---|
| `instances` | `1` | Single process — prevents multiple Chromium instances competing for RAM. |
| `watch` | `false` | Must stay `false`. Setting `true` causes PM2 to restart on every PNG write. |
| `max_memory_restart` | `'1G'` | Restarts the process if RSS exceeds 1 GB (Chromium can grow under load). |
| `env.NODE_ENV` | `'production'` | Signals production mode to Express and other libraries. |
| `env.PORT` | `3001` | Overrides the default port 3000 for the VPS deployment. <!-- VERIFY: confirm reverse-proxy (nginx/caddy) forwards to port 3001 on the VPS --> |

## Per-Environment Overrides

| Setting | Local dev | VPS production |
|---|---|---|
| `PORT` | `3000` (`.env` default) | `3001` (set in `ecosystem.config.js` `env` block) |
| `NODE_ENV` | Not set (defaults to `undefined`) | `production` (set by PM2) |
| `OUTPUT_DIR` | `./output` | `./output` (same; path is relative to project root) |
| Process manager | `nodemon` (`npm run dev`) | PM2 (`pm2 start ecosystem.config.js`) |

Variables in the PM2 `env` block take precedence over `.env` values when the app is started through PM2.

## Output File Cleanup

Generated PNG files in `OUTPUT_DIR` are automatically deleted after **1 hour**. Cleanup runs on server startup and then every 10 minutes via a `node-cron` schedule defined in `server.js`. The `.gitkeep` file inside `output/` is excluded from cleanup.

In-memory generation data (used to link overview images to step cards) expires after **10 minutes** via a `setTimeout` in `server.js`.

## API Timeout

The full generation pipeline (`/api/generate`) has a hard timeout of **60 seconds**. The step-cards pipeline (`/api/step-cards`) has a timeout of **120 seconds**. These are hardcoded in `server.js` via the `withTimeout` utility and are not configurable via environment variables.

## Puppeteer Launch Flags

Puppeteer is launched with the following fixed flags (not configurable via env):

```
--no-sandbox
--disable-setuid-sandbox
--disable-dev-shm-usage
--disable-gpu
```

These flags are required for running headless Chromium on Ubuntu 22.04 VPS environments. They are hardcoded in `src/render.js` via `getLaunchOptions()`.
