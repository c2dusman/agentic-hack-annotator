<!-- generated-by: gsd-doc-writer -->
# Testing

AnnotatorAI uses a manual, script-based testing approach rather than an automated test framework. There are no Jest, Vitest, or Mocha dependencies in `package.json`. Each test script is a standalone Node.js file that exercises one layer of the pipeline, exits with code `0` on success or `1` on failure, and prints clear PASS/FAIL output to stdout.

---

## Test framework and setup

| Aspect | Detail |
|--------|--------|
| Framework | None — plain Node.js async scripts with manual assertions |
| Test runner | `node <script>` directly |
| Assertion style | `throw new Error(...)` on failure; `process.exit(1)` in the catch handler |
| Test location | Root-level scripts (`test-*.js`) + `tests/` directory |
| Environment | Requires a valid `.env` file with all API keys present |

Before running any test, ensure the environment is configured:

```bash
cp .env.example .env   # if not already done
# Fill in SCREENSHOTONE_ACCESS_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY
```

Ensure dependencies are installed:

```bash
npm install
```

On a fresh Linux VPS, Puppeteer's bundled Chromium also requires system libraries. Install them once:

```bash
npx puppeteer browsers install chrome
```

---

## Running tests

### Individual test scripts

Each script is self-contained and can be run independently. All scripts accept an optional URL argument; they default to `https://example.com`.

#### 1. Screenshot capture — `test-screenshot.js`

Tests the ScreenshotOne API integration (`src/screenshot.js`). Captures a URL, saves the PNG to `output/test-screenshot.png`, and reports file size and timing.

```bash
node test-screenshot.js
# or with a custom URL:
node test-screenshot.js https://yoursite.com
```

Expected output:
```
Capturing screenshot: https://example.com
OK — saved to output/test-screenshot.png
  Size: <bytes>
  Base64 length: <chars>
  Time: <s>s
```

#### 2. Gemini analysis — `test-analyze.js`

Tests screenshot capture followed by Gemini 2.5 Flash vision analysis (`src/analyze.js`). Saves structured JSON to `output/test-analysis.json`.

```bash
node test-analyze.js
node test-analyze.js https://yoursite.com "focus hint"
```

Expected output includes `pageTitle`, `pageTopic`, `detectedFocus`, and a list of detected UI elements with their IDs, labels, and positions.

#### 3. Full annotation pipeline — `test-annotate.js`

Tests the complete three-stage pipeline: screenshot capture → Gemini analysis → Claude copywriting (`src/annotate.js`). Saves both analysis and annotations JSON to `output/`.

```bash
node test-annotate.js
node test-annotate.js https://yoursite.com "focus hint"
```

Expected output shows timing for each stage and the final card title, subtitle, and step annotations.

#### 4. Puppeteer smoke test — `test-puppeteer.js`

Verifies that the Puppeteer/Chromium environment is functional. Navigates to `example.com` and saves a screenshot to `/tmp/test-screenshot.png`. Does not use any project source modules — useful for isolating VPS environment issues.

```bash
node test-puppeteer.js
```

Expected output:
```
Puppeteer OK — screenshot saved to /tmp/test-screenshot.png
```

#### 5. Card renderer — `tests/test-render.js`

Tests `src/render.js` using synthetic mock data. Creates a blue PNG in memory with Sharp (no network calls), renders two card variants (with and without a focus badge), and asserts:

- Output file is created on disk
- Dimensions are exactly 1080 × 1920 px
- Format is PNG
- File size is between 1 KB and 500 KB (validates Sharp compression)

Both output files are deleted on success, leaving no artifacts.

```bash
node tests/test-render.js
```

Expected output:
```
Creating mock screenshot...
Test 1: renderCard with focus hint...
  Output: <uuid>.png
  PASS: 1080x1920 PNG with focus
Test 2: renderCard without focus hint...
  PASS: 1080x1920 PNG without focus
  File size: <n>KB
  PASS: file size reasonable

All render tests passed!
```

---

## Writing new tests

Follow the established pattern for new test scripts:

1. Place root-level integration tests (those hitting live APIs) in the project root as `test-<feature>.js`.
2. Place unit/offline tests (those using mock data, no network) under `tests/test-<feature>.js`.
3. Load environment variables at the top: `require('dotenv').config();`
4. Use `process.argv[2]` for a URL argument where relevant, with a safe default.
5. Wrap the entire body in an async IIFE and attach `.catch(err => { console.error('FAILED:', err.message); process.exit(1); })`.
6. Use explicit `throw new Error(...)` to assert expected values — avoid silent failures.
7. Clean up any files written to `output/` before the script exits.

Example skeleton:

```js
'use strict';
require('dotenv').config();
const { myModule } = require('./src/my-module');

(async () => {
  const result = await myModule('input');

  if (!result.expectedField) throw new Error('expectedField missing from result');
  console.log('PASS:', result.expectedField);
})().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
```

---

## Coverage requirements

There is no automated coverage tooling configured. The current test suite provides manual coverage at the module boundary level:

| Module | Covered by |
|--------|------------|
| `src/screenshot.js` | `test-screenshot.js`, `test-analyze.js`, `test-annotate.js` |
| `src/analyze.js` | `test-analyze.js`, `test-annotate.js` |
| `src/annotate.js` | `test-annotate.js` |
| `src/render.js` | `tests/test-render.js` |
| `src/utils.js` | Indirectly via all integration scripts |
| `server.js` (Express routes) | Not covered by automated tests <!-- VERIFY: no HTTP-level test exists for the /generate endpoint --> |

The render test (`tests/test-render.js`) is the only fully offline test suitable for running in a CI environment without API keys. All other scripts require live API credentials.

---

## CI integration

There are no CI workflows configured in this repository (no `.github/workflows/` directory). <!-- VERIFY: no CI pipelines exist on the Hostinger VPS or any other CI provider -->

If CI is added in the future, the recommended approach is:

1. Run the offline render test as a gate on every push — it requires no API keys and validates the core image output contract:

   ```yaml
   - name: Run render test
     run: node tests/test-render.js
   ```

2. Run integration tests (`test-screenshot.js`, `test-analyze.js`, `test-annotate.js`) only on scheduled runs or manual dispatch, using repository secrets for API keys.

3. Set a timeout of at least 60 seconds per integration test script, as Gemini and Claude API calls can take 10–30 seconds each.
