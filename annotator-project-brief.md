# AnnotatorAI — Hostinger Hackathon Project Brief
**Version:** 2.0  
**Date:** March 28, 2026  
**Hackathon Deadline:** April 5, 2026 at 23:59:59 UTC  

---

## 1. Project Overview

AnnotatorAI is a web application that takes a URL and an optional focus hint as input, and automatically outputs a professionally annotated vertical image (9:16 ratio) ready for social media carousels and blog articles. No manual editing. No Canva. Just a URL in → a beautiful annotated image out.

The user can optionally provide a **focus hint** — a short phrase describing what they want the annotation to explain (e.g. "How to connect Gmail" or "Setting up API keys"). If no hint is provided, the AI analyzes the page and makes its own intelligent judgment about what to annotate. This makes the tool useful for both directed tutorial creation and fully automated visual generation.

The system captures a screenshot of the URL, uses Gemini 2.5 Flash to analyze the page visually with awareness of the focus hint, passes that structured data to Claude Sonnet to write clean tutorial-style annotation copy aligned to the focus, then renders everything into a polished dark-themed HTML template which is screenshotted by Puppeteer to produce the final image.

**Tagline:** *One URL. One click. Ready-to-post visuals.*

---

## 2. Tech Stack

| Layer | Tool | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | 20.x LTS | Backend runtime |
| Framework | Express | 4.x | HTTP server and routing |
| Screenshot Input | screenshotOne API | REST | Capture URL as PNG |
| Vision Analysis | Gemini 2.5 Flash | `gemini-2.5-flash` | Spatial UI analysis, OCR, element location — focus-aware |
| Annotation Copy | Claude Sonnet 4 | `claude-sonnet-4-20250514` | Write clean step titles and descriptions — focus-aware |
| Image Rendering | Puppeteer | Latest | Screenshot HTML template to PNG |
| Image Processing | Sharp | Latest | Resize, crop, optimize output |
| Frontend | Vanilla HTML/CSS/JS | — | Single page web UI |
| Hosting | Hostinger VPS | Ubuntu 22.04 | Required for judging |
| Process Manager | PM2 | Latest | Keep Node.js app alive on VPS |

---

## 3. Folder Structure

```
/annotatorai
├── package.json
├── package-lock.json
├── .env                          ← API keys (never commit)
├── .env.example                  ← Template for env vars
├── .gitignore
├── README.md                     ← Setup and deploy instructions
├── server.js                     ← Express app entry point
├── /src
│   ├── screenshot.js             ← screenshotOne API integration
│   ├── analyze.js                ← Gemini 2.5 Flash vision analysis (focus-aware)
│   ├── annotate.js               ← Claude Sonnet copywriting (focus-aware)
│   ├── render.js                 ← HTML template injection + Puppeteer
│   └── utils.js                  ← Shared helpers (file naming, cleanup, validation, focus sanitization)
├── /templates
│   └── card.html                 ← The annotation card HTML template
├── /public
│   ├── index.html                ← Web UI (URL input + optional focus hint + result preview)
│   ├── style.css                 ← Web UI styles
│   └── app.js                    ← Web UI JavaScript
└── /output
    └── .gitkeep                  ← Generated images stored here (ignored in git)
```

---

## 4. Environment Variables (.env)

```env
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

---

## 5. Full Pipeline Architecture

```
[User] enters URL + optional focus hint in Web UI
  │
  ▼
