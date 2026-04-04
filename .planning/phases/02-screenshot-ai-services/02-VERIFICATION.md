---
phase: 02-screenshot-ai-services
verified: 2026-04-04T11:00:00Z
status: gaps_found
score: 5/6 must-haves verified
gaps:
  - truth: "Steps array matches the number of elements from analysis input"
    status: partial
    reason: "Neither FOCUS_PROMPT nor NO_FOCUS_PROMPT contains any instruction to produce one step per element. The prompt says 'Write annotation copy based on the detectedFocus field and the elements identified' but does not say 'produce exactly N steps matching the N elements'. Claude will infer an arbitrary step count."
    artifacts:
      - path: "src/annotate.js"
        issue: "FOCUS_PROMPT and NO_FOCUS_PROMPT do not instruct Claude to produce one step per element from the analysis input. The element array from Gemini has 3-5 items but the prompts produce an open-ended steps array."
    missing:
      - "Add explicit instruction to both prompt templates: 'Create exactly one step for each element in the elements array, using the element label and description as the basis for that step'"
human_verification:
  - test: "Run node test-annotate.js https://github.com 'How to create a repository' with real API keys"
    expected: "Steps array length equals elements array length from the Gemini analysis output"
    why_human: "Cannot verify step-to-element count alignment without live API calls"
  - test: "Run node test-annotate.js https://example.com (no focus hint) with real API keys"
    expected: "detectedFocus in analysis is non-empty and cardTitle in annotations starts with a verb"
    why_human: "Requires live Gemini and Claude API calls to verify inferred focus and verb-first titles"
---

# Phase 2: Screenshot + AI Services Verification Report

**Phase Goal:** All three pipeline services (screenshot capture, Gemini vision, Claude copywriting) built and returning correct structured output when called with test inputs
**Verified:** 2026-04-04T11:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | screenshotOne call with a real URL returns a valid PNG buffer | ✓ VERIFIED | `captureScreenshot` exists, uses SDK correctly, returns `{ buffer, base64 }`, retry loop in place |
| 2 | Gemini call returns parseable JSON with pageTitle, pageTopic, detectedFocus, and elements array | ✓ VERIFIED | `analyzeScreenshot` uses `responseMimeType:'application/json'` + `responseSchema` enforcing all 4 fields |
| 3 | Claude call returns parseable JSON with cardTitle, cardSubtitle, and steps array | ✓ VERIFIED | `generateAnnotations` uses `withJsonRetry`, returns object with all 3 required fields |
| 4 | When focus hint provided, both Gemini and Claude output reflect that focus goal | ✓ VERIFIED | Both services have FOCUS_PROMPT with `{{FOCUS_HINT}}` placeholder substitution; Gemini schema enforces `detectedFocus` restates focus |
| 5 | When no focus hint, Gemini infers a topic and Claude aligns to inferred focus | ✓ VERIFIED | NO_FOCUS_PROMPT in both services; Claude NO_FOCUS_PROMPT references `detectedFocus` field explicitly |
| 6 | AI JSON parsing retries up to 2 times and strips markdown fences before failing with a clear error | ✓ VERIFIED | `withJsonRetry(apiFn, 2)` confirmed to retry 2 calls, `stripMarkdownFences` strips fences before parse, behaviorally verified via Node |

**Score: 6/6 truths structurally verified.**

