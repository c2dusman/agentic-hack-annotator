# Architecture Research

**Domain:** Automated URL-to-annotated-image generation pipeline
**Researched:** 2026-04-04
**Confidence:** HIGH (pipeline shape is fully specified; patterns are well-established)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  public/index.html  (URL input, focus hint, preview UI)  │   │
│  │  public/app.js      (fetch POST, loading state, download) │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼────────────────────────────────────┘
                              │  POST /api/generate
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        SERVER LAYER (Express)                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  server.js  (static serving, route mounting, PM2 entry) │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                      │
│  ┌────────────────────────▼────────────────────────────────┐    │
│  │  routes/generate.js  (POST /api/generate handler)       │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │  calls pipeline services in order    │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               ORCHESTRATION LAYER                        │   │
│  │  services/pipeline.js  (sequential step runner)          │   │
│  │                                                          │   │
│  │   [1] screenshot  →  [2] vision  →  [3] copy  →         │   │
│  │   [4] render      →  [5] optimize  →  [6] cleanup       │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              │  each step is an isolated service
         ┌────────────────────┼────────────────────────────┐
         ▼                    ▼                            ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│ EXTERNAL APIs   │  │ HEADLESS RENDER │  │   LOCAL FILESYSTEM  │
│                 │  │                 │  │                     │
│ screenshotOne   │  │ Puppeteer       │  │ /tmp/annotator/     │
│ Gemini 2.5 Flash│  │ (HTML→PNG)      │  │   <uuid>.png        │
│ Claude Sonnet   │  │ Sharp (optimize)│  │   (TTL: 1 hour)     │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `public/index.html` | URL + focus hint form, loading overlay, image preview, download button | Vanilla HTML/CSS |
| `public/app.js` | POST to `/api/generate`, poll or await response, render result | Vanilla JS fetch |
| `server.js` | Express bootstrap, static middleware, route mounting, PM2 entry point | Node.js + Express 5 |
| `routes/generate.js` | Validates request body, calls pipeline, streams or returns image path | Express router |
| `services/screenshot.js` | Calls screenshotOne API with URL + viewport params, returns image buffer or URL | Node.js fetch / axios |
| `services/vision.js` | Sends screenshot buffer to Gemini 2.5 Flash, returns structured JSON (title, annotations, focus context) | Google AI SDK |
| `services/copy.js` | Sends vision JSON + focus hint to Claude Sonnet, returns annotation copy strings | Anthropic SDK |
| `services/render.js` | Injects copy into HTML template, launches Puppeteer, captures 1080x1920 PNG, returns file path | Puppeteer |
| `services/optimize.js` | Runs Sharp on Puppeteer output PNG, compresses, returns final file path | Sharp |
| `services/cleanup.js` | Schedules `setTimeout` deletion of output files after 1 hour | Node.js built-in |
| `templates/card.html` | Dark-themed 1080x1920 HTML layout with CSS variables for injected content | Handlebars or string interpolation |

## Recommended Project Structure

```
/
├── server.js                  # Express entry point, PM2 target
├── package.json
├── .env                       # API keys (screenshotOne, Gemini, Anthropic)
├── ecosystem.config.js        # PM2 config
│
├── public/                    # Static frontend (served by Express)
│   ├── index.html
│   ├── app.js
│   └── styles.css
│
├── routes/
│   └── generate.js            # POST /api/generate
│
├── services/                  # One file per pipeline step
│   ├── screenshot.js          # screenshotOne API call
│   ├── vision.js              # Gemini 2.5 Flash vision analysis
│   ├── copy.js                # Claude Sonnet annotation writing
│   ├── render.js              # Puppeteer HTML-to-PNG
│   ├── optimize.js            # Sharp compression
│   └── cleanup.js             # TTL file deletion
│
├── templates/
│   └── card.html              # 1080x1920 dark-theme card layout
│
└── tmp/                       # Runtime output images (gitignored)
```

### Structure Rationale

- **services/:** One service per pipeline stage enforces clean boundaries. Each service takes typed input and returns typed output. This makes it trivial to swap any single step (e.g., replace screenshotOne with Puppeteer capture) without touching others.
- **routes/:** Thin route handler. All business logic lives in services. Route is responsible only for request validation and response serialization.
- **templates/:** Separated from services so the HTML card design can be edited without touching rendering logic.
- **tmp/:** Runtime artifact directory. Never committed. Cleanup service targets this directory.

## Architectural Patterns

### Pattern 1: Sequential Pipeline with Explicit Data Contracts