[POST /api/generate] — Express route
  Body: { url: string, focus: string | null }
  │
  ├── Step 1: SCREENSHOT
  │     └── screenshot.js
  │           └── Call screenshotOne API
  │                 - Full page screenshot
  │                 - 1200px wide viewport
  │                 - PNG format
  │                 - Returns: { buffer, base64 }
  │                 NOTE: focus hint does NOT affect screenshot
  │                 We always capture the full page regardless
  │
  ├── Step 2: VISION ANALYSIS (focus-aware)
  │     └── analyze.js
  │           └── analyzeScreenshot(base64, focus)
  │                 IF focus hint provided:
  │                   - Prompt tells Gemini to prioritize elements relevant to focus
  │                   - Ignore parts of the page unrelated to focus topic
  │                   - Return elements most useful for that specific goal
  │                 IF no focus hint:
  │                   - Prompt tells Gemini to identify most prominent UI elements
  │                   - Gemini infers the page's primary purpose
  │                   - Returns detectedFocus: its own best guess at annotation topic
  │                 - Returns: structured JSON with pageTitle, pageTopic,
  │                   detectedFocus, and elements[]
  │
  ├── Step 3: ANNOTATION COPYWRITING (focus-aware)
  │     └── annotate.js
  │           └── generateAnnotations(analysisData, focus)
  │                 IF focus hint provided:
  │                   - Claude writes title and steps tightly aligned to focus goal
  │                   - All copy frames the specific task the user described
  │                 IF no focus hint:
  │                   - Claude uses analysisData.detectedFocus to guide copy
  │                   - Writes for the page's inferred primary use case
  │                 - Returns: { cardTitle, cardSubtitle, steps[] }
  │
  ├── Step 4: RENDER
  │     └── render.js
  │           └── renderCard(annotationData, screenshotBase64, focus)
  │                 - Inject annotation data into card.html template
  │                 - Replace {{FOCUS_LABEL}} with focus hint text (or hide badge if null)
  │                 - Embed screenshot as base64 in template
  │                 - Launch Puppeteer (headless Chrome)
  │                 - Load the populated HTML via temp file
  │                 - Screenshot at 1080×1920 (9:16)
  │                 - Save to /output/{uuid}.png via Sharp
  │                 - Clean up temp file
  │
  └── Step 5: RESPOND
        └── Return { imageUrl: "/output/{uuid}.png" }

[Web UI] receives result → displays image → enables download
```

---

## 6. API Specifications

### 6.1 screenshotOne API
- **Endpoint:** `https://api.screenshotone.com/take`
- **Method:** GET with query params
- **Key params:**
  - `access_key` — from env
  - `url` — the target URL
  - `viewport_width=1200`
  - `viewport_height=800`
  - `format=png`
  - `full_page=true`
  - `block_ads=true`
  - `block_cookie_banners=true`
- **Returns:** PNG image binary
- **Note:** The focus hint does not affect the screenshot — we always capture the full page. Focus only affects how the AI interprets and annotates.
- **Docs:** https://screenshotone.com/docs/

### 6.2 Gemini 2.5 Flash (Vision Analysis — focus-aware)
- **Library:** `@google/generative-ai` npm package
- **Model:** `gemini-2.5-flash`
- **Input:** Screenshot image (base64) + text prompt (which includes focus hint if provided)
- **Function signature:** `analyzeScreenshot(base64ImageString, focus = null)`

**Prompt when focus hint IS provided:**
```
You are analyzing a webpage screenshot to extract structured annotation data.

The user wants to create a tutorial focused on: "{{FOCUS_HINT}}"

With that focus in mind, analyze this screenshot and identify the 3 to 5 UI elements
most relevant to that specific goal. Ignore elements unrelated to the focus topic.

Return a JSON object with exactly this structure:
{
  "pageTitle": "Short descriptive title of what this page/tool is",
  "pageTopic": "One sentence describing what this page does",
  "detectedFocus": "Restate the focus goal in your own words",
  "elements": [
    {
      "id": 1,
      "label": "Short element name",
      "description": "What this element is and how it relates to the focus goal",
      "position": "top-left|top-right|center|bottom-left|bottom-right|top-center|bottom-center"
    }
  ]
}

Return ONLY valid JSON. No explanation. No markdown.
```

**Prompt when NO focus hint is provided:**
```
You are analyzing a webpage screenshot to extract structured annotation data.

Analyze this screenshot and identify the 3 to 5 most important interactive or
informational elements. Focus on what makes this page useful to a first-time visitor.

Return a JSON object with exactly this structure:
{
  "pageTitle": "Short descriptive title of what this page/tool is",
  "pageTopic": "One sentence describing what this page does",
  "detectedFocus": "Your best inference of what a tutorial about this page should explain",
  "elements": [
    {
      "id": 1,
      "label": "Short element name",
      "description": "What this element is and what it does",
      "position": "top-left|top-right|center|bottom-left|bottom-right|top-center|bottom-center"
    }
  ]
}

Return ONLY valid JSON. No explanation. No markdown.
```
- **Returns:** JSON string → parse to object
- **Retry logic:** If JSON parse fails, retry once with explicit reminder to return only valid JSON. Throw after 2 failures.

