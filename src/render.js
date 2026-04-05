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
    const cx = el.x_percent || 50;
    const cy = el.y_percent || 50;
    const w = Math.max(4, el.w_percent || 10);
    const h = Math.max(4, el.h_percent || 5);

    // Convert center + size to top-left corner, clamped to screenshot bounds
    const left = Math.max(0, Math.min(100 - w, cx - w / 2));
    const top = Math.max(0, Math.min(100 - h, cy - h / 2));

    return `<div class="bbox" style="top:${top}%;left:${left}%;width:${w}%;height:${h}%"><span class="bbox-num">${el.id || i + 1}</span></div>`;
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

function isClickable(element) {
  const text = `${element.label || ''} ${element.description || ''}`.toLowerCase();
  return /\b(click|tap|button|link|toggle|switch|select|dropdown|menu|nav|submit|sign|log.?in|checkout|add to cart|subscribe|download|upload|cta|get started|try|start)\b/.test(text);
}

async function cropElement(screenshotBase64, element) {
  const imgBuffer = Buffer.from(screenshotBase64, 'base64');
  const metadata = await sharp(imgBuffer).metadata();
  const imgW = metadata.width;
  const imgH = metadata.height;

  // Element center and dimensions from Gemini percentages
  const cx = (element.x_percent / 100) * imgW;
  const cy = (element.y_percent / 100) * imgH;
  const elW = ((element.w_percent || 10) / 100) * imgW;
  const elH = ((element.h_percent || 5) / 100) * imgH;

  // Element top-left in full image pixels
  const elLeft = Math.round(cx - elW / 2);
  const elTop = Math.round(cy - elH / 2);

  // Adaptive padding based on element area
  const area = (element.w_percent || 10) * (element.h_percent || 5);
  let padMultiplier;
  if (area < 50) padMultiplier = 3.0;
  else if (area < 200) padMultiplier = 2.2;
  else padMultiplier = 1.5;

  // Rectangular crop matching zoom container aspect ratio (~1.4:1)
  const TARGET_RATIO = 1.4;
  let cropW = Math.max(elW * padMultiplier, imgW * 0.15);
  let cropH = Math.max(elH * padMultiplier, imgH * 0.12);

  // Adjust to target aspect ratio
  if (cropW / cropH > TARGET_RATIO) {
    cropH = cropW / TARGET_RATIO;
  } else {
    cropW = cropH * TARGET_RATIO;
  }

  cropW = Math.round(cropW);
  cropH = Math.round(cropH);

  // Center crop around element
  let left = Math.round(cx - cropW / 2);
  let top = Math.round(cy - cropH / 2);

  // Shift origin before truncating (preserve aspect ratio)
  if (left < 0) left = 0;
  if (top < 0) top = 0;
  if (left + cropW > imgW) left = Math.max(0, imgW - cropW);
  if (top + cropH > imgH) top = Math.max(0, imgH - cropH);

  // Final clamp if crop is larger than image
  let width = Math.min(cropW, imgW - left);
  let height = Math.min(cropH, imgH - top);

  // Ensure minimum crop size
  if (width < 100) width = Math.min(100, imgW);
  if (height < 100) height = Math.min(100, imgH);

  // Extract and sharpen small crops
  let pipeline = sharp(imgBuffer).extract({ left, top, width, height });
  if (width < 400 || height < 400) {
    pipeline = pipeline.sharpen({ sigma: 1.0 });
  }
  const cropped = await pipeline.png().toBuffer();

  return {
    base64: cropped.toString('base64'),
    cropLeft: left,
    cropTop: top,
    cropWidth: width,
    cropHeight: height,
    imgW,
    imgH,
    elLeft: Math.max(0, elLeft),
    elTop: Math.max(0, elTop),
    elW: Math.round(elW),
    elH: Math.round(elH)
  };
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

      const cropResult = await cropElement(screenshotBase64, element);

      // Bounding box position relative to crop (percentages)
      let bboxLeft = ((cropResult.elLeft - cropResult.cropLeft) / cropResult.cropWidth) * 100;
      let bboxTop = ((cropResult.elTop - cropResult.cropTop) / cropResult.cropHeight) * 100;
      let bboxW = (cropResult.elW / cropResult.cropWidth) * 100;
      let bboxH = (cropResult.elH / cropResult.cropHeight) * 100;

      // Enforce minimum bbox size (at least 20% of crop in each dimension)
      if (bboxW < 20) {
        const expand = (20 - bboxW) / 2;
        bboxLeft = Math.max(0, bboxLeft - expand);
        bboxW = 20;
      }
      if (bboxH < 15) {
        const expand = (15 - bboxH) / 2;
        bboxTop = Math.max(0, bboxTop - expand);
        bboxH = 15;
      }
      // Clamp to stay within crop bounds
      if (bboxLeft + bboxW > 100) bboxLeft = Math.max(0, 100 - bboxW);
      if (bboxTop + bboxH > 100) bboxTop = Math.max(0, 100 - bboxH);

      const bboxHtml = `<div class="zoom-bbox" style="top:${bboxTop}%;left:${bboxLeft}%;width:${bboxW}%;height:${bboxH}%"></div>`;

      // Cursor indicator for clickable elements
      const cursorHtml = isClickable(element)
        ? `<div class="click-cursor" style="top:${bboxTop + bboxH}%;left:${bboxLeft + bboxW}%"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 3l14 8-6 2-4 6z" fill="white" fill-opacity="0.85" stroke="#FF2D6B" stroke-width="1.5"/></svg></div>`
        : '';

      const html = template
        .replace('{{STEP_INDICATOR}}', escapeHtml(`Step ${step.number} of ${totalSteps}`))
        .replace('{{STEP_NUM}}', step.number)
        .replace('{{STEP_LABEL}}', escapeHtml(step.label))
        .replace('{{STEP_DESCRIPTION}}', escapeHtml(step.description))
        .replace('{{CROPPED_BASE64}}', cropResult.base64)
        .replace('{{BBOX_HTML}}', bboxHtml)
        .replace('{{CURSOR_HTML}}', cursorHtml)
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