**What:** Each service function takes a well-defined input object and returns a well-defined output object. The route handler (or a pipeline.js coordinator) calls them in order, passing results forward.

**When to use:** When steps are inherently ordered and each step depends on the previous step's output. This is the correct pattern for AnnotatorAI — screenshot must complete before vision, vision must complete before copy, copy must complete before render.

**Trade-offs:** Simple to reason about and debug. No parallelism possible within a single request (acceptable here — steps are sequential by nature). Total latency is the sum of all step latencies.

**Example:**
```javascript
// services/pipeline.js
async function runPipeline({ url, focusHint }) {
  const screenshot = await captureScreenshot(url);          // step 1
  const visionData = await analyzeWithGemini(screenshot, focusHint); // step 2
  const copy       = await writeWithClaude(visionData, focusHint);   // step 3
  const rawPng     = await renderCard(copy, visionData);   // step 4
  const finalPng   = await optimizeImage(rawPng);          // step 5
  scheduleCleanup(finalPng, 60 * 60 * 1000);               // step 6 (non-blocking)
  return finalPng;
}
```

### Pattern 2: Retry Wrapper per External Call

**What:** Each external API call (screenshotOne, Gemini, Claude) is wrapped with a retry function that catches transient failures and retries with exponential backoff up to N attempts before propagating the error.

**When to use:** Any call to a third-party API. Network blips, rate limits, and cold starts are common. A single retry often recovers these.

**Trade-offs:** Adds latency on failure paths. Must not retry non-recoverable errors (e.g., 400 Bad Request from bad user input). Cap retries at 2-3 to avoid runaway cost on AI calls.

**Example:**
```javascript
async function withRetry(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts || isNonRetryable(err)) throw err;
      await sleep(attempt * 1000); // 1s, 2s backoff
    }
  }
}
```

### Pattern 3: UUID-Scoped Temp Files

**What:** Each generation request gets a UUID as a job ID. All intermediate and output files are named `<uuid>.png` and stored in `/tmp/annotator/`. Cleanup is tied to the UUID.

**When to use:** Stateless server with no database. Concurrent requests must not overwrite each other's files. This pattern is trivially correct — no locking required.

**Trade-offs:** Disk fills up if cleanup fails. Mitigate with a startup sweep that deletes files older than 2 hours as a safety net.

## Data Flow

### Request Flow

```
Browser (POST /api/generate { url, focusHint })
    |
    v
routes/generate.js
    | - Validates url is present and a valid URL
    | - Passes { url, focusHint } to pipeline
    v
services/pipeline.js  [orchestrates steps 1-6]
    |
    |--[1]--> services/screenshot.js
    |           GET screenshotOne API → returns PNG buffer
    |
    |--[2]--> services/vision.js
    |           POST Gemini 2.5 Flash (image + focus prompt)
    |           returns: { pageTitle, mainTopic, annotations[], inferredFocus }
    |
    |--[3]--> services/copy.js
    |           POST Claude Sonnet (visionJSON + focusHint)
    |           returns: { headline, subheadline, steps[], callout }
    |
    |--[4]--> services/render.js
    |           Injects copy into card.html string
    |           Puppeteer: launch → setContent → screenshot(1080x1920) → close
    |           returns: /tmp/annotator/<uuid>.png
    |
    |--[5]--> services/optimize.js
    |           Sharp: read PNG → compress → write optimized PNG
    |           returns: /tmp/annotator/<uuid>-final.png
    |
    |--[6]--> services/cleanup.js
    |           setTimeout(1 hour) → unlink file
    |
    v
routes/generate.js
    | - Reads final PNG as buffer
    | - Returns: 200 { imageUrl: "/output/<uuid>-final.png" }
    |   OR: streams binary image directly
    v
Browser renders <img> preview, enables download button
```

### Error Flow

```
Any step throws
    |
    v
pipeline.js propagates error
    |
    v
routes/generate.js catch block
    | - Logs full error server-side
    | - Returns 500 { error: "human-readable message" }
    v
app.js displays error state to user
```

### Key Data Flows

1. **Screenshot buffer:** `screenshotOne API response` → in-memory Buffer → passed to Gemini. Never written to disk. Keeps temp storage clean.
2. **Vision JSON:** Gemini structured JSON response → JavaScript object → passed directly to Claude prompt as serialized JSON string.
3. **Copy object:** Claude response parsed to JS object → injected into HTML template string via string interpolation or a minimal templating call.
4. **PNG file:** Puppeteer writes to `/tmp/annotator/<uuid>.png` → Sharp reads it and writes `/tmp/annotator/<uuid>-final.png` → route reads final file → cleanup deletes both after 1 hour.

