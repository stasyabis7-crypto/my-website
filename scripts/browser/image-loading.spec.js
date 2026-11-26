const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

for (const outcome of ['load', 'error']) test(`image frame shows a centered ring until ${outcome}`, async ({ page }, info) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/about/media/about-portrait*.webp', async route => {
    await gate;
    if (outcome === 'load') await route.continue();
    else await route.abort('failed');
  });
  try {
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.page-spinner')).not.toHaveClass(/is-visible/);
    await expect(page.locator('.page-spinner')).not.toBeVisible();
    const frame = page.locator('.about-intro__portrait');
    await frame.scrollIntoViewIfNeeded();
    const indicator = frame.locator('.image-loading');
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveText('');
    await expect(indicator).toHaveAttribute('aria-hidden', 'true');
    expect(await indicator.evaluate(node => getComputedStyle(node).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
    const ring = indicator.locator('.page-spinner__ring');
    const box = await frame.boundingBox();
    const circle = await ring.boundingBox();
    expect(Math.abs(circle.x + circle.width / 2 - box.x - box.width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(circle.y + circle.height / 2 - box.y - box.height / 2)).toBeLessThanOrEqual(1);
    await expect(ring).toHaveCSS('animation-name', 'page-spinner-turn');
    if (outcome === 'load') {
      const screenshot = info.outputPath('image-loading.png');
      // The deliberately stalled image can hold document.fonts.ready open.
      // Capture the loading state directly without waiting for the window load.
      const session = await page.context().newCDPSession(page);
      const { data } = await session.send('Page.captureScreenshot', { format: 'png' });
      await session.detach();
      fs.writeFileSync(screenshot, Buffer.from(data, 'base64'));
      await info.attach('image-loading', { path: screenshot, contentType: 'image/png' });
    }
    release();
    await expect(indicator).toHaveCount(0);
    await expect(frame).not.toHaveAttribute('data-image-loading');
    await expect(frame.locator('img')).not.toHaveAttribute('data-image-pending');
    const finalBox = await frame.boundingBox();
    expect(finalBox.width).toBeCloseTo(box.width, 0);
    expect(finalBox.height).toBeCloseTo(box.height, 0);
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
