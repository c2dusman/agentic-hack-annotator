# Pitfalls Research

**Domain:** Automated URL-to-annotated-image pipeline (screenshot + AI vision + Puppeteer render)
**Researched:** 2026-04-04
**Confidence:** HIGH (Puppeteer/Linux issues), HIGH (AI JSON parsing), MEDIUM (screenshotOne edge cases)

---

## Critical Pitfalls

### Pitfall 1: Puppeteer Crashes on Linux VPS Without Proper Sandbox Flags

**What goes wrong:**
Chromium exits immediately with "No usable sandbox!" on Ubuntu VPS environments. The process never renders the HTML template. If running as root (common on VPS initial setups), this happens even when the flag feels like it should work.

**Why it happens:**
Ubuntu 22.04+ ships AppArmor profiles that block Chrome's user namespace sandbox. On many VPS environments the kernel doesn't expose the required namespaces to unprivileged processes. Developers test on macOS where sandboxing works fine, then deploy to Linux where it silently fails.

**How to avoid:**
Always launch Puppeteer with the full set of required Linux flags:

```js
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process',   // reduces memory on constrained VPS
  ],
});
```

`--disable-dev-shm-usage` is critical — `/dev/shm` on many VPS providers is only 64MB, causing random crashes mid-render that look like memory leaks.

**Warning signs:**
- Puppeteer exits with error code 127 or "No usable sandbox!"
- Works locally on macOS, fails on VPS
- Chrome process appears in `ps aux` then vanishes in under 1 second
- Logs show "Running as root without --no-sandbox is not supported"

**Phase to address:**
VPS deployment setup — before any HTML rendering is wired up. Validate with a minimal `hello world` screenshot on the VPS before connecting the full pipeline.

---

### Pitfall 2: Google Fonts Fail to Load in Headless Chromium (Blank/Fallback Text)

**What goes wrong:**
The HTML template uses a Google Fonts `@import` or `<link>` tag. On local macOS the font loads beautifully. On the Linux VPS the output image uses the system fallback font (typically DejaVu or Liberation Sans), producing ugly, mismatched typography.

