'use strict';
require('dotenv').config();
const { renderCard } = require('../src/render');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Mock annotation data matching annotate.js output structure
const mockAnnotation = {
  cardTitle: 'Connect Your Gmail Account',
  cardSubtitle: 'Step-by-step guide to linking Gmail with the dashboard for instant notifications',
  steps: [
    { number: 1, label: 'Open Settings', description: 'Navigate to the Settings page from the main dashboard sidebar menu' },
    { number: 2, label: 'Select Integrations', description: 'Click the Integrations tab to see available third-party connections' },
    { number: 3, label: 'Authorize Gmail', description: 'Click Connect next to Gmail and sign in with your Google account credentials' },
    { number: 4, label: 'Confirm Access', description: 'Review the permissions requested and click Allow to complete the connection' }
  ]
};

// Create a small 1200x800 red PNG as mock screenshot (base64)
async function createMockScreenshot() {
  const buf = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: { r: 30, g: 60, b: 120 } }
  }).png().toBuffer();
  return buf.toString('base64');
}

async function runTest() {
  console.log('Creating mock screenshot...');
  const screenshotBase64 = await createMockScreenshot();

  // Test 1: Render with focus hint
  console.log('Test 1: renderCard with focus hint...');
  const result1 = await renderCard(mockAnnotation, screenshotBase64, 'How to connect Gmail', 'https://example.com/settings');
  console.log('  Output:', result1.filename);

  // Verify file exists
  if (!fs.existsSync(result1.filepath)) throw new Error('Output file not created');

  // Verify dimensions via sharp metadata
  const meta1 = await sharp(result1.filepath).metadata();
  if (meta1.width !== 1080) throw new Error(`Width is ${meta1.width}, expected 1080`);
  if (meta1.height !== 1920) throw new Error(`Height is ${meta1.height}, expected 1920`);
  if (meta1.format !== 'png') throw new Error(`Format is ${meta1.format}, expected png`);
  console.log('  PASS: 1080x1920 PNG with focus');

  // Test 2: Render without focus hint (badge hidden)
  console.log('Test 2: renderCard without focus hint...');
  const result2 = await renderCard(mockAnnotation, screenshotBase64, null, 'https://example.com/settings');
  const meta2 = await sharp(result2.filepath).metadata();
  if (meta2.width !== 1080 || meta2.height !== 1920) throw new Error('Dimensions wrong for no-focus render');
  console.log('  PASS: 1080x1920 PNG without focus');

  // Test 3: Verify file size is reasonable (Sharp compression working)
  const stat = fs.statSync(result1.filepath);
  console.log(`  File size: ${(stat.size / 1024).toFixed(1)}KB`);
  if (stat.size > 500 * 1024) throw new Error('File too large — Sharp compression may not be working');
  if (stat.size < 1024) throw new Error('File too small — may be corrupt');
  console.log('  PASS: file size reasonable');

  // Cleanup test outputs
  fs.unlinkSync(result1.filepath);
  fs.unlinkSync(result2.filepath);

  console.log('\nAll render tests passed!');
}

runTest().catch(err => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
