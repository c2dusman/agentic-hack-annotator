'use strict';

const puppeteer = require('puppeteer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { generateId, ensureOutputDir } = require('./utils');

function getLaunchOptions() {
  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStepsHtml(steps) {
  return steps.map(step => {
    return `<div class="step">
  <div class="step-number">${step.number}</div>
  <div class="step-content">
    <span class="step-label">${escapeHtml(step.label)}</span>
    <span class="step-description">${escapeHtml(step.description)}</span>
  </div>
</div>`;
  }).join('\n');
}

function buildMarkersHtml(analysisData) {
  if (!analysisData || !analysisData.elements) return '';
  return analysisData.elements.map((el, i) => {
    const x = Math.max(5, Math.min(95, el.x_percent || 50));
    const y = Math.max(5, Math.min(95, el.y_percent || 50));
    return `<div class="marker" style="top:${y}%;left:${x}%">${el.id || i + 1}</div>`;
  }).join('\n');
}

function populateTemplate(template, annotationData, screenshotBase64, focus, pageUrl, analysisData) {
  return template
    .replace('{{CARD_TITLE}}', escapeHtml(annotationData.cardTitle))
    .replace('{{CARD_SUBTITLE}}', escapeHtml(annotationData.cardSubtitle))
    .replace('{{STEPS_HTML}}', buildStepsHtml(annotationData.steps))
    .replace('{{PAGE_URL}}', escapeHtml(pageUrl || ''))
    .replace('{{FOCUS_LABEL}}', escapeHtml(focus || ''))
    .replace('{{FOCUS_BADGE_STYLE}}', focus ? '' : 'display:none')
    .replace('{{SCREENSHOT_BASE64}}', screenshotBase64)
    .replace('{{MARKERS_HTML}}', buildMarkersHtml(analysisData));
}

async function renderCard(annotationData, screenshotBase64, focus = null, pageUrl = '', analysisData = null) {
  let browser = null;
  let page = null;
  try {
    const template = fs.readFileSync(path.join(__dirname, '../templates/card.html'), 'utf8');
    const html = populateTemplate(template, annotationData, screenshotBase64, focus, pageUrl, analysisData);

    browser = await puppeteer.launch(getLaunchOptions());
    page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);

    const rawBuffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1080, height: 1920 }
    });

    const optimized = await sharp(rawBuffer)
      .png({ compressionLevel: 9, palette: false })
      .toBuffer();

    ensureOutputDir();
    const filename = generateId() + '.png';
    const filepath = path.join(process.env.OUTPUT_DIR || './output', filename);
    fs.writeFileSync(filepath, optimized);

    return { filename, filepath };
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

async function cropElement(screenshotBase64, element) {
  const imgBuffer = Buffer.from(screenshotBase64, 'base64');
  const metadata = await sharp(imgBuffer).metadata();
  const imgW = metadata.width;
  const imgH = metadata.height;

  // Element center from Gemini percentages
  const cx = (element.x_percent / 100) * imgW;
  const cy = (element.y_percent / 100) * imgH;

  // Use element bounding box with padding, crop as square
  const elW = ((element.w_percent || 10) / 100) * imgW;
  const elH = ((element.h_percent || 5) / 100) * imgH;

  // Square crop: use the larger dimension * 2.5 for context, min 25% of image width
  const side = Math.round(Math.max(elW * 2.5, elH * 2.5, imgW * 0.25));
  let width = side;
  let height = side;

  let left = Math.round(cx - width / 2);
  let top = Math.round(cy - height / 2);

  // Clamp to image bounds
  if (left < 0) left = 0;
  if (top < 0) top = 0;
  if (left + width > imgW) width = imgW - left;
  if (top + height > imgH) height = imgH - top;

  // Ensure minimum crop size
  if (width < 100) width = Math.min(100, imgW);
  if (height < 100) height = Math.min(100, imgH);

  const cropped = await sharp(imgBuffer)
    .extract({ left, top, width, height })
    .png()
    .toBuffer();

  return cropped.toString('base64');
}

async function renderStepCards(annotationData, screenshotBase64, analysisData, pageUrl = '') {
  let browser = null;
  try {
    const template = fs.readFileSync(path.join(__dirname, '../templates/step-card.html'), 'utf8');
    browser = await puppeteer.launch(getLaunchOptions());
    const totalSteps = annotationData.steps.length;
    const filenames = [];

    for (let i = 0; i < totalSteps; i++) {
      const step = annotationData.steps[i];
      const element = analysisData.elements[i];
      if (!element) continue;

      const croppedBase64 = await cropElement(screenshotBase64, element);

      const html = template
        .replace('{{STEP_INDICATOR}}', escapeHtml(`Step ${step.number} of ${totalSteps}`))
        .replace('{{STEP_NUM}}', step.number)
        .replace('{{STEP_LABEL}}', escapeHtml(step.label))
        .replace('{{STEP_DESCRIPTION}}', escapeHtml(step.description))
        .replace('{{CROPPED_BASE64}}', croppedBase64)
        .replace('{{PAGE_URL}}', escapeHtml(pageUrl || ''));

      const page = await browser.newPage();
      await page.setViewport({ width: 1080, height: 1080 });
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);

      const rawBuffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 1080, height: 1080 }
      });
      await page.close();

      const optimized = await sharp(rawBuffer)
        .png({ compressionLevel: 9, palette: false })
        .toBuffer();

      ensureOutputDir();
      const filename = generateId() + '.png';
      const filepath = path.join(process.env.OUTPUT_DIR || './output', filename);
      fs.writeFileSync(filepath, optimized);
      filenames.push(filename);
    }

    return filenames;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { renderCard, renderStepCards, getLaunchOptions };
