# Phase 2: Screenshot + AI Services - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 02-screenshot-ai-services
**Areas discussed:** AI Prompt Strategy, Screenshot Config, Error & Retry Logic, Isolated Testing

---

## AI Prompt Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Follow brief exactly | Use exact prompt text from annotator-project-brief.md §6. Fastest path, already designed for this use case. | ✓ |
| Adapt prompts freely | Use brief prompts as starting points but rewrite for better results. More time investment. | |
| You decide | Claude uses brief prompts as-is initially, iterates if needed. | |

**User's choice:** Follow brief exactly
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Strict schema enforcement | Use Gemini's responseSchema with responseMimeType: 'application/json'. API enforces exact shape. | ✓ |
| Loose with validation | Request JSON in prompt but validate/coerce response in code. | |
| You decide | Claude picks approach. | |

**User's choice:** Strict schema enforcement
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Structured JSON | Claude returns {cardTitle, cardSubtitle, steps[]} as JSON. Matches brief spec. | ✓ |
| Plain text with parsing | Claude returns natural text, we parse sections. | |
| You decide | Claude picks based on copy quality. | |

**User's choice:** Structured JSON
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 3-5 elements | Tell Gemini to return exactly 3-5 key elements. Predictable for template layout. | ✓ |
| Dynamic (up to 8) | Let Gemini decide how many. Template must handle variable counts. | |
| You decide | Claude picks count for card dimensions. | |

**User's choice:** Fixed 3-5 elements
**Notes:** None

---

## Screenshot Config

| Option | Description | Selected |
|--------|-------------|----------|
| 1200px | Per brief spec — wide enough for full desktop layouts. | ✓ |
| 1440px | Wider desktop view — may look zoomed out on card. | |
| You decide | Claude picks viewport. | |

**User's choice:** 1200px
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Full page | Captures entire scrollable page. Brief spec uses full_page: true. | |
| Viewport only | Just above-fold content. Faster, smaller. | |
| You decide | Claude picks based on Gemini analysis input quality. | ✓ |

**User's choice:** You decide
**Notes:** Claude's discretion

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed delay + network idle | screenshotOne delay (2-3s) + network idle. Covers most cases. | |
| Just timeout | Hard 10s timeout, take whatever loaded. | |
| You decide | Claude picks wait strategy. | ✓ |

**User's choice:** You decide
**Notes:** Claude's discretion

| Option | Description | Selected |
|--------|-------------|----------|
| PNG full quality | Lossless — best input for Gemini vision. Brief spec uses PNG. | ✓ |
| JPEG 85% | Smaller file, minor quality loss. | |
| You decide | Claude picks format. | |

**User's choice:** PNG full quality
**Notes:** None

---

## Error & Retry Logic

| Option | Description | Selected |
|--------|-------------|----------|
| 2 retries | Per REL-01 — max 2 attempts. Strip markdown fences before retrying. | ✓ |
| 1 retry | Faster failure. One retry catches transient issues. | |
| You decide | Claude picks retry count per brief/requirements. | |

**User's choice:** 2 retries
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| 1 retry | Retry once on timeout/5xx. Catches transient issues. | ✓ |
| No retry | Fail fast — screenshot works or URL is problematic. | |
| You decide | Claude picks for best UX. | |

**User's choice:** 1 retry
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Specific stage label | "Analysis failed: could not interpret screenshot" — tells user which step broke. | ✓ |
| Generic friendly error | "Something went wrong. Please try again." — simpler but less debuggable. | |
| You decide | Claude picks user-friendly but informative messages. | |

**User's choice:** Specific stage label
**Notes:** Per REL-02

| Option | Description | Selected |
|--------|-------------|----------|
| 60 second total | Hard cap on entire pipeline. Typical 10-30s, 60s catches edge cases. | ✓ |
| No total timeout | Each service has own timeout. Stuck service could hang indefinitely. | |
| You decide | Claude picks reasonable timeout. | |

**User's choice:** 60 second total
**Notes:** None

---

## Isolated Testing

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone test scripts | One script per service (test-screenshot.js, etc.). Run via node test-xxx.js. | ✓ |
| Temporary API endpoints | Add /api/test-xxx routes. More visible but throwaway code. | |
| You decide | Claude picks fastest testing approach. | |

**User's choice:** Standalone test scripts
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| https://example.com | Simple, always available, fast to load. | ✓ |
| A real content page | Rich content for Gemini. More realistic but could change. | |
| You decide | Claude picks reliable test URL. | |

**User's choice:** https://example.com
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, save to /output | Save screenshot PNG and JSON responses. Easy to inspect. Auto-cleaned. | ✓ |
| Console output only | Log results to terminal. No files to manage. | |
| You decide | Claude picks most useful for debugging. | |

**User's choice:** Yes, save to /output
**Notes:** None

---

## Claude's Discretion

- Full-page vs viewport-only screenshot capture
- screenshotOne wait strategy for JS-heavy pages

## Deferred Ideas

None — discussion stayed within phase scope
