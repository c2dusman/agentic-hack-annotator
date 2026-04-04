# AnnotatorAI

One URL in, one annotated image out. Fully automated.

AnnotatorAI takes any webpage URL and generates a professionally annotated 1080x1920 vertical image ready for social media carousels and tutorials. No manual editing, no design tools.

**Live demo:** http://82.29.160.5:3001

## How It Works

1. **Screenshot** -- Captures the webpage via ScreenshotOne API
2. **Analyze** -- Gemini 2.5 Flash identifies key UI elements via vision
3. **Annotate** -- Claude Sonnet writes step-by-step tutorial copy
4. **Render** -- Puppeteer renders a dark-themed card with the screenshot and numbered annotations

Cost per generation: ~$0.03-0.05

## Quick Start

```bash
# 1. Clone
git clone https://github.com/c2dusman/agentic-hack-annotator.git
cd agentic-hack-annotator

# 2. Install dependencies
npm install

# 3. Configure API keys
cp .env.example .env
# Edit .env with your keys (see API Keys section below)

# 4. Run
npm start
# Open http://localhost:3000
```

## API Keys Required

| Key | Where to get it |
|-----|----------------|
| `SCREENSHOTONE_ACCESS_KEY` | https://screenshotone.com (free tier available) |
| `SCREENSHOTONE_SECRET_KEY` | Same dashboard as above |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |

## Environment Variables

```env
PORT=3000
SCREENSHOTONE_ACCESS_KEY=your_key_here
SCREENSHOTONE_SECRET_KEY=your_secret_here
GEMINI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
OUTPUT_DIR=./output
BASE_URL=http://localhost:3000
```

## Production Deployment (Ubuntu VPS)

```bash
# Install system dependencies for Puppeteer
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
# Edit .env with your keys and set PORT=3001

# Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Tech Stack

- **Runtime:** Node.js 20 + Express 5
- **Screenshot:** ScreenshotOne API
- **Vision AI:** Gemini 2.5 Flash (structured JSON output)
- **Copywriting AI:** Claude Sonnet 4
- **Rendering:** Puppeteer (headless Chrome) + Sharp
- **Frontend:** Vanilla HTML/CSS/JS (no frameworks)

## API

### POST /api/generate

```json
{
  "url": "https://example.com",
  "focus": "How to sign up"
}
```

`focus` is optional. If omitted, the AI decides what to annotate.

**Response:**
```json
{
  "imageUrl": "/output/abc123.png"
}
```

### GET /api/health

Returns `{"status": "ok", "timestamp": "..."}`.

## Project Structure

```
server.js              # Express app, /api/generate route, cron cleanup
src/
  screenshot.js        # ScreenshotOne API capture
  analyze.js           # Gemini vision analysis
  annotate.js          # Claude copywriting
  render.js            # Puppeteer HTML-to-PNG
  utils.js             # Validation, cleanup, helpers
templates/
  card.html            # Dark-themed card template (1080x1920)
public/
  index.html           # Web UI
  style.css            # Dark theme styles
  app.js               # Form handler, loading states
ecosystem.config.js    # PM2 production config
```

## License

MIT
