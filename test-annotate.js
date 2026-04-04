'use strict';
require('dotenv').config();
const { captureScreenshot } = require('./src/screenshot');
const { analyzeScreenshot } = require('./src/analyze');
const { generateAnnotations } = require('./src/annotate');
const { ensureOutputDir } = require('./src/utils');
const fs = require('fs');
const path = require('path');

(async () => {
  ensureOutputDir();
  const url = process.argv[2] || 'https://example.com';
  const focus = process.argv[3] || null;

  console.log(`URL: ${url}`);
  console.log(`Focus: ${focus || '(none — AI will infer)'}`);
  console.log('');

  // Step 1: Screenshot
  console.log('1. Capturing screenshot...');
  const startScreenshot = Date.now();
  const { base64 } = await captureScreenshot(url);
  console.log(`   Done (${((Date.now() - startScreenshot) / 1000).toFixed(1)}s)`);

  // Step 2: Gemini Analysis
  console.log('2. Analyzing with Gemini...');
  const startAnalysis = Date.now();
  const analysis = await analyzeScreenshot(base64, focus);
  console.log(`   Done (${((Date.now() - startAnalysis) / 1000).toFixed(1)}s)`);
  console.log(`   Focus: ${analysis.detectedFocus}`);
  console.log(`   Elements: ${analysis.elements.length}`);

  // Step 3: Claude Copywriting
  console.log('3. Generating copy with Claude...');
  const startCopy = Date.now();
  const annotations = await generateAnnotations(analysis, focus);
  console.log(`   Done (${((Date.now() - startCopy) / 1000).toFixed(1)}s)`);

  // Save all outputs
  const analysisPath = path.join('./output', 'test-analysis.json');
  const annotationsPath = path.join('./output', 'test-annotations.json');
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
  fs.writeFileSync(annotationsPath, JSON.stringify(annotations, null, 2));

  // Display results
  console.log('\n--- ANALYSIS ---');
  console.log(`  Title: ${analysis.pageTitle}`);
  console.log(`  Topic: ${analysis.pageTopic}`);
  console.log(`  Focus: ${analysis.detectedFocus}`);

  console.log('\n--- ANNOTATIONS ---');
  console.log(`  Card Title: ${annotations.cardTitle}`);
  console.log(`  Subtitle: ${annotations.cardSubtitle}`);
  console.log(`  Steps:`);
  annotations.steps.forEach(s => {
    console.log(`    ${s.number}. ${s.label} — ${s.description}`);
  });

  console.log(`\nSaved to ${analysisPath} and ${annotationsPath}`);
})().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
