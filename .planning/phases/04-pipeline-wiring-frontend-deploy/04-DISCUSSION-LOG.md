# Phase 4: Pipeline Wiring + Frontend + Deploy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 04-pipeline-wiring-frontend-deploy
**Areas discussed:** Loading progress UX, File cleanup strategy, VPS deployment method, Pipeline route error handling

---

## Loading Progress UX

| Option | Description | Selected |
|--------|-------------|----------|
| Simulated timer steps | Frontend shows fixed labels at ~5s intervals. Simple, no server changes. Per brief Section 9. | Yes |
| Real server-sent progress | Server sends SSE events as each pipeline stage completes. Accurate but adds SSE wiring. | |
| You decide | Claude picks the simplest approach. | |

**User's choice:** Simulated timer steps
**Notes:** None

### Follow-up: Timeout UX

| Option | Description | Selected |
|--------|-------------|----------|
| Keep spinning until 60s | Status stays on last stage label. Show error after timeout. | |
| Show 'taking longer than usual' after 30s | Add subtle message at 30s. Small UX win, minimal code. | Yes |
| You decide | Claude picks. | |

**User's choice:** Show 'taking longer than usual' after 30s
**Notes:** None

---

## File Cleanup Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| node-cron every 10 minutes | Runs cleanupOldFiles() on schedule. Reliable even during long sessions. Recommended in CLAUDE.md. | Yes |
| Startup-only cleanup | Only clean old files when server starts. Per brief Section 12. | |
| You decide | Claude picks. | |

**User's choice:** node-cron every 10 minutes
**Notes:** None

---

## VPS Deployment Method

| Option | Description | Selected |
|--------|-------------|----------|
| Git push + pull on VPS | Push to GitHub, SSH in, git pull, npm install, pm2 restart. Standard and repeatable. | Yes |
| rsync from local | rsync files directly to VPS. No git needed on server. | |
| You decide | Claude picks. | |

**User's choice:** Git push + pull on VPS
**Notes:** None

### Follow-up: Puppeteer Chromium

| Option | Description | Selected |
|--------|-------------|----------|
| Bundled Chromium | Puppeteer downloads its own Chrome. No executablePath needed. Current render.js already works this way. | Yes |
| System chromium-browser | Use apt-installed chromium-browser with executablePath. Per brief Section 10. | |

**User's choice:** Bundled Chromium
**Notes:** None

### Follow-up: Port

| Option | Description | Selected |
|--------|-------------|----------|
| Port 3001 | Per existing VPS setup. Avoids conflicts with n8n/Supabase. | Yes |
| Port 3000 | Match the project brief exactly. | |
| You decide | Claude checks and picks. | |

**User's choice:** Port 3001
**Notes:** VPS already has other services running

---

## Pipeline Route Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Simple error message box | Red-bordered box with stage-specific error text. Per brief Section 9. No retry button. | Yes |
| Error with retry button | Show error + 'Try Again' button. Small UX improvement. | |
| You decide | Claude picks. | |

**User's choice:** Simple error message box
**Notes:** None

### Follow-up: Server-side Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, validate first | Use existing isValidUrl() from utils.js. Return 400 immediately. Fast feedback. | Yes |
| Let it fail naturally | Pass URL to screenshotOne and let it fail. Simpler but slower feedback. | |

**User's choice:** Yes, validate first
**Notes:** None

---

## Claude's Discretion

- Exact CSS styling values for web UI
- Loading spinner animation style
- PM2 ecosystem.config.js structure
- Progress label wording
- Client-side URL validation addition

## Deferred Ideas

None — discussion stayed within phase scope
