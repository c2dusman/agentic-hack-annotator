---
phase: 01-foundation
plan: 02
subsystem: infra
tags: [puppeteer, pm2, vps, hostinger, express]

requires:
  - phase: 01-foundation/plan-01
    provides: project scaffold, server.js, all stub modules
provides:
  - VPS deployment with PM2 process management
  - Puppeteer verified working on VPS with bundled Chromium
  - Health check accessible at 82.29.160.5:3001
  - Static file serving from VPS
affects: [phase-02, phase-03, phase-04]

tech-stack:
  added: []
  patterns: [puppeteer-bundled-chromium, pm2-port-3001]

key-files:
  created: []
  modified: [src/render.js, test-puppeteer.js, ecosystem.config.js]

key-decisions:
  - "Use Puppeteer bundled Chromium instead of snap chromium-browser (AppArmor conflicts)"
  - "Port 3001 instead of 3000 (Supabase studio/rest occupy port 3000 on VPS)"

patterns-established:
  - "Puppeteer uses bundled Chromium on all platforms — no executablePath needed"
  - "VPS port is 3001 to coexist with existing Docker services"

requirements-completed: [DEPLOY-01, DEPLOY-02, DEPLOY-03, REL-03]

duration: 15min
completed: 2026-04-04
---

# Plan 01-02: VPS Deployment Summary

**Express 5 server deployed to Hostinger VPS (82.29.160.5:3001) with PM2 auto-restart and Puppeteer verified using bundled Chromium**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-04T03:10:00Z
- **Completed:** 2026-04-04T03:25:00Z
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments
- Puppeteer bundled Chromium works on VPS — snap chromium-browser had AppArmor sandbox conflicts
- PM2 keeps app alive with auto-restart verified (kill → restart count 1 → back online)
- Health check returns {"status":"ok"} from VPS at port 3001
- Static files served at http://82.29.160.5:3001/ (HTTP 200)

## Task Commits

1. **Task 1: Deploy to VPS, verify Puppeteer and health check** - `ae2e824`, `fec7f2c` (fix: bundled Chromium, port 3001)
2. **Task 2: Human verification of VPS deployment** - User confirmed all 4 criteria pass

## Files Created/Modified
- `src/render.js` - Removed snap chromium executablePath, use Puppeteer bundled Chromium
- `test-puppeteer.js` - Same fix, removed Linux-specific executablePath
- `ecosystem.config.js` - Changed default port from 3000 to 3001

## Decisions Made
- **Snap Chromium rejected:** Ubuntu 24.04 installs Chromium as a snap by default. Snap's AppArmor sandbox conflicts with Puppeteer's --no-sandbox flag. Solution: use Puppeteer's own bundled Chromium (downloaded during npm install).
- **Port 3001:** VPS already runs Supabase (studio + rest on port 3000) and n8n (port 5678) via Docker. AnnotatorAI uses port 3001 to avoid conflicts.

## Deviations from Plan

### Auto-fixed Issues

**1. Snap Chromium incompatibility**
- **Found during:** Task 1 (VPS deployment)
- **Issue:** `chromium-browser --headless --no-sandbox` produces AppArmor errors on Ubuntu 24.04 snap
- **Fix:** Removed `executablePath` logic from render.js and test-puppeteer.js; Puppeteer's bundled Chromium works out of the box with system libs installed
- **Files modified:** src/render.js, test-puppeteer.js
- **Verification:** `node test-puppeteer.js` prints "Puppeteer OK"

**2. Port 3000 conflict with Supabase**
- **Found during:** Task 1 (VPS deployment)
- **Issue:** supabase-studio and supabase-rest both bind to port 3000 inside Docker
- **Fix:** Changed PORT to 3001 in ecosystem.config.js and .env
- **Files modified:** ecosystem.config.js, .env
- **Verification:** `curl http://localhost:3001/api/health` returns ok

---

**Total deviations:** 2 auto-fixed
**Impact on plan:** Both necessary for VPS compatibility. No scope creep.

## Issues Encountered
- SSH from Claude Code failed (password auth required) — user performed deployment manually via VPS terminal

## User Setup Required
None - deployment completed during this session.

## Next Phase Readiness
- VPS foundation complete, ready for Phase 2 (AI pipeline: screenshotOne + Gemini + Claude)
- API keys for screenshotOne, Gemini, and Anthropic need to be added to /root/annotatorai/.env on VPS
- Port 3001 is live and accessible externally

---
*Phase: 01-foundation*
*Completed: 2026-04-04*
