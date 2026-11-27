const { test, expect } = require('@playwright/test');

test('Playground pattern posters wait for scrolling and stay visible while videos buffer', async ({ page }) => {
  const pattern = /\/(?:diamonds-4d5df9|hexagons-e8fec0|triangles-d998f4|white-network)-1600/;
  const requests = [];
  const posters = new Set();
  page.on('request', request => { if (pattern.test(request.url())) requests.push(request.url()); });
  page.on('response', response => {
    if (pattern.test(response.url()) && response.url().includes('-poster') && response.ok()) posters.add(response.url());
  });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(/\/(?:diamonds-4d5df9|hexagons-e8fec0|triangles-d998f4|white-network)-1600[^/]*\.mp4/, async route => {
    await gate;
    await route.abort('failed');
  });
  try {
    await page.goto('/projects/playground/');
    const block = page.locator('.playground-grid__item--motion-set');
    const videos = block.locator('video');
    await expect(videos).toHaveCount(4);
    expect(requests, 'Offscreen pattern media must not compete with the first viewport').toEqual([]);
    await block.scrollIntoViewIfNeeded();
    for (const video of await videos.all()) {
      await expect(video).toHaveAttribute('poster', /-poster[^/]*\.webp/);
      await expect(video).toHaveAttribute('src', /\.mp4/);
      expect(await video.evaluate(node => node.readyState)).toBe(0);
    }
    await expect.poll(() => posters.size).toBe(4);
    await expect(block.locator('.image-loading')).toHaveCount(0);
    const geometry = await block.evaluate(node => {
      const box = node.getBoundingClientRect();
      const cells = Array.from(node.querySelectorAll('video'), video => video.getBoundingClientRect());
      return { width: box.width, height: box.height,
        horizontalGap: cells[1].left - cells[0].right,
        verticalGap: cells[2].top - cells[0].bottom,
        cellRatios: cells.map(cell => cell.width / cell.height) };
    });
    expect(geometry.width).toBeCloseTo(geometry.height, 0);
    expect(geometry.horizontalGap).toBeCloseTo(16, 0);
    expect(geometry.verticalGap).toBeCloseTo(16, 0);
    geometry.cellRatios.forEach(ratio => expect(ratio).toBeCloseTo(1, 2));
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

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