### 6.3 Claude Sonnet (Annotation Copywriting — focus-aware)
- **Library:** `@anthropic-ai/sdk` npm package  
- **Model:** `claude-sonnet-4-20250514`
- **Input:** Gemini JSON output + original focus hint (if any)
- **Function signature:** `generateAnnotations(analysisData, focus = null)`

**Prompt when focus hint IS provided:**
```
You are writing copy for a social media tutorial card about a webpage.

The user's specific goal is: "{{FOCUS_HINT}}"

Here is the structured page analysis:
{{PAGE_ANALYSIS_JSON}}

Write annotation copy tightly aligned to the user's goal.
Return a JSON object with exactly this structure:
{
  "cardTitle": "Action-oriented title max 6 words — must reflect the focus goal",
  "cardSubtitle": "One line explaining exactly what this tutorial achieves",
  "steps": [
    {
      "number": 1,
      "label": "Short bold step label (2-4 words)",
      "description": "One clear sentence explaining this step toward the goal"
    }
  ]
}

Rules:
- Card title must start with a verb (e.g. "Add", "Connect", "Set Up", "Use")
- All steps must directly serve the focus goal — nothing off-topic
- Write for a non-technical audience
- Keep it punchy and clear
- Return ONLY valid JSON. No explanation. No markdown.
```

**Prompt when NO focus hint is provided:**
```
You are writing copy for a social media tutorial card about a webpage.

Here is the structured page analysis including the AI's inferred focus:
{{PAGE_ANALYSIS_JSON}}

Write annotation copy based on the detectedFocus field and the elements identified.
Return a JSON object with exactly this structure:
{
  "cardTitle": "Action-oriented title max 6 words",
  "cardSubtitle": "One line explaining what this tutorial shows",
  "steps": [
    {
      "number": 1,
      "label": "Short bold step label (2-4 words)",
      "description": "One clear sentence explaining this step"
    }
  ]
}

Rules:
- Card title must start with a verb (e.g. "Add", "Connect", "Set Up", "Use")
- Steps should be sequential and actionable
- Write for a non-technical audience
- Keep it punchy and clear
- Return ONLY valid JSON. No explanation. No markdown.
```
- **Returns:** JSON string → parse to object
- **Retry logic:** If JSON parse fails, retry once. Throw after 2 failures.

---

## 7. HTML Template Spec (card.html)