## Build Order (Phase Dependencies)

Build in this order — each step unblocks the next:

```
1. Server scaffold           server.js + Express + static serving
        |
        v
2. Screenshot service        screenshotOne API integration, test with known URL
        |
        v
3. Vision service            Gemini API integration, test with screenshot buffer
        |
        v
4. Copy service              Claude API integration, test with mock vision JSON
        |
        v
5. HTML template             card.html dark-theme layout, verify in browser
        |
        v
6. Render service            Puppeteer + template injection, verify PNG output
        |
        v
7. Optimize service          Sharp pipeline, verify file size reduction
        |
        v
8. Route + pipeline wiring   Connect all services in generate.js
        |
        v
9. Frontend UI               Form, loading, preview, download
        |
        v
10. Cleanup + error handling  TTL deletion, retry wrappers, user-facing errors
        |
        v
11. VPS deployment           PM2 + environment variables + smoke test
```

Services 3 and 4 (vision and copy) can be developed with mock inputs while waiting for screenshot to work correctly — this parallelizes development effort even though the runtime pipeline is sequential.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-10 concurrent users | Current design is sufficient. Single PM2 instance. Sequential pipeline per request. |
| 10-50 concurrent users | Add PM2 cluster mode (fork across CPU cores). Each request still sequential. Add request timeout (120s) to prevent request pile-up. |
| 50+ concurrent users | Puppeteer is the bottleneck — single browser launch per request is expensive. Move to a Puppeteer browser pool (puppeteer-cluster or generic-pool). Extract render step to a worker process. |
| 500+ concurrent users | Move to a job queue (BullMQ + Redis). Decouple HTTP response from pipeline execution. Return job ID immediately, poll or webhook for result. |

**First bottleneck for AnnotatorAI:** Puppeteer. Each request launches a browser, which is slow (~1-2s) and memory-heavy (~100-150MB). For hackathon scale this is fine. For production, use a persistent browser instance and a page pool.

**Second bottleneck:** AI API rate limits. Both Gemini and Claude have per-minute token limits. Retry logic handles transient cases. At volume, implement a request queue with concurrency cap.

## Anti-Patterns

### Anti-Pattern 1: Importing Puppeteer at Request Time and Launching per Step

**What people do:** `const puppeteer = require('puppeteer')` inside the render function, calling `puppeteer.launch()` on every request.

**Why it's wrong:** Browser launch overhead adds 1-2 seconds per request. Memory spikes. If multiple concurrent requests arrive, multiple browser instances compete for RAM, crashing the VPS.

**Do this instead:** Launch one browser instance at server startup, keep it alive, create and close only Pages per request. Wrap in a try/finally to close the page even on error.

```javascript
// server.js startup
const browser = await puppeteer.launch({ args: ['--no-sandbox', ...] });
app.locals.browser = browser;

// services/render.js
const page = await req.app.locals.browser.newPage();
try {
  // ... render logic
} finally {
  await page.close();
}
```

### Anti-Pattern 2: Storing Gemini/Claude Responses as Raw Text, Parsing in the Route

**What people do:** Return raw AI response strings to the route handler, parse JSON in the controller.

**Why it's wrong:** Parsing logic is duplicated or scattered. AI responses are non-deterministic — malformed JSON causes unhandled crashes at the route level, not at the service boundary where the error belongs.

**Do this instead:** Parse and validate the structured response inside the service. Throw a typed error if parsing fails. The route receives a clean JS object or a clean error.

### Anti-Pattern 3: Writing Screenshot Buffer to Disk Before Sending to Gemini

**What people do:** `fs.writeFileSync('/tmp/screenshot.png', buffer)` then read it back to send to Gemini.

**Why it's wrong:** Unnecessary disk I/O, risk of filename collision on concurrent requests, more cleanup surface area.

**Do this instead:** Pass the Buffer directly to the Gemini SDK's inline image input. The SDK accepts raw bytes. No disk write needed for the input screenshot.

### Anti-Pattern 4: Blocking the Event Loop During Puppeteer Render

**What people do:** Use synchronous file operations (`fs.readFileSync`) to load the HTML template inside the render service.

**Why it's wrong:** Blocks Node.js event loop during an already-expensive Puppeteer operation. Other requests queue behind it.

**Do this instead:** Load the template file once at module initialization (`const template = fs.readFileSync(...)` at the top of render.js, outside the exported function). Template is in memory for all subsequent requests.

