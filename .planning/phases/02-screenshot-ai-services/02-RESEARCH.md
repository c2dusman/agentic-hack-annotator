# Phase 2: Screenshot + AI Services - Research

**Researched:** 2026-04-04
**Domain:** screenshotOne API, Google Gemini 2.5 Flash (@google/genai), Anthropic Claude Sonnet (@anthropic-ai/sdk)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Follow brief prompts exactly as written in annotator-project-brief.md §6 — no adaptation unless output quality is poor
- **D-02:** Gemini uses strict schema enforcement via `responseMimeType: 'application/json'` and `responseSchema` — API enforces exact JSON shape, no manual parsing
- **D-03:** Claude returns structured JSON `{cardTitle, cardSubtitle, steps[]}` — not plain text with parsing
- **D-04:** Gemini elements[] array fixed at 3-5 elements — predictable for template layout, avoids overflow
- **D-05:** screenshotOne viewport width: 1200px (per brief spec)
- **D-06:** Screenshot format: PNG full quality — lossless input for best Gemini vision analysis
- **D-07:** AI calls (Gemini + Claude) retry up to 2 times on unparseable output — strip markdown fences before retrying (per REL-01)
- **D-08:** screenshotOne retries once on timeout/5xx — fail after that
- **D-09:** Error messages are stage-specific: "Screenshot capture failed", "Analysis failed: could not interpret screenshot", "Copy generation failed" — per REL-02
- **D-10:** Total pipeline timeout: 60 seconds hard cap — typical run 10-30s, 60s catches edge cases
- **D-11:** Standalone test scripts per service: `test-screenshot.js`, `test-analyze.js`, `test-annotate.js` — run via `node test-xxx.js`
- **D-12:** Default test URL: https://example.com — simple, always available, fast
- **D-13:** Test scripts save output files to `/output` directory — screenshot PNG and JSON responses for visual inspection, auto-cleaned by existing cleanup logic

### Claude's Discretion

- Full-page vs viewport-only screenshot capture — pick what gives Gemini the best analysis input
- screenshotOne wait strategy for JS-heavy pages (delay + network idle vs timeout) — balance reliability and speed

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-02 | Screenshot captured via screenshotOne API (full page, 1200px viewport, PNG) | screenshotone-api-sdk TakeOptions confirmed: `.fullPage(true).viewportWidth(1200).format('png')`. SDK returns Blob — must convert to Buffer. |
| PIPE-03 | Gemini 2.5 Flash analyzes screenshot and returns structured JSON (pageTitle, pageTopic, detectedFocus, elements[]) | `ai.models.generateContent()` with `config.responseMimeType: 'application/json'` and `config.responseSchema` enforces schema at API level. |
| PIPE-04 | Claude Sonnet writes tutorial-style annotation copy (cardTitle, cardSubtitle, steps[]) | `client.messages.create()` with `max_tokens: 1024`. Claude does not natively enforce JSON output schemas — use prompt instruction + retry logic. |
| FOCUS-01 | User can optionally provide a focus hint to direct annotations | `focus` parameter flows through `analyzeScreenshot(base64, focus)` and `generateAnnotations(analysisData, focus)`. Null check selects prompt variant. |
| FOCUS-02 | When focus provided, Gemini prioritizes elements relevant to the focus goal | Focus-aware prompt template from brief §6.2 injected into Gemini request. |
| FOCUS-03 | When focus provided, Claude aligns all copy to the focus goal | Focus-aware prompt template from brief §6.3 injected into Claude request. |
| FOCUS-04 | When no focus provided, Gemini infers the best annotation topic automatically | No-focus prompt template from brief §6.2 — Gemini returns `detectedFocus` in JSON. |
| REL-01 | AI JSON parsing includes retry logic (max 2 attempts) with markdown fence sanitizer | Strip ` ```json ` / ` ``` ` fences, then `JSON.parse()`. Retry up to 2 times on parse failure. |
| REL-02 | All pipeline errors return meaningful user-facing messages | Stage-specific throws: "Screenshot capture failed", "Analysis failed: could not interpret screenshot", "Copy generation failed". |
</phase_requirements>

---

## Summary

Phase 2 implements three self-contained service modules: `screenshot.js` (screenshotOne capture), `analyze.js` (Gemini vision), and `annotate.js` (Claude copywriting). All dependencies are already installed in `node_modules` and all three stubs have the correct function signatures from Phase 1. The phase is primarily an implementation task — filling stubs with real API calls, prompts, and retry logic.