### Visual Design
- **Dimensions:** 1080px × 1920px (9:16)
- **Background:** Dark (#0D0D0D or #111111)
- **Accent color:** Hot pink (#FF2D6B) — used for numbered circles, underlines, highlights, focus badge
- **Secondary accent:** White (#FFFFFF) for headings
- **Body text:** Light gray (#CCCCCC)
- **Font:** Use Google Fonts — `DM Sans` for body, `Space Grotesk` for step labels (load via @import in template)
- **Border:** Subtle pink border around the card or screenshot area (2px solid rgba(255,45,107,0.4))

### Layout (top to bottom)
```
┌─────────────────────────────────┐
│  [FOCUS BADGE] (if provided)    │  ← Small pink pill: e.g. "How to connect Gmail"
│                                 │
│  [CARD TITLE]                   │  ← Large white bold heading (focus-aligned)
│  [pink underline divider]       │
│  [Card subtitle]                │  ← Smaller gray text (focus-aligned)
│                                 │
│  ┌─────────────────────────┐   │
│  │   [SCREENSHOT CROP]     │   │  ← Pink border box
│  │   (page screenshot)     │   │
│  └─────────────────────────┘   │
│                                 │
│  → [1] Label    Description    │  ← Steps with pink circles (focus-aligned)
│  → [2] Label    Description    │
│  → [3] Label    Description    │
│  → [4] Label    Description    │
│                                 │
│  [AnnotatorAI · source URL]     │  ← Small footer
└─────────────────────────────────┘
```

### Template Placeholders
The HTML template uses these placeholder strings that render.js will replace:
- `{{CARD_TITLE}}` — main heading (focus-aligned when hint provided)
- `{{CARD_SUBTITLE}}` — subheading (focus-aligned when hint provided)
- `{{SCREENSHOT_BASE64}}` — base64 encoded screenshot
- `{{STEPS_HTML}}` — dynamically generated step HTML blocks
- `{{PAGE_URL}}` — the source URL (shown small in footer)
- `{{FOCUS_LABEL}}` — the focus hint text for the badge (empty string when no hint)
- `{{FOCUS_BADGE_STYLE}}` — replaced with `display:none` when no focus hint, empty string when hint exists

### Step HTML Block (generated per step in render.js)
```html
<div class="step">
  <div class="step-number">{{NUMBER}}</div>
  <div class="step-content">
    <span class="step-label">{{LABEL}}</span>
    <span class="step-description">{{DESCRIPTION}}</span>
  </div>
</div>
```

### Focus Badge (conditionally shown in card header)
```html
<div class="focus-badge" style="{{FOCUS_BADGE_STYLE}}">{{FOCUS_LABEL}}</div>
```
- Style: small pill badge, pink background (#FF2D6B), white text, positioned above the card title
- When focus IS provided: badge is visible with the hint text
- When focus is NOT provided: `{{FOCUS_BADGE_STYLE}}` = `display:none`

---

## 8. Module Specifications

### 8.1 server.js
- Express app setup
- Serve `/public` as static files
- Serve `/output` as static files (for image access)
- Routes:
  - `GET /` → serve index.html
  - `POST /api/generate` → main pipeline
    - Body: `{ url: string, focus?: string }`
    - Normalize focus: trim whitespace, convert empty string to null, truncate to 100 chars via `sanitizeFocus()`
    - Pass normalized `focus` (string or null) through entire pipeline
  - `GET /api/health` → returns `{ status: "ok" }`
- Input validation: check URL is present and passes `isValidUrl()` before processing
- Error handling: catch all pipeline errors, return `{ error: message }`
- Timeout: set 60s timeout on generate route (Puppeteer can be slow)

### 8.2 screenshot.js
```javascript
// Export: async function captureScreenshot(url)
// Note: focus is NOT a parameter — screenshot always captures the full page
// Returns: { buffer: Buffer, base64: string }
// Throws on non-200 response from screenshotOne
```

### 8.3 analyze.js
```javascript
// Export: async function analyzeScreenshot(base64ImageString, focus = null)
// - Selects appropriate prompt based on whether focus is null or a string
// - If focus provided: focus-aware prompt instructs Gemini to prioritize relevant elements
// - If focus null: general prompt instructs Gemini to infer best annotation approach
// - In both cases, detectedFocus is returned in the JSON for downstream use
// Returns: { pageTitle, pageTopic, detectedFocus, elements: [...] }
// Retry logic: max 2 attempts if JSON parse fails
```

### 8.4 annotate.js
```javascript
// Export: async function generateAnnotations(analysisData, focus = null)
// - Selects appropriate prompt based on whether focus is null or a string
// - If focus provided: Claude aligns all copy tightly to the focus goal
// - If focus null: Claude uses analysisData.detectedFocus to guide copy direction
// Returns: { cardTitle, cardSubtitle, steps: [...] }
// Retry logic: max 2 attempts if JSON parse fails
```

### 8.5 render.js
```javascript
// Export: async function renderCard(annotationData, screenshotBase64, focus = null)
// - Reads card.html template from /templates/card.html
// - Replaces all {{PLACEHOLDERS}}:
//     {{CARD_TITLE}} → annotationData.cardTitle
//     {{CARD_SUBTITLE}} → annotationData.cardSubtitle
//     {{SCREENSHOT_BASE64}} → screenshotBase64
//     {{STEPS_HTML}} → generated HTML string from annotationData.steps
//     {{PAGE_URL}} → the source URL (passed from server)
//     {{FOCUS_LABEL}} → focus string if provided, else empty string
//     {{FOCUS_BADGE_STYLE}} → '' if focus provided, 'display:none' if null
// - Writes populated HTML to a temp file in /output/temp_{uuid}.html
// - Launches Puppeteer with Linux VPS-safe flags
// - Sets viewport to 1080x1920
// - Navigates to temp file URL
// - Takes screenshot, saves to /output/{uuid}.png
// - Runs through Sharp for optimization
// - Deletes temp HTML file
// - Closes Puppeteer browser instance
// Returns: { filename: string, filepath: string }
```

### 8.6 utils.js
```javascript
// generateId() → returns uuid v4 string
// ensureOutputDir() → creates /output if not exists, called on server startup
// cleanupOldFiles() → deletes output files older than 1 hour, called on server startup
// isValidUrl(string) → returns boolean, validates URL format and http/https scheme
// sanitizeFocus(focus) → trims whitespace; returns null if empty/missing; truncates to 100 chars max
```

---

## 9. Web UI Specification (public/index.html)

### Design
- Dark background matching card output style (#0D0D0D)
- Centered single-column layout, max-width 600px
- Large heading: "AnnotatorAI"
- Subtitle: "Paste any URL. Get an annotated visual. Instantly."
- **Input 1 — URL (required):**
  - Large text input
  - Placeholder: `https://example.com`
  - Label: "URL"
- **Input 2 — Focus Hint (optional):**
  - Text input below URL field
  - Label: "Focus (optional)"
  - Placeholder: `e.g. How to connect Gmail, Setting up API keys`
  - Helper text below: `Leave blank and AI will decide what to annotate`
- Button: "Generate" — hot pink (#FF2D6B) background, white text, full width
- Loading state: Animated spinner with step-by-step status text:
  - "📸 Capturing screenshot..."
  - "🔍 Analyzing page..."
  - "✍️ Writing annotations..."
  - "🎨 Rendering image..."
- Result section: Generated image displayed full-width with a "Download Image" button below
- Error state: Red-bordered box with error message text
- Focus badge visible on the output image (if hint was provided) gives visual confirmation the hint was used

### JavaScript (app.js) behavior
1. On form submit: read both `url` and `focus` field values
2. Validate URL client-side — show inline error if empty or invalid format
3. POST to `/api/generate` with `{ url, focus }` — send focus as empty string if blank (server normalizes)
4. Show loading spinner, update status text at each ~5s interval to simulate progress stages
5. Disable Generate button during processing
6. On success: hide spinner, show image + Download button, re-enable button
7. On error: hide spinner, show error message, re-enable button
8. Download button: uses `<a download>` to trigger browser file download

---

## 10. Hostinger VPS Deployment Instructions

Claude Code should generate a `README.md` with these exact steps:

```bash
# 1. SSH into Hostinger VPS
ssh root@your-vps-ip

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install Chromium for Puppeteer
sudo apt-get install -y chromium-browser

# 4. Install PM2
npm install -g pm2

# 5. Clone or upload project
git clone your-repo-url /var/www/annotatorai
cd /var/www/annotatorai

# 6. Install dependencies
npm install

# 7. Set up environment variables
cp .env.example .env
nano .env  # fill in all API keys

# 8. Start with PM2
pm2 start server.js --name annotatorai
pm2 save
pm2 startup

# 9. (Optional) Nginx reverse proxy on port 80
# Point domain to VPS IP, set up nginx to proxy to localhost:3000
```

### Puppeteer on Linux VPS — important config
In render.js, Puppeteer must launch with these args:
```javascript
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ],
  executablePath: '/usr/bin/chromium-browser' // Hostinger VPS path
});
```

---

## 11. package.json Dependencies

```json
{
  "name": "annotatorai",
  "version": "1.0.0",
  "description": "URL to annotated visual image generator",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "@google/generative-ai": "^0.21.0",
    "@anthropic-ai/sdk": "^0.39.0",
    "puppeteer": "^22.0.0",
    "sharp": "^0.33.0",
    "uuid": "^9.0.0",
    "axios": "^1.6.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

---

## 12. Error Handling Strategy

- All pipeline steps wrapped in try/catch
- If screenshotOne fails: return error "Could not capture screenshot. Check the URL is publicly accessible."
- If Gemini analysis fails or returns invalid JSON: retry once, then return error "Page analysis failed."
- If Claude annotation fails or returns invalid JSON: retry once, then return error "Annotation generation failed."
- If Puppeteer render fails: return error "Image rendering failed."
- Focus hint issues: if focus hint is too long, `sanitizeFocus()` truncates silently — the pipeline never fails because of the hint
- If focus hint is provided but Gemini can't find relevant elements: Gemini falls back to general elements — no special handling needed, just let it proceed
- All errors logged to console with timestamp and input URL
- `/output` directory auto-created on startup if missing
- Old output files (>1 hour) cleaned up on startup to save disk space

---

## 13. Judging Criteria Checklist

Claude Code should keep these in mind throughout the build:

| Criterion | How we address it |
|---|---|
| **Output quality** | Professional dark-themed HTML template at 1080×1920 via Puppeteer; focus hint ensures annotations are always relevant |
| **Repeatable on any URL** | Works on any publicly accessible URL; optional focus hint handles ambiguous or complex pages gracefully |
| **Documentation & Clarity** | Clean README with install + deploy steps; .env.example included; focus hint feature explained |
| **Workflow efficiency** | URL + optional one-line focus hint → single annotated image, no manual steps |
| **Implementation cost** | ~$0.03–0.05 per run (screenshotOne + Gemini 2.5 Flash + Claude Sonnet combined) |

---

## 14. Instructions for Claude Code

When starting a Claude Code session, paste this prompt:

```
Read this entire document carefully before writing any code.

Build the complete AnnotatorAI project exactly as specified in this brief.
Follow this build order:

1. Create the full folder structure as specified in Section 3
2. Create package.json (Section 11) and run npm install
3. Create .env.example with all keys from Section 4
4. Build utils.js — include all 5 functions especially sanitizeFocus() (Section 8.6)
5. Build screenshot.js — no focus parameter, always full page (Section 8.2)
6. Build analyze.js — implement BOTH prompt variants with and without focus hint (Section 6.2 + 8.3)
7. Build annotate.js — implement BOTH prompt variants with and without focus hint (Section 6.3 + 8.4)
8. Build render.js — handle all 7 template placeholder replacements including focus badge logic (Section 8.5)
9. Build card.html template — visually stunning dark theme, pink accents, focus badge element (Section 7)
10. Build server.js — accept url and focus, normalize focus via sanitizeFocus(), pass through pipeline (Section 8.1)
11. Build the web UI: index.html, style.css, app.js — two input fields, loading states, download (Section 9)
12. Create README.md with full deployment instructions from Section 10

After building, run a full code review pass:
- Confirm focus flows correctly: server → analyze(focus) → annotate(focus) → render(focus)
- Confirm focus=null is handled gracefully in ALL modules with no crashes
- Confirm all 7 {{PLACEHOLDERS}} in card.html are replaced in render.js
- Confirm {{FOCUS_BADGE_STYLE}} is 'display:none' when focus is null
- Confirm Puppeteer has all 4 Linux VPS flags and correct executablePath
- Confirm all env vars use process.env via dotenv
- Confirm error handling exists in all modules with meaningful messages
- Confirm sanitizeFocus() truncates at 100 chars and returns null for empty input

Then run the app locally and test these two scenarios:
1. POST /api/generate with { url: "https://claude.ai" } — no focus hint
   → Confirm AI infers a sensible annotation topic on its own
2. POST /api/generate with { url: "https://claude.ai", focus: "How to add connectors" }
   → Confirm output is tightly aligned to connector setup steps
```

---

## 15. Submission Checklist (April 5 Deadline)

- [ ] App deployed and live on Hostinger VPS
- [ ] Tested with URL only (no focus hint) — at least 3 different URLs
- [ ] Tested with URL + focus hint — at least 3 different URLs
- [ ] Demo video shows BOTH modes — this is more impressive to judges than showing one
- [ ] Demo video is 1–3 minutes
- [ ] 100–300 word project writeup ready — mention the dual-mode (auto vs focused) as a key feature
- [ ] Submit via: https://forms.gle/vxXiSSFHE8o9oWxx6
- [ ] Hosting on Hostinger confirmed (not elsewhere)

---

*Built for the Hostinger Hackathon (March 2026) — Agentic Academy / Scrapes.ai community*
