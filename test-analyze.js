'use strict';
require('dotenv').config();
const { captureScreenshot } = require('./src/screenshot');
const { analyzeScreenshot } = require('./src/analyze');
const { ensureOutputDir } = require('./src/utils');
const fs = require('fs');
const path = require('path');

(async () => {
  ensureOutputDir();
  const url = process.argv[2] || 'https://example.com';
  const focus = process.argv[3] || null;

  console.log(`URL: ${url}`);
  console.log(`Focus: ${focus || '(none — Gemini will infer)'}`);

  // Step 1: Capture screenshot
  console.log('\n1. Capturing screenshot...');
  const { base64 } = await captureScreenshot(url);
  console.log(`   Screenshot captured (${base64.length} chars base64)`);

  // Step 2: Analyze with Gemini
  console.log('2. Analyzing with Gemini 2.5 Flash...');
  const start = Date.now();
  const analysis = await analyzeScreenshot(base64, focus);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  // Step 3: Save and display results
  const outPath = path.join('./output', 'test-analysis.json');
  fs.writeFileSync(outPath, JSON.stringify(analysis, null, 2));
  console.log(`   Analysis complete in ${elapsed}s`);
  console.log(`   Saved to ${outPath}`);
  console.log('\nResult:');
  console.log(`  pageTitle: ${analysis.pageTitle}`);
  console.log(`  pageTopic: ${analysis.pageTopic}`);
  console.log(`  detectedFocus: ${analysis.detectedFocus}`);
  console.log(`  elements: ${analysis.elements.length} items`);
  analysis.elements.forEach(el => {
    console.log(`    [${el.id}] ${el.label} (${el.position})`);
  });
})().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