The most important finding from research is a **critical gap in the screenshotone-api-sdk integration**: the SDK's `Client` constructor requires **both** `accessKey` AND `secretKey` (`new Client(accessKey, secretKey)`), but the current `.env.example` only defines `SCREENSHOTONE_ACCESS_KEY`. A `SCREENSHOTONE_SECRET_KEY` env var must be added. Additionally, `client.take()` returns a `Blob` (not a Buffer), so the implementation must call `Buffer.from(await blob.arrayBuffer())` to produce the `{ buffer, base64 }` return value the module spec requires.

For Gemini, `@google/genai` 1.x uses `ai.models.generateContent({ model, contents, config })`. The `config` object accepts `responseMimeType: 'application/json'` and `responseSchema` — these are confirmed present in the installed SDK (v1.48.0). Inline image data uses `inlineData: { data: base64String, mimeType: 'image/png' }` in the `contents` array. For Claude, `client.messages.create()` is the correct method — Claude does not offer API-level JSON schema enforcement, so retry logic with markdown fence stripping is the correct reliability approach (matching D-07 and REL-01).

**Primary recommendation:** Implement the three modules in dependency order (screenshot → analyze → annotate), add the missing `SCREENSHOTONE_SECRET_KEY` env var, then write the three standalone test scripts. Focus on the Blob-to-Buffer conversion and the retry wrapper as shared infrastructure.

---

## Project Constraints (from CLAUDE.md)

| Constraint | Directive |
|-----------|-----------|
| Runtime | Node.js 20.x — no ESM, CommonJS only |
| AI SDK (Gemini) | Use `@google/genai` ^1.x — NOT `@google/generative-ai` (frozen at 0.24.x) |
| AI SDK (Claude) | Use `@anthropic-ai/sdk` ^0.82.x |
| HTTP | Use Node.js native `fetch` — no axios, no node-fetch |
| Error handling | All pipeline steps wrapped in try/catch, stage-specific messages |
| Cost | Keep API usage lean — ~$0.03-0.05 per generation |
| Modules | CommonJS `require()` — no `import/export` |

---

## Standard Stack

### Core (already installed)

| Library | Installed Version | Purpose | API Entry Point |
|---------|------------------|---------|-----------------|
| screenshotone-api-sdk | 1.1.21 | Capture URL as PNG via ScreenshotOne REST API | `new Client(accessKey, secretKey)`, `TakeOptions`, `client.take(options)` |
| @google/genai | 1.48.0 | Gemini 2.5 Flash vision analysis with JSON schema enforcement | `new GoogleGenAI({ apiKey })`, `ai.models.generateContent()` |
| @anthropic-ai/sdk | 0.82.0 | Claude Sonnet copywriting | `new Anthropic({ apiKey })`, `client.messages.create()` |
| dotenv | ^17 | Load API keys from .env | Already required in server.js |

**Version verification:** All versions confirmed via `npm view` on 2026-04-04. These are current registry versions.

---

## Architecture Patterns

### Recommended Module Structure

Each of the three modules follows the same pattern:
```
src/screenshot.js  — async captureScreenshot(url) → { buffer, base64 }
src/analyze.js     — async analyzeScreenshot(base64Image, focus=null) → { pageTitle, pageTopic, detectedFocus, elements[] }
src/annotate.js    — async generateAnnotations(analysisData, focus=null) → { cardTitle, cardSubtitle, steps[] }
```

### Pattern 1: screenshotone-api-sdk Call Pattern

**What:** Construct `TakeOptions`, create `Client` with both keys, call `take()`, convert Blob to Buffer.

**Critical detail:** `Client` requires both `accessKey` and `secretKey`. The `take()` method returns a `Blob` (verified in source). Must convert to Buffer.

```javascript
// Source: node_modules/screenshotone-api-sdk/README.md + src inspection
const screenshotone = require('screenshotone-api-sdk');

const client = new screenshotone.Client(
  process.env.SCREENSHOTONE_ACCESS_KEY,
  process.env.SCREENSHOTONE_SECRET_KEY   // REQUIRED — not in .env.example yet
);

const options = screenshotone.TakeOptions
  .url(url)
  .viewportWidth(1200)
  .viewportHeight(800)
  .format('png')
  .fullPage(true)
  .blockAds(true)
  .blockCookieBanners(true);

const imageBlob = await client.take(options);
const buffer = Buffer.from(await imageBlob.arrayBuffer());
const base64 = buffer.toString('base64');
return { buffer, base64 };
```