Note: Truth 6 from the success criteria about "steps array matches number of elements" is captured as a gap — the plan's must_have truths differ from the phase success criteria. The success criterion in the prompt reads "Steps array matches the number of elements from analysis input" which is NOT guaranteed by the current prompts. See Gaps section.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils.js` | stripMarkdownFences, withJsonRetry, withTimeout helpers | ✓ VERIFIED | All 8 exports confirmed: generateId, ensureOutputDir, cleanupOldFiles, isValidUrl, sanitizeFocus, stripMarkdownFences, withJsonRetry, withTimeout |
| `src/screenshot.js` | captureScreenshot function calling screenshotOne API | ✓ VERIFIED | Uses SDK with both keys, Blob→Buffer conversion, retry loop, exports captureScreenshot |
| `src/analyze.js` | analyzeScreenshot with Gemini structured output | ✓ VERIFIED | Uses @google/genai (new SDK), Type.OBJECT schema, both prompt templates, withJsonRetry |
| `src/annotate.js` | generateAnnotations with Claude copywriting | ✓ VERIFIED | Uses @anthropic-ai/sdk, both prompt templates, withJsonRetry(fn, 2), correct response extraction |
| `.env.example` | All 7 env vars documented | ✓ VERIFIED | PORT, SCREENSHOTONE_ACCESS_KEY, SCREENSHOTONE_SECRET_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, OUTPUT_DIR, BASE_URL |
| `test-screenshot.js` | Standalone screenshot test script | ✓ VERIFIED | Exists, uses captureScreenshot, saves to ./output/test-screenshot.png |
| `test-analyze.js` | Standalone screenshot+analyze test script | ✓ VERIFIED | Chains captureScreenshot→analyzeScreenshot, saves test-analysis.json |
| `test-annotate.js` | Full 3-service pipeline test script | ✓ VERIFIED | Chains all three services, saves test-analysis.json and test-annotations.json |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/screenshot.js | screenshotone-api-sdk | `require('screenshotone-api-sdk')` | ✓ WIRED | Line 3, Client constructor, TakeOptions all present |
| src/screenshot.js | .env | SCREENSHOTONE_ACCESS_KEY + SECRET_KEY | ✓ WIRED | getClient() reads both env vars, throws clear error if missing |
| src/analyze.js | @google/genai | `require('@google/genai')` | ✓ WIRED | Line 3, GoogleGenAI + Type imported, ai.models.generateContent called |
| src/analyze.js | src/utils.js | withJsonRetry | ✓ WIRED | Line 4, withJsonRetry wraps full API call at line 85 |
| src/analyze.js | .env | GEMINI_API_KEY | ✓ WIRED | Line 6, passed to GoogleGenAI constructor |
| src/annotate.js | @anthropic-ai/sdk | `require('@anthropic-ai/sdk')` | ✓ WIRED | Line 3, Anthropic client, messages.create called |
| src/annotate.js | src/utils.js | withJsonRetry | ✓ WIRED | Line 4, withJsonRetry wraps full API call at line 70 |
| src/annotate.js | .env | ANTHROPIC_API_KEY | ✓ WIRED | Line 6, passed to Anthropic constructor |

---

## Data-Flow Trace (Level 4)

All three services call external APIs and do not render UI — they produce structured data consumed by the next pipeline stage. Data flow traces are the API call paths.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| src/screenshot.js | buffer, base64 | screenshotone SDK `client.take(options)` → Blob → Buffer.from(arrayBuffer()) | Yes — Blob converted to Buffer, base64 encoded | ✓ FLOWING |
| src/analyze.js | result (JSON) | Gemini `ai.models.generateContent()` → `response.text` → withJsonRetry parses | Yes — API enforces JSON schema via responseMimeType | ✓ FLOWING |
| src/annotate.js | result (JSON) | Claude `client.messages.create()` → `message.content[0].text` → withJsonRetry parses | Yes — real API call, fence stripping + parse with retry | ✓ FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| utils.js exports 8 functions | `node -e "const u = require('./src/utils'); console.log(Object.keys(u).join(','))"` | generateId,ensureOutputDir,cleanupOldFiles,isValidUrl,sanitizeFocus,stripMarkdownFences,withJsonRetry,withTimeout | ✓ PASS |
| withTimeout rejects with label in message | `u.withTimeout(new Promise(r => setTimeout(r, 200)), 50, 'TestStage').catch(e => console.log(e.message))` | "TestStage timed out after 50ms" | ✓ PASS |
| stripMarkdownFences removes fences | `stripMarkdownFences('\`\`\`json\n{"key":"val"}\n\`\`\`')` | {"key":"val"} | ✓ PASS |
| withJsonRetry retries on parse failure | Called with fn returning "not json" then `'{"ok":true}'` | Result: {ok:true}, calls: 2 | ✓ PASS |
| withJsonRetry throws after max attempts | Called with fn always returning "still not json", maxAttempts=2 | Threw after 2 calls | ✓ PASS |
| screenshot.js exports captureScreenshot | `node -e "const s = require('./src/screenshot'); console.log(typeof s.captureScreenshot)"` | "function" | ✓ PASS |
| analyze.js exports analyzeScreenshot | `node -e "const a = require('./src/analyze'); console.log(typeof a.analyzeScreenshot)"` | "function" | ✓ PASS |
| annotate.js exports generateAnnotations | `node -e "const a = require('./src/annotate'); console.log(typeof a.generateAnnotations)"` | "function" | ✓ PASS |
| analyze.js does not use old SDK | grep "@google/generative-ai" src/analyze.js | No match | ✓ PASS |
| annotate.js uses claude-sonnet-4-5 model string | grep present in file | "claude-sonnet-4-5" on line 72 | ✓ PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PIPE-02 | 02-01 | Screenshot captured via screenshotOne API (full page, 1200px viewport, PNG) | ✓ SATISFIED | src/screenshot.js: viewportWidth(1200), fullPage(true), format('png'), screenshotone-api-sdk |
| PIPE-03 | 02-02 | Gemini 2.5 Flash analyzes screenshot and returns structured JSON | ✓ SATISFIED | src/analyze.js: model 'gemini-2.5-flash', responseSchema with all required fields, elements array |
| PIPE-04 | 02-03 | Claude Sonnet writes tutorial-style annotation copy | ✓ SATISFIED | src/annotate.js: model 'claude-sonnet-4-5', cardTitle + cardSubtitle + steps[] output |
| FOCUS-01 | 02-01 | User can optionally provide a focus hint to direct annotations | ✓ SATISFIED | Both analyze.js and annotate.js accept `focus = null` parameter with conditional prompt selection |
| FOCUS-02 | 02-02 | When focus provided, Gemini prioritizes elements relevant to focus goal | ✓ SATISFIED | FOCUS_PROMPT in analyze.js instructs Gemini to select elements relevant to the focus hint |
| FOCUS-03 | 02-03 | When focus provided, Claude aligns all copy to the focus goal | ✓ SATISFIED | FOCUS_PROMPT in annotate.js with {{FOCUS_HINT}} replacement and "tightly aligned to user's goal" instruction |
| FOCUS-04 | 02-02 | When no focus provided, Gemini infers the best annotation topic automatically | ✓ SATISFIED | NO_FOCUS_PROMPT instructs Gemini to infer detectedFocus; schema requires detectedFocus field |
| REL-01 | 02-01 | AI JSON parsing includes retry logic (max 2 attempts) with markdown fence sanitizer | ✓ SATISFIED | withJsonRetry(apiFn, 2) in utils.js; stripMarkdownFences runs before JSON.parse; both AI services use it |
| REL-02 | 02-01 | All pipeline errors return meaningful user-facing messages | ✓ SATISFIED | screenshot: "Screenshot capture failed: ...", analyze: "Analysis failed: could not interpret screenshot — ...", annotate: "Copy generation failed: ..." |

