const puppeteer = require('puppeteer');

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

async function renderCard(annotationData, screenshotBase64, focus = null) {
  let browser = null;
  try {
    browser = await puppeteer.launch(getLaunchOptions());
    // TODO: Phase 3 — implement full card rendering
    throw new Error('render.js not yet implemented');
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { renderCard, getLaunchOptions };