**Error handling:** `client.take()` throws `screenshotone.APIError` on non-200. Catch and rethrow with "Screenshot capture failed" message.

### Pattern 2: Gemini Vision with Structured Output

**What:** Pass base64 image as `inlineData` part + text prompt. Use `responseMimeType: 'application/json'` and `responseSchema` to enforce JSON shape at API level.

```javascript
// Source: @google/genai README + index.cjs inspection (confirmed responseMimeType/responseSchema present)
const { GoogleGenAI, Type } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    {
      parts: [
        { text: promptText },
        {
          inlineData: {
            data: base64ImageString,
            mimeType: 'image/png'
          }
        }
      ]
    }
  ],
  config: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        pageTitle: { type: Type.STRING },
        pageTopic: { type: Type.STRING },
        detectedFocus: { type: Type.STRING },
        elements: {
          type: Type.ARRAY,
          minItems: 3,
          maxItems: 5,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.NUMBER },
              label: { type: Type.STRING },
              description: { type: Type.STRING },
              position: { type: Type.STRING }
            },
            required: ['id', 'label', 'description', 'position']
          }
        }
      },
      required: ['pageTitle', 'pageTopic', 'detectedFocus', 'elements']
    }
  }
});

const result = JSON.parse(response.text);
```

**Note:** Because `responseMimeType: 'application/json'` is used, Gemini's response should always be parseable JSON. The retry logic (D-07/REL-01) is still required as a safety net for edge cases where the model ignores schema enforcement.

### Pattern 3: Claude Messages API

**What:** `client.messages.create()` with role/content structure. Claude has no API-level JSON schema enforcement — use prompt instruction + retry with fence stripping.

```javascript
// Source: @anthropic-ai/sdk README + confirmed client.messages.create() method
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const message = await client.messages.create({
  model: 'claude-sonnet-4-20250514',   // per annotator-project-brief.md §2 — verify at build time
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: promptText   // includes PAGE_ANALYSIS_JSON inline
    }
  ]
});

const rawText = message.content[0].text;
// Apply retry wrapper with fence stripping (see Pattern 4)
```

**Model string note:** Brief §2 specifies `claude-sonnet-4-20250514`. CLAUDE.md research says verify at `platform.claude.ai/docs/en/about-claude/models/overview` before coding. Both sources agree on Sonnet 4 — use `claude-sonnet-4-20250514` unless the model list shows a newer string.

### Pattern 4: Retry Wrapper with Markdown Fence Stripping (REL-01)

**What:** Shared retry logic for both Gemini and Claude JSON parsing. Strips ` ```json ` / ` ``` ` fences then attempts `JSON.parse()`. Retries the API call (not just the parse) up to 2 times.

```javascript
// Fence stripper utility — use in both analyze.js and annotate.js
function stripMarkdownFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

// Retry wrapper pattern
async function withJsonRetry(apiFn, maxAttempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const rawText = await apiFn();
      const cleaned = stripMarkdownFences(rawText);
      return JSON.parse(cleaned);
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        // retry — apiFn will be called again
      }
    }
  }
  throw lastError;
}
```

**Important:** The retry calls the entire API function again (not just re-parses). This handles cases where the model produces malformed output due to transient state.

### Pattern 5: Focus-Aware Prompt Selection

**What:** Both `analyzeScreenshot` and `generateAnnotations` select a prompt variant based on whether `focus` is null or a non-empty string. Use the exact prompt templates from `annotator-project-brief.md` §6.

```javascript
// Pattern for both analyze.js and annotate.js
function buildPrompt(focus, analysisData = null) {
  if (focus) {
    // focus-aware variant — inject focus into {{FOCUS_HINT}} placeholder
    return FOCUS_PROMPT_TEMPLATE.replace('{{FOCUS_HINT}}', focus)
      .replace('{{PAGE_ANALYSIS_JSON}}', JSON.stringify(analysisData, null, 2));
  } else {
    // no-focus variant — Gemini infers / Claude uses detectedFocus
    return NO_FOCUS_PROMPT_TEMPLATE
      .replace('{{PAGE_ANALYSIS_JSON}}', JSON.stringify(analysisData, null, 2));
  }
}
```

### Anti-Patterns to Avoid