**Orphaned requirements check:** No requirements mapped to Phase 2 in REQUIREMENTS.md are missing from the plan frontmatter. All 9 required IDs (PIPE-02, PIPE-03, PIPE-04, FOCUS-01, FOCUS-02, FOCUS-03, FOCUS-04, REL-01, REL-02) are declared and implemented.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/analyze.js | 6 | `const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })` at module load | ℹ️ Info | SDK logs a warning to console if GEMINI_API_KEY is empty at require time but does NOT throw — module loads cleanly. Error surfaces at call time. Lower severity than screenshot.js issue which would crash the constructor (hence screenshot.js uses lazy getClient()). Asymmetry in error behavior between the two AI services, but both ultimately fail with a useful error. |
| src/annotate.js | 6 | `const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` at module load | ℹ️ Info | Anthropic SDK creates client without throwing when apiKey is undefined (lazy validation). Error surfaces at call time via 401. Same pattern as analyze.js. Not a blocker. |
| src/annotate.js | prompts | No explicit step-count-to-element-count linkage | ⚠️ Warning | Phase success criterion 5 states "Steps array matches the number of elements from analysis input." Neither FOCUS_PROMPT nor NO_FOCUS_PROMPT instructs Claude to produce exactly one step per element. Claude will produce an arbitrary step count. This is the gap item. |

---

## Human Verification Required

### 1. Step Count Alignment

**Test:** Run `node test-annotate.js https://github.com "How to create a repository"` with real API keys, then compare `analysis.elements.length` vs `annotations.steps.length`
**Expected:** Both counts are equal (e.g., if Gemini returns 4 elements, Claude returns 4 steps)
**Why human:** Cannot call live APIs without real credentials; current prompt does not guarantee this behavior

### 2. Focus Hint Reflection in Output

**Test:** Run `node test-annotate.js https://stripe.com "How to set up a payment"` with real API keys
**Expected:** `detectedFocus` in analysis contains "payment", and `cardTitle` in annotations starts with a verb and references payment setup
**Why human:** Requires live API calls to verify focus propagation through both AI services

### 3. No-Focus Inferred Topic Alignment

**Test:** Run `node test-annotate.js https://notion.so` with no focus argument
**Expected:** Gemini returns a non-empty `detectedFocus` and Claude's `cardTitle` aligns thematically to that inferred focus
**Why human:** Requires live API calls; focus-alignment is semantic and cannot be checked programmatically

---

## Gaps Summary

One gap found, severity: warning.

**Success criterion 5** — "Steps array matches the number of elements from analysis input" — is not guaranteed by the implementation. The `generateAnnotations` function passes the full analysis JSON (including the elements array) to Claude, but neither prompt template instructs Claude to produce exactly one step per element. Claude will likely produce a plausible number of steps but there is no constraint enforcing the match.

This does not block the pipeline from running — Phase 3 (template rendering) will receive a steps array of some length and render it. However, if the card template expects step count to match element count for positioning annotations on the screenshot crop, a mismatch will cause visual issues in Phase 3.

The fix is a one-line addition to both prompt templates: instruct Claude to produce exactly one step for each element in the elements array.

---

_Verified: 2026-04-04T11:00:00Z_
_Verifier: Claude (gsd-verifier)_
