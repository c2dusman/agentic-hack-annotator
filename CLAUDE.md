<!-- GSD:project-start source:PROJECT.md -->
## Project

**AnnotatorAI**

AnnotatorAI is a web application that takes a URL and an optional focus hint, then automatically generates a professionally annotated vertical image (9:16 ratio) ready for social media carousels and blog articles. The pipeline captures a screenshot, uses Gemini 2.5 Flash for vision analysis, Claude Sonnet for annotation copywriting, and Puppeteer to render the final dark-themed card image.

**Core Value:** One URL in, one beautiful annotated image out — no manual editing, no design tools, fully automated.

### Constraints

- **Deadline**: April 5, 2026 23:59:59 UTC — optimize for deployed and working over polish
- **Hosting**: Must be on Hostinger VPS (Ubuntu 22.04) — required for judging
- **Tech stack**: Node.js 20 + Express + vanilla HTML/CSS/JS — per spec, no frameworks
- **APIs**: screenshotOne for screenshots, Gemini 2.5 Flash for vision, Claude Sonnet 4 for copy
- **Cost**: ~$0.03-0.05 per generation — keep API usage lean
- **Puppeteer**: Must include Linux VPS flags (--no-sandbox, --disable-setuid-sandbox, etc.)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 20.x LTS (spec) — see gotcha below | Runtime | v20 is the project spec requirement. Note: v20 EOL is April 2026 (this month). For new greenfield work Node 22 LTS (supported until April 2027) is the better long-term choice, but given the hackathon deadline of April 5 and Hostinger VPS already provisioned, stay on v20 and accept the EOL risk. |
| Express | 5.1.x | HTTP server / API routing | Express 5.1 became the npm `latest` tag on March 31, 2025. Express 4.x entered maintenance-only mode on the same date with EOL no earlier than October 2026. New projects should start on v5. The project spec says "Express 4.x" — bump to 5.1 costs nothing on greenfield; path routing syntax changed but you have no existing routes to migrate. |
| Puppeteer | 24.x (24.4.0 at time of research) | Render HTML template to PNG (output card only — NOT for input screenshots) | Headless Chrome controlled via Node.js. Since v22, `headless: true` defaults to the new unified headless mode (no longer the legacy `shell`). For HTML-to-PNG rendering on a VPS this is the only viable single-dependency approach. |
| Sharp | 0.34.x (0.34.5 at time of research) | Post-process / optimize the final PNG | Wraps libvips. Fastest Node.js image processing library; required Node-API v9 runtime (Node >=18.17 or >=20.3). Used here for final compression / quality pass after Puppeteer outputs raw PNG. |
| @google/genai | 1.x (1.48.0 at time of research) | Gemini 2.5 Flash vision analysis | This is Google's NEW unified SDK (replaces deprecated `@google/generative-ai` 0.24.x which is frozen). Supports `gemini-2.5-flash` model ID. Has structured output (JSON schema enforcement) which eliminates response parsing fragility. |
| @anthropic-ai/sdk | 0.x (0.82.0 at time of research) | Claude Sonnet 4 annotation copywriting | Official Anthropic SDK. Requires Node.js 18+. Use model string `claude-sonnet-4-5` (latest Sonnet 4 variant available at research time; check `platform.claude.ai/docs/models/overview` for current string before coding). |
| screenshotone-api-sdk | latest | Capture input URL screenshots via ScreenshotOne API | Official JS/TS SDK for the ScreenshotOne REST API. Abstracts auth signing, option building, and response streaming. Avoids running a second Puppeteer instance for input capture (keeps the VPS from spawning two Chrome processes simultaneously). |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | ^16.x | Load API keys from `.env` file | Always — never hardcode keys. Load at process start before any module that reads env vars. |
| multer | ^1.4.x | Multipart form handling | Only if you add file upload later. Not needed for v1 (URL + string input only). Omit for now. |
| node-cron | ^3.x | Schedule temp file cleanup | Use for the 1-hour output image auto-cleanup requirement. Lighter than a full job queue for this single task. |
| pm2 | ^6.0.14 (global install) | Process management on VPS | Install globally on the VPS (`npm install -g pm2@latest`). Use `ecosystem.config.js` not CLI flags. Set `watch: false` in production — `watch: true` causes infinite restart loops when output files are written. |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| PM2 | Production process manager | v6.0.14 current. Use `pm2 startup` to survive reboots. Use `pm2 logs` for live log tailing. |
| nodemon | Local dev auto-restart | `npm install -D nodemon`. Do not use in production. |
| Node.js built-in `http` / `fetch` | API calls | Node 18+ has native `fetch`. No need for `axios` or `node-fetch` for simple HTTP calls. |
## Installation
# Core runtime dependencies
# Dev dependencies
# Global on VPS (run once after SSH)
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| screenshotOne API | Local Puppeteer for input screenshots | If you control the target URLs and need zero API cost. Avoided here because it doubles Chrome process count on the VPS and requires managing JS rendering timeouts for arbitrary public URLs. |
| Puppeteer for HTML-to-PNG | `html2canvas` (client-side) | Only if rendering in-browser. Server-side card rendering requires a headless browser; html2canvas cannot run in Node.js. |
| Puppeteer for HTML-to-PNG | `playwright` | Playwright is a valid drop-in with better multi-browser support. For a hackathon with a fixed spec, Puppeteer has simpler API for single-browser single-page screenshot use case. |
| `@google/genai` | `@google/generative-ai` | The old SDK (0.24.x) is frozen and no longer updated. Do not use it for Gemini 2.5 Flash — it may lack structured output enforcement and newer model IDs. |
| Express 5.x | Express 4.x | Express 4.x is safe until October 2026 EOL, but on a greenfield project there is no migration cost — start on 5.x. |
| Node.js 20 | Node.js 22 | Node 22 LTS is the better long-term choice (EOL April 2027 vs April 2026 for Node 20). For this hackathon, stay on 20 to match the pre-provisioned VPS environment. Upgrade post-hackathon. |
| Sharp | Jimp | Jimp is pure JS (no native bindings) — 10-30x slower for PNG operations. Sharp requires libvips (pre-bundled in the npm package for most platforms). Use Jimp only when native bindings are completely unavailable. |
| node-cron | setInterval | node-cron is cron-syntax declarative and survives PM2 restarts cleanly. `setInterval` is acceptable for simple 1-hour cleanup but resets on any process restart, potentially leaving orphaned files. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@google/generative-ai` (old SDK) | Frozen at 0.24.x, last published ~1 year ago. Lacks Gemini 2.5 structured output support. | `@google/genai` ^1.x |
| `headless: 'new'` string in Puppeteer | Deprecated string option. Since Puppeteer v22 the new headless mode is the default when you pass `headless: true`. Passing `'new'` as a string may produce warnings or break in future versions. | `headless: true` (default) |
| `headless: 'shell'` on the output renderer | The `shell` mode (old headless) skips some rendering features. For HTML template rendering you want the full new headless Chrome so CSS and font rendering are accurate. | `headless: true` |
| `watch: true` in PM2 ecosystem.config.js | Every time Puppeteer writes an output PNG, PM2 detects a file change and restarts the process — causing infinite restart loops. | `watch: false` always in production |
| `axios` or `node-fetch` | Node.js 20+ has native `fetch` built in. Adding a third-party HTTP client adds unnecessary dependency weight for simple REST calls. | Native `fetch` |
| Global `npm install puppeteer` on the VPS without dependency pre-install | Puppeteer bundles its own Chromium but requires system-level shared libraries on Ubuntu 22.04. The process crashes silently if libraries are missing. | Run `npx puppeteer browsers install chrome` after `npm install`, and pre-install system deps (see Version Compatibility below). |
| Multiple concurrent Puppeteer browser instances | Each Chromium instance on a VPS with 1-2 GB RAM costs ~300-500 MB. Launching one per request causes OOM kills under even light load. | Reuse a single browser instance with multiple pages, or launch/close per request with `puppeteer-cluster` if concurrency matters. |
## Stack Patterns by Variant
- Use Puppeteer with a single reusable browser instance
- `page.setContent(html)` then `page.screenshot({ type: 'png', clip: { x:0, y:0, width:1080, height:1920 } })`
- Then pipe through Sharp for final compression
- `puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] })`
- Use `responseMimeType: 'application/json'` and `responseSchema` in the generation config
- This enforces JSON at the API level — no regex parsing of the response needed
- Model string: `gemini-2.5-flash`
- Use `client.messages.create()` with `max_tokens: 1024` — annotation copy is short
- Model string: verify current at `platform.claude.ai/docs/en/about-claude/models/overview` — at time of research the recommended Sonnet 4 variant is `claude-sonnet-4-5`
- Use `puppeteer-cluster` (wraps Puppeteer with a worker pool)
- Or offload to a queue (Bull + Redis) and process sequentially
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| sharp@0.34.x | Node >=18.17.0 or >=20.3.0 | Uses Node-API v9. Node 20 LTS ships >=20.3.0, fully compatible. |
| puppeteer@24.x | Node >=18 | Downloads its own Chromium. Does NOT use system Chrome by default. On Ubuntu 22.04, system shared libs must still be present for the bundled Chromium. |
| @google/genai@1.x | Node >=16 | No strict upper bound. Works on Node 20. |
| @anthropic-ai/sdk@0.82.x | Node >=18 | Node 20 fully compatible. |
| express@5.1.x | Node >=18 | Drops Node <18 support. Node 20 fully compatible. |
| node-cron@3.x | Node >=12 | No issues on Node 20. |
### Ubuntu 22.04 System Dependencies for Puppeteer (run once on VPS)
## Critical Gotchas
### 1. Node.js 20 EOL is April 2026
### 2. Express 5 is now the npm default — not Express 4
### 3. Two different Google AI SDKs exist — use the new one
### 4. Puppeteer headless string `'new'` is deprecated
### 5. --disable-dev-shm-usage is mandatory on VPS
### 6. Verify Claude model string before coding
## Sources
- [Express 5.1 npm default announcement](https://expressjs.com/2025/03/31/v5-1-latest-release.html) — Express version status, HIGH confidence
- [Puppeteer headless modes guide](https://pptr.dev/guides/headless-modes) — headless: true default since v22, HIGH confidence
- [Puppeteer troubleshooting](https://pptr.dev/troubleshooting) — --no-sandbox and system dependency guidance, HIGH confidence
- [Gemini 2.5 Flash model page](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash) — model ID `gemini-2.5-flash`, structured output support, HIGH confidence
- [googleapis/js-genai GitHub](https://github.com/googleapis/js-genai) — `@google/genai` as the current unified SDK, HIGH confidence
- [anthropics/anthropic-sdk-typescript GitHub](https://github.com/anthropics/anthropic-sdk-typescript) — SDK version 0.82.0, Node >=18, HIGH confidence
- [sharp changelog v0.34.5](https://sharp.pixelplumbing.com/changelog/v0.34.5/) — current version, Node-API v9 compatibility, HIGH confidence
- [screenshotone-api-sdk npm](https://www.npmjs.com/package/screenshotone-api-sdk) — official JS SDK, last updated June 2025, MEDIUM confidence (version number not confirmed via fetch)
- [PM2 npm page](https://www.npmjs.com/package/pm2) — version 6.0.14 current, HIGH confidence
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases) — Node 20 EOL April 2026, Node 22 LTS until April 2027, HIGH confidence
- [Anthropic models overview](https://platform.claude.ai/docs/en/about-claude/models/overview) — Claude model strings, HIGH confidence (verify current string at build time)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
