// Browser regression: npm run dev, then node dev/hero-keycaps/check-touch.cjs.
// Requires puppeteer-core and Chrome (CHROME_PATH can override its location).
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8000', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 6500));
    const client = await page.createCDPSession();
    async function swipe(x, y) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= 10; i++) {
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 12 }] });
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
    const key = await page.$('.btn--fill-keycap:not([hidden])');
    const box = await key.boundingBox();
    await swipe(box.x + box.width / 2, box.y + box.height / 2);
    assert.ok(await page.evaluate(() => scrollY < 5), 'Dragging a keycap must not navigate to the gallery');
    await swipe(195, 300);
    assert.ok(await page.evaluate(() => scrollY > 100), 'Swiping the hero background must still open the gallery');
    console.log('Keycap touch drag stays on hero; background swipe still opens gallery.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
