# Phase 1: Foundation - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Express server scaffolded with health check endpoint, static file serving, and Puppeteer confirmed working under Linux sandbox flags on the Hostinger VPS. Full project folder structure created with stub files. Deployed via PM2 with auto-restart.

</domain>

<decisions>
## Implementation Decisions

### Package Versions
- **D-01:** Use Express 5.1 (not 4.x from brief) — npm default, no migration cost on greenfield
- **D-02:** Use `@google/genai` ^1.x (not `@google/generative-ai`) — old SDK frozen, lacks Gemini 2.5 structured output
- **D-03:** Use native `fetch` (not `axios`) — Node 20 has built-in fetch, unnecessary dependency
- **D-04:** Use Puppeteer ^24 (not ^22 from brief) — current version, better headless defaults

### Deployment Strategy
- **D-05:** Develop locally first, then deploy to VPS for verification — catch bugs locally where iteration is fast
- **D-06:** Use raw VPS IP for now — domain available but not pointed yet, fine for hackathon judging

### Scaffolding Approach
- **D-07:** Create full folder structure with stub files upfront per brief Section 3 — all directories and empty-export modules created in Phase 1, later phases fill them in

### Claude's Discretion
- Exact stub file content (empty exports with TODO comments vs minimal placeholders)
- PM2 ecosystem.config.js structure
- .gitignore contents
- Health check response format (as long as it returns 200 with JSON)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `annotator-project-brief.md` — Complete project brief with folder structure (§3), env vars (§4), pipeline architecture (§5), API specs (§6), HTML template spec (§7), module signatures (§8), web UI spec (§9), VPS deployment instructions (§10), package.json (§11)

### Project Planning
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Full requirements with traceability (Phase 1 owns DEPLOY-01, DEPLOY-02, DEPLOY-03, REL-03)
- `CLAUDE.md` — Updated tech stack research with version compatibility, gotchas, and "what not to use" guidance

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no code exists yet

### Established Patterns
- None — patterns will be established in this phase

### Integration Points
- Phase 2 will build on the Express server and folder structure created here
- Phase 3 will use Puppeteer (validated here) for card rendering
- Phase 4 will add routes and frontend to the server scaffolded here

</code_context>

<specifics>
## Specific Ideas

- VPS has 4 CPU / 16GB RAM / 200GB NVMe — no memory concerns for Puppeteer, `--single-process` flag not needed
- VPS current usage: CPU 9%, Memory 21%, Disk 19GB — plenty of headroom
- SSH access is ready, all three API keys (screenshotOne, Gemini, Anthropic) are configured
- Brief Section 10 has exact VPS deployment commands to follow

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-04*
