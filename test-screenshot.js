'use strict';
require('dotenv').config();
const { captureScreenshot } = require('./src/screenshot');
const { ensureOutputDir } = require('./src/utils');
const fs = require('fs');
const path = require('path');

(async () => {
  ensureOutputDir();
  const url = process.argv[2] || 'https://example.com';
  console.log(`Capturing screenshot: ${url}`);
  const start = Date.now();
  const { buffer, base64 } = await captureScreenshot(url);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const outPath = path.join('./output', 'test-screenshot.png');
  fs.writeFileSync(outPath, buffer);
  console.log(`OK — saved to ${outPath}`);
  console.log(`  Size: ${buffer.length} bytes`);
  console.log(`  Base64 length: ${base64.length}`);
  console.log(`  Time: ${elapsed}s`);
})().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