## Integration Points

### External Services

| Service | Integration Pattern | Key Configuration | Notes |
|---------|---------------------|-------------------|-------|
| screenshotOne API | HTTPS GET with query params (access_key, url, viewport_width, full_page) | `SCREENSHOT_ONE_KEY` env var | Returns PNG binary; pass as Buffer to Gemini. Use `response_type=image` param. |
| Gemini 2.5 Flash | `@google/generative-ai` SDK, `generateContent()` with inline image part | `GEMINI_API_KEY` env var | Set `responseMimeType: 'application/json'` to force structured output. Specify schema in prompt. |
| Claude Sonnet | `@anthropic-ai/sdk`, `messages.create()` | `ANTHROPIC_API_KEY` env var | Pass vision JSON as user message content. System prompt defines annotation style. Max tokens ~800 for copy output. |
| Puppeteer | Local headless Chromium, launched once at startup | `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage` flags required for Linux VPS | `page.setViewport({width:1080, height:1920})` then `page.screenshot({type:'png'})` |
| Sharp | Local libvips binding, no external calls | None | Chain: `sharp(inputPath).png({quality:85}).toFile(outputPath)` |

### Internal Boundaries

| Boundary | Communication | Contract |
|----------|---------------|----------|
| route → pipeline | Direct async function call | `runPipeline({ url: string, focusHint?: string })` → `{ filePath: string }` |
| pipeline → each service | Direct async function call | Each service has one exported async function with typed input/output |
| render service → template | In-memory string | Template loaded at module init, interpolated per request |
| pipeline → cleanup | Fire-and-forget `setTimeout` | No return value; errors logged but do not affect response |
| route → frontend | JSON response body | `{ imageUrl: string }` on success, `{ error: string }` on failure |

## Puppeteer VPS Flags (Critical)

These flags are required on Ubuntu 22.04 VPS — omitting them causes Puppeteer to crash silently:

```javascript
puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',      // /dev/shm is too small on most VPS
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process'              // optional: reduces memory on low-RAM VPS
  ]
});
```

## Sources

- Express 5 async middleware: [https://expressjs.com/en/api.html](https://expressjs.com/en/api.html) (HIGH confidence — official docs)
- Express controller/service pattern: [https://thelinuxcode.com/expressjs-tutorial-2026-practical-scalable-patterns-for-real-projects/](https://thelinuxcode.com/expressjs-tutorial-2026-practical-scalable-patterns-for-real-projects/) (MEDIUM confidence)
- Puppeteer screenshot pipeline: [https://www.bannerbear.com/blog/how-to-take-screenshots-with-puppeteer/](https://www.bannerbear.com/blog/how-to-take-screenshots-with-puppeteer/) (HIGH confidence — directly applicable)
- Puppeteer headless Node.js 2026: [https://www.zenrows.com/blog/headless-browser-nodejs](https://www.zenrows.com/blog/headless-browser-nodejs) (MEDIUM confidence)
- Sharp image processing pipeline: [https://sharp.pixelplumbing.com/](https://sharp.pixelplumbing.com/) (HIGH confidence — official docs)
- Sharp GitHub: [https://github.com/lovell/sharp](https://github.com/lovell/sharp) (HIGH confidence)
- Gemini image understanding: [https://ai.google.dev/gemini-api/docs/image-understanding](https://ai.google.dev/gemini-api/docs/image-understanding) (HIGH confidence — official docs)
- screenshotOne Node.js SDK: [https://screenshotone.com/screenshot-api/nodejs/](https://screenshotone.com/screenshot-api/nodejs/) (HIGH confidence — official docs)
- PM2 deployment on VPS: [https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/](https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/) (HIGH confidence — official docs)
- Express timeout handling: [https://betterstack.com/community/guides/scaling-nodejs/nodejs-timeouts/](https://betterstack.com/community/guides/scaling-nodejs/nodejs-timeouts/) (MEDIUM confidence)
- Multi-AI orchestration patterns: [https://dev.to/ji_ai/building-a-multi-agent-llm-orchestrator-with-claude-code-86-sessions-of-hard-won-lessons-13n6](https://dev.to/ji_ai/building-a-multi-agent-llm-orchestrator-with-claude-code-86-sessions-of-hard-won-lessons-13n6) (MEDIUM confidence)

---
*Architecture research for: Automated URL-to-annotated-image pipeline (AnnotatorAI)*
*Researched: 2026-04-04*