- **Using `@google/generative-ai` (old SDK):** Frozen at 0.24.x, no structured output enforcement, lacks `gemini-2.5-flash` support. Use `@google/genai` ^1.x exclusively.
- **`client.take()` output used directly as Buffer:** Returns `Blob`, not `Buffer`. Must call `Buffer.from(await blob.arrayBuffer())`.
- **Instantiating `screenshotone.Client` with only one key:** Constructor throws immediately if `secretKey` is falsy. Both env vars must exist.
- **Retrying only the JSON parse (not the API call):** If the model returns malformed JSON once, re-parsing the same string will fail again. The retry must re-invoke the API call.
- **Hardcoding the Claude model string:** Brief specifies `claude-sonnet-4-20250514`. Verify against the Anthropic models page before coding — model strings can change with new releases.
- **Using `axios` or `node-fetch` for any HTTP calls:** Node.js 20 has native `fetch`. Not needed here anyway since both SDKs handle their own HTTP.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signed URL generation for screenshotOne | Custom HMAC signing | `screenshotone-api-sdk` `Client.generateSignedTakeURL()` | The SDK already handles signing; rolling your own is error-prone and brittle against API changes |
| Image fetch + buffer conversion | `fetch()` + manual stream reading | `client.take()` + `Buffer.from(await blob.arrayBuffer())` | SDK handles the HTTP fetch, error classification, and status checks |
| JSON schema enforcement in Gemini | Regex or manual field validation | `config.responseMimeType + responseSchema` in generateContent | API-level enforcement eliminates nearly all parse failures before retry is even needed |
| Multipart image encoding for Gemini | Base64 chunking + MIME construction | `inlineData: { data, mimeType }` in the parts array | SDK handles encoding details |

**Key insight:** All three SDKs are mature and handle the hard parts (auth, signing, encoding, error classification). Implementation is primarily about wiring prompts and data transformation, not HTTP mechanics.

---

## Common Pitfalls

### Pitfall 1: Missing SCREENSHOTONE_SECRET_KEY

**What goes wrong:** `new screenshotone.Client(accessKey, secretKey)` throws `"Both non-empty access and secret keys are required"` immediately on module load/call.

**Why it happens:** The `.env.example` only defines `SCREENSHOTONE_ACCESS_KEY`. The SDK README example shows both keys. The brief §4 also only lists one key.

**How to avoid:** Add `SCREENSHOTONE_SECRET_KEY=your_secret_here` to `.env.example` and `.env`. Update the Client instantiation to read both.

**Warning signs:** `Error: Both non-empty access and secret keys are required` in the test script output.

### Pitfall 2: Blob vs Buffer Confusion from screenshotOne

**What goes wrong:** `client.take()` returns a `Blob`. Passing a Blob directly to `buffer.toString('base64')` or writing it to disk fails silently or throws.

**Why it happens:** The `Blob` type is a web API object (available in Node.js 18+), not a Node.js `Buffer`. They have different APIs.

**How to avoid:** Always convert: `const buffer = Buffer.from(await imageBlob.arrayBuffer())`.

**Warning signs:** `TypeError: blob.toString is not a function` or garbled binary output.

### Pitfall 3: @google/genai `contents` Array Structure

**What goes wrong:** Passing `contents` as a plain string (like the README quickstart shows for text-only) when doing multimodal input causes a type error or the image is ignored.

**Why it happens:** Text-only quickstart uses `contents: 'string'`. Multimodal requires `contents: [{ parts: [{ text }, { inlineData }] }]`.

**How to avoid:** Always use the array-of-parts structure when sending an image. Verified: `inlineData: { data: base64String, mimeType: 'image/png' }` is the correct key name (confirmed in SDK source at `dist/index.cjs` line 4733).

**Warning signs:** Gemini returns a response that references no visual elements — it's only seeing the text prompt.

### Pitfall 4: Claude Model String Staleness

**What goes wrong:** Using a Claude model string that no longer exists results in a 404 or 400 from the Anthropic API.

**Why it happens:** Anthropic regularly updates model strings. The brief specifies `claude-sonnet-4-20250514` which was current at brief writing time (March 2026) but the research timestamp is April 2026.

**How to avoid:** Verify the model string at `https://platform.claude.ai/docs/en/about-claude/models/overview` before implementing `annotate.js`. Use the most current Sonnet 4 string listed.

**Warning signs:** `anthropic.BadRequestError: model: string does not match known models`.

### Pitfall 5: Retry Retrying the Parse Instead of the API Call

**What goes wrong:** Retry loop catches `JSON.parse` error but calls `JSON.parse(rawText)` again with the same raw text — always fails again.