**Why it happens:**
Two compounding issues:
1. Google Fonts CDN inspects the `User-Agent` header. Headless Chromium's UA may receive a different font format or be blocked outright.
2. The screenshot is taken before the font stylesheet has been fetched and applied (network idle isn't guaranteed for cross-origin requests).

Additionally, Ubuntu 22.04 minimal images have very few fonts installed. Even if the CDN request succeeds, the font may not render correctly without the right system font packages.

**How to avoid:**
Embed the font directly in the HTML template using base64 or a local file path instead of a CDN URL:

```html
<style>
  @font-face {
    font-family: 'Inter';
    src: url('data:font/woff2;base64,...') format('woff2');
  }
</style>
```

Alternatively, download the font files to the VPS and reference them via absolute file path. Also add `--font-render-hinting=none` to Puppeteer args for consistent kerning.

As a safety net, use `page.waitForNetworkIdle()` after `page.setContent()` before taking the screenshot.

**Warning signs:**
- Output images use system serif/sans-serif instead of designed font
- Local output looks correct, VPS output looks wrong
- Font name in CSS is correct but rendered glyphs differ

**Phase to address:**
HTML template rendering milestone. Test on VPS (not just locally) as part of the rendering verification step.

---

### Pitfall 3: AI Returns JSON Wrapped in Markdown Code Fences

**What goes wrong:**
`JSON.parse()` throws because Gemini or Claude wraps the JSON in ` ```json ... ``` ` even when instructed not to. The pipeline crashes with an unhandled parse error.

**Why it happens:**
Both Gemini and Claude are trained to be "helpful" and often treat JSON responses as code blocks for readability. Even setting `response_mime_type: "application/json"` on Gemini reduces but doesn't eliminate this behavior. Claude similarly sometimes adds prose context around JSON.

**How to avoid:**
Never call `JSON.parse()` directly on raw AI output. Always sanitize first:

```js
function extractJSON(rawText) {
  let text = rawText.trim();
  // Strip markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1].trim();
  return JSON.parse(text);
}
```

Also use `responseSchema` with Gemini's structured output feature to constrain the schema at the API level — this catches shape errors before your code sees the response.

For Claude, use explicit JSON-only system prompts: "Respond with only a valid JSON object. No explanation. No markdown. No surrounding text."

**Warning signs:**
- `SyntaxError: Unexpected token` followed by text starting with a backtick
- Intermittent parse failures (1 in 10 requests) that don't reproduce reliably
- Logs show `rawText` starting with "Here is the JSON..." or "```json"

**Phase to address:**
AI integration milestone. Build the sanitizer before connecting any downstream code that consumes the JSON.

---

### Pitfall 4: Puppeteer Browser Instance Not Closed on Error Path

**What goes wrong:**
A Chromium process is launched for each render request. When an error occurs mid-render (font timeout, template error, etc.), the `catch` block exits without calling `browser.close()`. Over time, dozens of orphaned Chromium processes accumulate, consuming 100–200MB each, eventually triggering the Linux OOM killer and crashing the entire Node.js process.

**Why it happens:**
Developers write the happy path first. The `browser.close()` call is in the `try` block. When an exception fires, the `catch` block runs but `browser` may be in scope and closeable. This is the #1 reported Puppeteer production issue in 2026.

**How to avoid:**
Always use `try/finally` — never `try/catch` alone for browser lifecycle:

```js
let browser;
try {
  browser = await puppeteer.launch({ ... });
  const page = await browser.newPage();
  // ... render work
} finally {
  if (browser) await browser.close().catch(() => {});
}
```

Additionally, configure PM2 with `max_memory_restart: '800M'` to auto-restart if memory grows past a threshold. This is the safety net, not the primary fix.

**Warning signs:**
- `ps aux | grep chrome` shows growing number of chromium processes
- Node.js memory in PM2 (`pm2 monit`) climbs steadily without plateau
- OOM kill events in `/var/log/syslog`
- VPS becomes unresponsive after a few dozen requests

**Phase to address:**
Puppeteer render module implementation. Add `finally` blocks on day one, not as a hotfix.

---

### Pitfall 5: screenshotOne Returns a Valid 200 with a Blank/Error Image

**What goes wrong:**
The API call succeeds (HTTP 200), the binary response is saved as a PNG, but the image shows a browser error page, a Cloudflare challenge page, or an all-white blank. Downstream, Gemini analyzes this "error image" and hallucinates fake annotations about it.

**Why it happens:**
screenshotOne treats "we rendered the page" as success even if the page itself rendered an error. Login walls, Cloudflare bot challenges, JavaScript-only SPAs that don't SSR, and pages with long lazy-load delays all produce this outcome. The API has no way to know if the visual content is meaningful.

**How to avoid:**
After receiving the screenshot binary, check its dimensions and average pixel density before passing to Gemini. A page that rendered correctly will almost never be near-monochrome. Implement a simple check:

```js
const meta = await sharp(buffer).metadata();
if (meta.width < 100 || meta.height < 100) throw new Error('Screenshot too small');

const stats = await sharp(buffer).stats();
const avgBrightness = stats.channels[0].mean; // rough proxy
if (avgBrightness > 250) throw new Error('Screenshot appears blank (white page)');
```

Also handle the screenshotOne timeout error (HTTP 422) explicitly — this occurs when the target page exceeds 60 seconds load time.

**Warning signs:**
- Gemini returns annotations about "error messages" or "page not found"
- Output images annotate a white or near-white screenshot
- High timeout error rate on certain URL categories (news paywalls, dashboards)

**Phase to address:**
screenshotOne integration milestone. Add image validation as a gate before the Gemini call.

---

### Pitfall 6: Concurrent Requests Fill /tmp and Crash the Process

**What goes wrong:**
Each pipeline run writes a screenshot PNG and a final output PNG to `/tmp` or a local `output/` directory. If the cleanup job fails, or two requests run simultaneously and the cleanup timer races, the disk fills up. On a Hostinger entry VPS (20–40GB SSD), a few hundred 1–2MB images can exhaust available inodes or space.

**Why it happens:**
The 1-hour cleanup (specified in PROJECT.md) uses a `setTimeout` that is garbage-collected if the process restarts. PM2 restarts after OOM kill. The timer disappears. Files accumulate indefinitely.

**How to avoid:**
Use a scheduled cleanup job (`node-cron`) that runs independently of request-scoped timers:

```js
import cron from 'node-cron';
cron.schedule('*/15 * * * *', () => {
  const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour
  fs.readdirSync(OUTPUT_DIR).forEach(file => {
    const fullPath = path.join(OUTPUT_DIR, file);
    const stat = fs.statSync(fullPath);
    if (stat.mtimeMs < cutoff) fs.unlinkSync(fullPath);
  });
});
```

Also add a disk-space guard before each request: if available space drops below 500MB, reject the request with a 503 and alert in logs.

**Warning signs:**
- `df -h` shows output directory growing across PM2 restarts
- `ENOSPC: no space left on device` in error logs
- Older files accumulating beyond 1 hour age

**Phase to address:**
File management and cleanup module. Implement cron-based cleanup before going live, not post-launch.

---

### Pitfall 7: AI Pipeline Calls Are Sequential — Total Latency Stacks to 30+ Seconds

**What goes wrong:**
Gemini vision call (8–15s) + Claude copy call (5–10s) + screenshotOne (5–10s) + Puppeteer render (3–8s) = 21–43 seconds of wall time. Users stare at a spinner and abandon the page.

**Why it happens:**
The natural implementation is `await` each step sequentially. The calls are treated as dependent even when they don't need to be. Specifically, screenshotOne and Gemini/Claude are often written as three serial awaits.

**How to avoid:**
screenshotOne must complete before Gemini (Gemini needs the image), so that sequence is unavoidable. But Gemini and Claude can be pipelined: start Claude as soon as Gemini's structural analysis is complete, passing the structural data without waiting for optional enrichment fields. Also use `Promise.all` for any independent metadata fetches.

The primary latency win is reducing wait time within each AI call by keeping prompts tight and temperature low (0.1–0.2 for JSON tasks).

**Warning signs:**
- Total request time consistently over 25 seconds in server logs
- Users reporting "timeout" errors before the result appears
- Express request timeout (default 120s) being hit

**Phase to address:**
End-to-end integration milestone. Profile each step's latency before launch and optimize the 2–3 slowest steps.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `browser.close()` only in happy path | Simpler code | Orphaned Chromium processes, OOM crash | Never |
| Direct `JSON.parse()` on AI output | Less code | Intermittent crashes on markdown-fenced responses | Never |
| `setTimeout` for file cleanup | Simpler than cron | Files survive process restarts, disk fills | Never in production |
| Hard-coded Google Fonts CDN URL | Easy template | Fonts break on Linux headless, ugly fallback | Only in local dev |
| Single Puppeteer launch per app startup | Faster render | Shared browser state, memory accumulation across requests | Only if page isolation via contexts is implemented |
| No screenshot validation before Gemini | Fewer API calls | Gemini analyzes error pages, produces nonsense output | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| screenshotOne | Passing the URL directly without encoding it | `encodeURIComponent(url)` before appending to query string |
| screenshotOne | Not handling HTTP 422 Timeout Error | Catch 4xx, surface user-friendly "page took too long to load" message |
| Gemini API | Using temperature 1.0 for JSON generation | Set temperature to 0.1 for structured output, reduces schema violations |
| Gemini API | Not setting `responseMimeType: 'application/json'` | Always set, reduces (but doesn't eliminate) markdown-wrapped responses |
| Claude API | Not constraining output in system prompt | Explicitly say "respond with only a JSON object, no markdown, no prose" |
| Puppeteer | Using `page.goto(htmlString)` instead of `page.setContent()` | Use `page.setContent(html, { waitUntil: 'networkidle0' })` for template rendering |
| Puppeteer | Not awaiting `page.waitForNetworkIdle()` after `setContent` | Fonts from CDN may not have loaded; add an explicit network idle wait |
| Sharp | Processing Puppeteer PNG then immediately unlinking | Sharp uses streaming; unlink only after the Sharp pipeline resolves |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Launching new Puppeteer browser per request | Memory grows 150–200MB per concurrent request | Reuse browser, create new page per request, close page in `finally` | 3+ concurrent requests on 2GB VPS |
| Synchronous file reads in request handler | CPU blocks during image I/O | Use `fs.promises` throughout, never `fs.readFileSync` in hot path | Doesn't matter for hackathon scale, but bad practice |
| No timeout on Puppeteer `page.screenshot()` | Request hangs indefinitely if Chromium stalls | Set `page.setDefaultNavigationTimeout(30000)` and `page.setDefaultTimeout(30000)` | Any render that encounters a font or resource fetch timeout |
| Keeping screenshot buffer in-memory during entire pipeline | Node heap grows with image size (~1–4MB per request) | Write to disk immediately after screenshotOne response, pass path not buffer | 5+ concurrent requests |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Accepting arbitrary URLs without validation | SSRF — users target internal VPS services (169.254.x.x, localhost) | Validate URL scheme is `https://`, block private IP ranges before calling screenshotOne |
| Logging full AI responses in production | Sensitive page content captured in logs | Log only status codes and latency, not response bodies |
| Not rate-limiting the generation endpoint | API cost abuse — one user burns through screenshotOne/Gemini quota | Implement per-IP rate limiting (e.g., 5 requests/minute) via express-rate-limit |
| Exposing API keys in client-side JS | Keys stolen, quota abused | All API calls must be server-side only — never pass keys to frontend |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication during 20–40s wait | Users refresh mid-generation, creating duplicate requests | Show a step-by-step status ("Capturing screenshot... Analyzing with AI... Rendering...") with SSE or polling |
| Showing generic "Error" on AI parse failure | Users don't know if it's their URL or the system | Categorize errors: "Page took too long", "Could not analyze content", "Rendering failed" |
| No download button — only inline image display | Mobile users can't save the image easily | Always provide an explicit download link with proper `Content-Disposition` header |
| Showing the raw URL in the output card | Long URLs truncate badly in the dark-theme template | Truncate or extract just the hostname for display in the template |

---

## "Looks Done But Isn't" Checklist

- [ ] **Puppeteer sandbox flags:** Test `--no-sandbox` on the actual VPS, not just locally. A working local run does not confirm VPS compatibility.
- [ ] **Font rendering:** View the output image on VPS output, not just in local dev. Font fallback looks different enough to catch but only if you look.
- [ ] **File cleanup:** Check that files accumulate and are actually deleted after 1 hour following a PM2 restart (not just a normal process lifecycle).
- [ ] **AI JSON parse errors:** Introduce an intentional malformed mock response in tests to confirm the sanitizer handles it without crashing the request.
- [ ] **screenshotOne blank pages:** Test with a URL that requires a login (e.g., GitHub private repo) to confirm graceful failure, not silent garbage output.
- [ ] **Error visibility:** Confirm that all `catch` blocks produce a meaningful error response to the client, not a hanging connection.
- [ ] **Memory at rest:** After 10 successive generations, check `pm2 monit` — memory should plateau, not climb continuously.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Orphaned Chromium processes OOM crash | LOW | PM2 auto-restarts; investigate by adding `finally` blocks and checking `ps aux` |
| Disk full from leaked output files | LOW | `rm -f output/*` then deploy cron cleanup; monitor with `df -h` in PM2 startup script |
| Fonts rendering as fallback in all outputs | MEDIUM | Swap CDN font to embedded base64 in template; redeploy; no data loss |
| AI JSON parse crash in production | LOW | Add sanitizer function; redeploy; no persistent state affected |
| screenshotOne quota exceeded mid-hackathon | HIGH | No fast recovery — implement rate limiting before launch to prevent this |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Puppeteer sandbox flags | VPS setup / Puppeteer render module | Run `node -e "require('puppeteer').launch({args:['--no-sandbox',...]})"` on VPS |
| Google Fonts fallback rendering | HTML template and Puppeteer render | Visually compare local vs VPS output image fonts |
| AI JSON markdown fences | AI integration module (Gemini + Claude clients) | Mock a markdown-fenced response; confirm sanitizer parses it correctly |
| Browser not closed on error | Puppeteer render module | Throw intentional error mid-render; check `ps aux` for orphaned processes |
| screenshotOne blank/error images | screenshotOne integration | Test with a paywalled URL; confirm error is caught before Gemini call |
| Disk space / file cleanup | File management and output serving | Restart PM2; wait >1 hour; verify old files are deleted |
| Sequential AI latency | End-to-end pipeline integration | Time each step; total latency should be <30s for most URLs |
| SSRF via user-supplied URL | Input validation (Express route) | Test with `http://localhost:3000/admin` as input; confirm rejection |

---

## Sources

- [Puppeteer Troubleshooting — pptr.dev](https://pptr.dev/troubleshooting) — sandbox, missing deps, AppArmor
- [Puppeteer Memory Leaks, Crashes, and Zombie Processes: 6 Months in Production (2026)](https://medium.com/@TheTechDude/puppeteer-memory-leaks-crashes-and-zombie-processes-6-months-of-screenshots-in-production-b2ae7e65df3f) — orphaned process patterns
- [How to Fix Puppeteer Font Issues — browserless.io](https://www.browserless.io/blog/puppeteer-print) — font loading in headless Chrome
- [Puppeteer Issue #2692 — Chrome/Chromium will not display webfonts on Ubuntu](https://github.com/puppeteer/puppeteer/issues/2692) — CDN font user-agent problem
- [Gemini Structured Output — Google AI for Developers](https://ai.google.dev/gemini-api/docs/structured-output) — response_mime_type, schema constraints
- [PSA: Extracting output from Gemini models — n8n Community](https://community.n8n.io/t/psa-extracting-output-from-gemini-models/83374) — markdown fence stripping
- [ScreenshotOne Error Handling Guide](https://screenshotone.com/docs/guides/how-to-handle-api-errors/) — 4xx/5xx handling
- [ScreenshotOne Timeout Error](https://screenshotone.com/docs/errors/timeout/) — 60s default, 90s max sync, 300s async
- [PM2 Memory Limit Reload](https://pm2.keymetrics.io/docs/usage/memory-limit/) — max_memory_restart configuration
- [Puppeteer Issue #9283 — Chrome requests leak memory](https://github.com/puppeteer/puppeteer/issues/9283) — page.close() in catch blocks
- [Puppeteer Issue #8695 — Docker container memory always increasing](https://github.com/puppeteer/puppeteer/issues/8695) — /dev/shm and --disable-dev-shm-usage

---
*Pitfalls research for: Automated URL-to-annotated-image pipeline (AnnotatorAI)*
*Researched: 2026-04-04*
