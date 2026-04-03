const puppeteer = require('puppeteer');
const os = require('os');

(async () => {
  const isLinux = os.platform() === 'linux';
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  };
  if (isLinux) {
    launchOptions.executablePath = '/usr/bin/chromium-browser';
  }
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await page.screenshot({ path: '/tmp/test-screenshot.png' });
  await browser.close();
  console.log('Puppeteer OK — screenshot saved to /tmp/test-screenshot.png');
})();