**Why it happens:** Confusing "retry the parse" with "retry the request".

**How to avoid:** The retry loop must re-invoke the full API call function (Gemini or Claude request), not re-parse the same stored text.

**Warning signs:** Seeing the same parse error twice in logs with no network calls in between.

### Pitfall 6: screenshotOne Full-Page vs Viewport Decision (Claude's Discretion)

**What to use:** Full page (`.fullPage(true)`) is the correct choice for Gemini vision analysis. Full-page capture gives Gemini more context about the page structure, navigation, and below-fold content. This is the brief's specified default and is confirmed in the pipeline spec (§5).

**Wait strategy:** Use `.delay(2)` (2-second delay) as the default wait strategy. This catches most JS-rendered pages without adding excessive latency. For the test URL `https://example.com`, no delay is needed but delay(2) is a safe default.

---

## Code Examples

### Full screenshotOne integration (screenshot.js)

```javascript
// Source: screenshotone-api-sdk README + constructor/take() source inspection
'use strict';
require('dotenv').config();
const screenshotone = require('screenshotone-api-sdk');

const client = new screenshotone.Client(
  process.env.SCREENSHOTONE_ACCESS_KEY,
  process.env.SCREENSHOTONE_SECRET_KEY
);

async function captureScreenshot(url) {
  const options = screenshotone.TakeOptions
    .url(url)
    .viewportWidth(1200)
    .viewportHeight(800)
    .format('png')
    .fullPage(true)
    .blockAds(true)
    .blockCookieBanners(true)
    .delay(2);

  try {
    const imageBlob = await client.take(options);
    const buffer = Buffer.from(await imageBlob.arrayBuffer());
    const base64 = buffer.toString('base64');
    return { buffer, base64 };
  } catch (err) {
    throw new Error(`Screenshot capture failed: ${err.message}`);
  }
}

module.exports = { captureScreenshot };
```

### Gemini generateContent with inlineData (analyze.js skeleton)

```javascript
// Source: @google/genai README + dist/index.cjs inlineData/responseMimeType confirmation
const { GoogleGenAI, Type } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function callGemini(base64ImageString, promptText) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        parts: [
          { text: promptText },
          { inlineData: { data: base64ImageString, mimeType: 'image/png' } }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: { /* full schema here */ }
    }
  });
  return response.text;
}
```

### Anthropic messages.create (annotate.js skeleton)

```javascript
// Source: @anthropic-ai/sdk — client.messages confirmed via runtime introspection
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function callClaude(promptText) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',  // verify before coding
    max_tokens: 1024,
    messages: [{ role: 'user', content: promptText }]
  });
  return message.content[0].text;
}
```

### Retry + fence-strip wrapper

```javascript
function stripMarkdownFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

async function withJsonRetry(apiFn, maxAttempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const rawText = await apiFn();
      return JSON.parse(stripMarkdownFences(rawText));
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
```

### Test script pattern (test-screenshot.js)

```javascript
// D-11: standalone test scripts, D-12: default test URL, D-13: save to /output
'use strict';
require('dotenv').config();
const { captureScreenshot } = require('./src/screenshot');
const { ensureOutputDir } = require('./src/utils');
const fs = require('fs');
const path = require('path');

(async () => {
  ensureOutputDir();
  const url = process.argv[2] || 'https://example.com';
  console.log(`Capturing: ${url}`);
  const { buffer } = await captureScreenshot(url);
  const outPath = path.join('./output', 'test-screenshot.png');
  fs.writeFileSync(outPath, buffer);
  console.log(`Saved to ${outPath} (${buffer.length} bytes)`);
})().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @google/genai | analyze.js | Yes | 1.48.0 (in node_modules) | — |
| @anthropic-ai/sdk | annotate.js | Yes | 0.82.0 (in node_modules) | — |
| screenshotone-api-sdk | screenshot.js | Yes | 1.1.21 (in node_modules) | — |
| SCREENSHOTONE_ACCESS_KEY | screenshot.js | Unknown — must be set on VPS | — | No fallback — blocks screenshot |
| SCREENSHOTONE_SECRET_KEY | screenshot.js | MISSING from .env.example | — | No fallback — blocks screenshot |
| GEMINI_API_KEY | analyze.js | Unknown — must be set on VPS | — | No fallback — blocks analysis |
| ANTHROPIC_API_KEY | annotate.js | Unknown — must be set on VPS | — | No fallback — blocks copywriting |
| Node.js 20 | All modules | Yes (VPS verified Phase 1) | 20.x | — |

**Missing dependencies with no fallback:**
- `SCREENSHOTONE_SECRET_KEY` — not in `.env.example`, not in STATE.md blockers note which only mentions access key. Plan must add this env var to `.env.example` and document it.
- API keys confirmed set on VPS per CONTEXT.md "Specifics" section but screenshotOne secret key presence is unverified — the test script will surface this immediately.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@google/generative-ai` (old SDK) | `@google/genai` ^1.x | ~2024 | New SDK has structured output enforcement, newer model IDs |
| `headless: 'new'` in Puppeteer | `headless: true` (default) | Puppeteer v22 | String form deprecated — not relevant for Phase 2 (no Puppeteer) |
| Manual JSON parsing with regex | `responseMimeType: 'application/json'` + `responseSchema` | @google/genai 1.x | API enforces schema, eliminates most parse failures |
| `model: 'claude-sonnet-4-20250514'` (brief date) | Verify current string before coding | April 2026 | Anthropic may have released newer Sonnet variants |

