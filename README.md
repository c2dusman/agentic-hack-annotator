<!-- generated-by: gsd-doc-writer -->
# AnnotatorAI

One URL in, one annotated image out. Fully automated.

AnnotatorAI takes any webpage URL and generates a professionally annotated vertical image (1080x1920) plus per-step square cards (1080x1080) — ready for social media carousels and tutorials. No manual editing, no design tools.

<!-- VERIFY: live demo URL is still active -->
**Live demo:** http://82.29.160.5:3001

## How It Works

1. **Screenshot** — Captures the webpage via ScreenshotOne API (1200px wide, full page, ads + cookie banners blocked)
2. **Analyze** — Gemini 2.5 Flash identifies 3–5 key UI elements with precise coordinates via structured JSON output
3. **Annotate** — Claude Sonnet 4 writes action-oriented tutorial copy aligned to an optional focus hint
4. **Render** — Puppeteer renders a dark-themed overview card; optionally generates per-step zoom cards from cropped screenshot regions

Cost per generation: ~$0.03–0.05

## Quick Start

```bash
# 1. Clone
git clone https://github.com/c2dusman/agentic-hack-annotator.git
cd agentic-hack-annotator

# 2. Install dependencies
npm install

# 3. Configure API keys
cp .env.example .env
# Edit .env with your keys (see Environment Variables below)

# 4. Run
npm start
# Open http://localhost:3000
```

## Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```env
PORT=3000
SCREENSHOTONE_ACCESS_KEY=your_key_here
SCREENSHOTONE_SECRET_KEY=your_secret_here
GEMINI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
OUTPUT_DIR=./output
BASE_URL=http://localhost:3000
```

| Variable | Where to get it |
|----------|----------------|
| `SCREENSHOTONE_ACCESS_KEY` / `SCREENSHOTONE_SECRET_KEY` | https://screenshotone.com (free tier available) |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |

## API

### `POST /api/generate`

Run the full pipeline and return the overview card image.

```json
{ "url": "https://example.com", "focus": "How to sign up" }
```

`focus` is optional. If omitted, the AI infers what to annotate.

**Response:**
```json
{
  "imageUrl": "/output/abc123.png",
  "stepCount": 4,
  "overviewId": "abc123.png"
}
```

### `POST /api/step-cards`

Generate per-step zoom cards from a previous generation (valid for 10 minutes after the overview was created).

```json
{ "overviewId": "abc123.png" }
```

**Response:**
```json
{ "imageUrls": ["/output/def456.png", "/output/ghi789.png"] }
```

### `POST /api/download-all`

Stream a ZIP archive containing the overview and step card images.

```json
{ "files": ["/output/abc123.png", "/output/def456.png"] }
```

Returns `application/zip` named `annotatorai-carousel.zip`. Files are ordered: `0-overview.png`, `1-step-1.png`, `2-step-2.png`, etc.

### `GET /api/health`

Returns `{"status": "ok", "timestamp": "..."}`.

## Production Deployment (Ubuntu 22.04 VPS)

```bash
# Install system dependencies for Puppeteer's bundled Chromium
sudo apt-get update && sudo apt-get install -y \
  libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 \
  libnss3 libcups2 libxss1 libxrandr2 libasound2 libpangocairo-1.0-0 \
  libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0 libgbm1 ca-certificates \
  fonts-liberation libappindicator3-1 libu2f-udev libvulkan1 xdg-utils

# Clone and install
git clone https://github.com/c2dusman/agentic-hack-annotator.git
cd agentic-hack-annotator
npm install
cp .env.example .env
# Edit .env — set PORT=3001 (or whatever port you use)

# Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

PM2 is configured in `ecosystem.config.js` with `watch: false` and `max_memory_restart: 1G`. Production port defaults to `3001`.

Output images are cleaned up automatically every 10 minutes.

## Project Structure

```
server.js              # Express app, API routes, cron cleanup
src/
  screenshot.js        # ScreenshotOne API capture (1200px, full page)
  analyze.js           # Gemini 2.5 Flash vision analysis (structured JSON)
  annotate.js          # Claude Sonnet 4 copywriting
  render.js            # Puppeteer HTML-to-PNG + Sharp compression
  utils.js             # URL validation, cleanup helpers, retry logic
templates/
  card.html            # Overview card template (1080x1920, dark theme)
  step-card.html       # Per-step card template (1080x1080, dark theme)
public/
  index.html           # Web UI
  style.css            # Dark theme styles
  app.js               # Form handler, loading states
ecosystem.config.js    # PM2 production config
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 + Express 5 |
| Screenshot | ScreenshotOne API (`screenshotone-api-sdk`) |
| Vision AI | Gemini 2.5 Flash (`@google/genai` v1) |
| Copywriting AI | Claude Sonnet 4 (`@anthropic-ai/sdk` v0.82) |
| Rendering | Puppeteer v24 (headless Chrome) + Sharp v0.34 |
| Frontend | Vanilla HTML/CSS/JS |
| Process manager | PM2 v6 |

## Development

```bash
npm run dev   # nodemon auto-restart
npm start     # plain node
```

## License

MIT
