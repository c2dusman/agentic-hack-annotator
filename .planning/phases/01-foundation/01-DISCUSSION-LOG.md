# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 01-foundation
**Areas discussed:** Package versions, Deployment timing, Scaffolding depth, VPS access & credentials

---

## Package Versions

| Option | Description | Selected |
|--------|-------------|----------|
| Use updated stack | Express 5.1, `@google/genai`, native fetch, Puppeteer 24 | ✓ |
| Follow brief exactly | Express 4.x, `@google/generative-ai`, axios, Puppeteer 22 | |
| Mix | Update some, keep others | |

**User's choice:** Use updated stack
**Notes:** No migration cost on greenfield. Brief was written March 28; CLAUDE.md research identified better alternatives. Old `@google/generative-ai` SDK is frozen and lacks Gemini 2.5 structured output support.

---

## Deployment Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Develop locally, then deploy to VPS | Build scaffold locally, test, then push to VPS and verify | ✓ |
| Develop directly on VPS | SSH in and build there | |
| Local only, VPS in Phase 4 | Skip VPS verification now, consolidate at end | |

**User's choice:** Develop locally, then deploy to VPS
**Notes:** Safer — catch bugs locally where iteration is fast. Phase 1 success criteria require VPS verification so it can't be fully deferred.

---

## Scaffolding Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full folder structure now | All directories and stub files per brief Section 3 | ✓ |
| Only what Phase 1 needs | Just server.js, public/, and Puppeteer test | |
| Partial | Full directories, stub only Phase 2 files | |

**User's choice:** Full folder structure with stubs
**Notes:** Takes minimal time, makes the project feel real, and later phases don't waste time on boilerplate.

---

## VPS Access & Credentials

| Option | Description | Selected |
|--------|-------------|----------|
| (information gathering) | User provided VPS details | ✓ |

**User's choice:** N/A — information gathering area
**Notes:** SSH ready. All API keys ready (screenshotOne, Gemini, Anthropic). VPS specs: 4 CPU, 16GB RAM, 200GB NVMe. Current usage: CPU 9%, Memory 21%, Disk 19GB. Domain available but not pointed — raw IP fine for now.

---

## Claude's Discretion

- Exact stub file content format
- PM2 ecosystem.config.js structure
- .gitignore contents
- Health check response format

## Deferred Ideas

None — discussion stayed within phase scope