---

## Open Questions

1. **SCREENSHOTONE_SECRET_KEY on VPS**
   - What we know: SDK requires both access key AND secret key. Brief and `.env.example` only mention access key.
   - What's unclear: Whether the user has a secret key configured on the VPS `.env` file.
   - Recommendation: Plan must include a task to update `.env.example` with `SCREENSHOTONE_SECRET_KEY` and instruct the user to add it to VPS `.env` before running the test script. The test script will fail with a clear error if either key is missing.

2. **Current Claude model string**
   - What we know: Brief §2 specifies `claude-sonnet-4-20250514`. Research date is April 2026.
   - What's unclear: Whether a newer Sonnet 4 model string is available (e.g. `claude-sonnet-4-5` mentioned in CLAUDE.md research).
   - Recommendation: Plan task for `annotate.js` must include verification step: check `https://platform.claude.ai/docs/en/about-claude/models/overview`. Use the most current Claude Sonnet 4 string. If CLAUDE.md says `claude-sonnet-4-5`, that may be newer than the brief's `claude-sonnet-4-20250514` — confirm which is canonical.

3. **screenshotOne `delay()` default value**
   - What we know: `.delay(2)` is a 2-second delay before capture. Brief doesn't specify a delay value.
   - What's unclear: Whether 2 seconds is the right balance for the deadline vs JS-heavy pages.
   - Recommendation: Use `.delay(2)` as the default. Claude's discretion item says "balance reliability and speed". 2 seconds is a reasonable baseline — the test URL (`https://example.com`) loads instantly so the test won't be impacted.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/screenshotone-api-sdk/README.md` + `dist/main.js` runtime inspection — Client constructor signature (both keys required), `take()` returns Blob, `TakeOptions` method chaining confirmed
- `node_modules/@google/genai/README.md` + `dist/index.cjs` grep — `responseMimeType`, `responseSchema`, `inlineData` confirmed present in installed v1.48.0
- `node_modules/@anthropic-ai/sdk` runtime introspection — `client.messages.create()`, `client.messages.parse()`, `client.messages.stream()`, `client.messages.countTokens()` confirmed
- `annotator-project-brief.md` §6, §8 — exact prompt templates, function signatures, return types, error messages
- Phase 1 verification report (`01-VERIFICATION.md`) — confirmed CommonJS, bundled Puppeteer Chromium, no executablePath, VPS is Node.js 20 with all packages installed

### Secondary (MEDIUM confidence)
- `npm view screenshotone-api-sdk version` → 1.1.21 (current)
- `npm view @google/genai version` → 1.48.0 (current)
- `npm view @anthropic-ai/sdk version` → 0.82.0 (current)

### Tertiary (LOW confidence — flag for validation)
- Claude model string `claude-sonnet-4-20250514` from `annotator-project-brief.md` §2 — may be superseded by newer Sonnet 4 variant. Verify at build time.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all three SDKs installed, methods confirmed via runtime introspection
- Architecture: HIGH — patterns derived from SDK source + README, not training data
- Pitfalls: HIGH — Blob vs Buffer and missing secret key confirmed by reading actual SDK source
- Prompt templates: HIGH — taken verbatim from `annotator-project-brief.md` (locked decision D-01)

**Research date:** 2026-04-04
**Valid until:** 2026-04-10 (stable SDKs, but Claude model string may update — verify before coding)
