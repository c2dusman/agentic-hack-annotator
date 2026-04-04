'use strict';
require('dotenv').config();
const screenshotone = require('screenshotone-api-sdk');

function getClient() {
  const accessKey = process.env.SCREENSHOTONE_ACCESS_KEY;
  const secretKey = process.env.SCREENSHOTONE_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new Error('Screenshot capture failed: SCREENSHOTONE_ACCESS_KEY and SCREENSHOTONE_SECRET_KEY must be set');
  }
  return new screenshotone.Client(accessKey, secretKey);
}

async function captureScreenshot(url) {
  const client = getClient();
  const options = screenshotone.TakeOptions
    .url(url)
    .viewportWidth(1200)
    .viewportHeight(800)
    .format('png')
    .fullPage(true)
    .blockAds(true)
    .blockCookieBanners(true)
    .delay(2);

  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const imageBlob = await client.take(options);
      const buffer = Buffer.from(await imageBlob.arrayBuffer());
      const base64 = buffer.toString('base64');
      return { buffer, base64 };
    } catch (err) {
      lastError = err;
      if (attempt < 2) continue; // retry once on timeout/5xx per D-08
    }
  }
  throw new Error(`Screenshot capture failed: ${lastError.message}`);
}

module.exports = { captureScreenshot };
