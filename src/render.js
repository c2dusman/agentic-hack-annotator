const puppeteer = require('puppeteer');

async function renderCard(annotationData, screenshotBase64, focus = null) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    // TODO: Phase 3 — implement full card rendering
    throw new Error('render.js not yet implemented');
  } finally {
    if (browser) await browser.close();
  }
}
module.exports = { renderCard };
