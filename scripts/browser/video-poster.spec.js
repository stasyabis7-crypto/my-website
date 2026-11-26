const { test, expect } = require('@playwright/test');

test('home video keeps its photo visible while the video request is stalled', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/*feed-cover-subscription-payment-loop*.mp4', async route => {
    await gate;
    await route.abort('failed');
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const video = page.locator('.feed-card__video video').first();
    await video.scrollIntoViewIfNeeded();
    await expect(video).toHaveAttribute('src', /\.mp4/);
    const frame = video.locator('xpath=ancestor::div[contains(@class,"feed-card__frame")]');
    const photo = frame.locator('.feed-card__video > img');
    await expect.poll(() => photo.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(photo).not.toHaveAttribute('data-image-pending');
    await expect(frame.locator('.image-loading')).toHaveCount(0);
    await expect(video).not.toHaveAttribute('data-image-pending');
    await expect(video).toHaveCSS('opacity', '0');
    await expect(photo).toBeVisible();
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

for (const path of ['/projects/playground/', '/projects/avito-charity/subscription/']) test(`playing video is never covered by an image loader: ${path}`, async ({ page }) => {
  await page.goto(path);
  const video = page.locator(path.includes('subscription') ? 'video[data-responsive-video]' : 'video[data-lazy-video]').first();
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate(element => !element.paused && element.readyState >= 2)).toBe(true);
  await expect(video).not.toHaveAttribute('data-image-pending');
  await expect(video.locator('source[data-image-pending]')).toHaveCount(0);
  await expect(video.locator('xpath=..').locator('.image-loading')).toHaveCount(0);
});
