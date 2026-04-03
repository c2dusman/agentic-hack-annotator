const puppeteer = require('puppeteer');
const os = require('os');

function getLaunchOptions() {
  const options = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  };
  if (os.platform() === 'linux') {
    options.executablePath = '/usr/bin/chromium-browser';
  }
  return options;
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
