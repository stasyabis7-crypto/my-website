const { test, expect } = require('@playwright/test');

const pages = ['/', '/about/', '/projects/articles/', '/projects/playground/',
  '/projects/ozon-crm/customer-segments/', '/projects/avito-charity/subscription/'];

test.beforeEach(async ({ context }) => {
  // Third-party analytics availability must not decide whether the site is healthy.
  await context.route(/https:\/\/(?:mc\.yandex\.(?:ru|com)|www\.googletagmanager\.com|www\.google-analytics\.com)\//,
    route => route.fulfill({ status: 204, body: '' }));
});

for (const path of pages) test(`page loads, scrolls and has no broken resources: ${path}`, async ({ page, baseURL }) => {
  const failures = [];
  const origin = new URL(baseURL).origin;
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => {
    if (new URL(response.url()).origin === origin && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', request => {
    if (new URL(request.url()).origin === origin && !request.failure()?.errorText.includes('ERR_ABORTED')) {
      failures.push(`${request.failure()?.errorText} ${request.url()}`);
    }
  });
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/is-page-loading/);
  await expect(page.locator('.page-spinner')).not.toHaveClass(/is-visible/);
  // Incremental scrolling exercises lazy media and the shared section overlap.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) {
      scrollTo({ top: y, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    scrollTo({ top: 0, behavior: 'instant' });
  });
  for (const image of await page.locator('img:visible').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0),
      { message: `Image must load: ${await image.getAttribute('src')}` }).toBe(true);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow, 'No horizontal scroll on phones or desktop').toBeLessThanOrEqual(1);
  const dirtyLinks = await page.locator('a[href]').evaluateAll(links => links.filter(link => {
    const target = new URL(link.href);
    return target.origin === location.origin && /\/$|\.html$/.test(target.pathname) && /\.html$|\?/.test(target.pathname + target.search);
  }).map(link => link.href));
  expect(dirtyLinks).toEqual([]);
  expect(failures).toEqual([]);
});

test('manual language survives clean navigation, reload and old shared links', async ({ page }) => {
  await page.goto('/?lang=ru#works-gallery', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page).toHaveURL(/\/#works-gallery$/);
  await page.goto('/about/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await page.getByRole('button', { name: 'Переключить на английский' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveURL(/\/about\/$/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const resume = page.locator('a[data-resume-document]').first();
  expect(await resume.getAttribute('href')).toMatch(/\/cv-en(?:\.[a-f0-9]+)?\.pdf/);
});

test('country chooses first language; manual choice wins when localStorage is blocked', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'portfolio-country', value: 'KZ', url: baseURL }]);
  // Override the fixture country on this response, simulating a visitor from KZ.
  await page.route('**/', async route => {
    const response = await route.fetch();
    const headers = response.headers();
    headers['set-cookie'] = 'portfolio-country=KZ; Path=/; SameSite=Lax';
    await route.fulfill({ response, headers });
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Disabled', 'SecurityError'); } });
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await page.getByRole('button', { name: 'Переключить на английский' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveURL(baseURL + '/');
});

test('legacy page URLs redirect while query language and fragments remain usable', async ({ request }) => {
  for (const [old, clean] of [
    ['/index.html', '/'], ['/about/index.html', '/about/'], ['/about.html', '/about/'],
    ['/projects/articles/index.html?lang=ru', '/projects/articles/?lang=ru'],
    ['/projects/concepts/', '/projects/playground/'], ['/projects/activities/', '/projects/articles/'],
    ['/projects/posts/', '/'],
  ]) {
    const response = await request.get(old, { maxRedirects: 0 });
    expect([301, 302]).toContain(response.status());
    const location = new URL(response.headers().location, response.url());
    expect(location.pathname + location.search).toBe(clean);
  }
  expect((await request.get('/missing-page/')).status()).toBe(404);
});

test('hosting provides country without a network lookup and keeps HTML private', async ({ request }) => {
  const response = await request.get('/');
  expect(response.headers()['cache-control']).toMatch(/private/);
  expect(response.headers()['cache-control']).toMatch(/no-cache/);
  expect(response.headersArray().filter(header => header.name.toLowerCase() === 'set-cookie').map(header => header.value).join(';'))
    .toMatch(/portfolio-country=[A-Z]{2};/);
});

test('home project link opens a case and browser back returns to the feed', async ({ page }) => {
  await page.goto('/');
  await page.locator('a.feed-card__cover').first().click();
  await expect(page).toHaveURL(/\/projects\/ozon-crm\/customer-segments\/$/);
  await expect(page.locator('h1')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.feed-card').first()).toBeVisible();
  await expect(page.locator('.page-spinner')).not.toHaveClass(/is-visible/);
});

test('a stalled image cannot keep the page behind the loading overlay', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/about/media/about-portrait*.webp', async route => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.page-spinner')).not.toHaveClass(/is-visible/, { timeout: 3500 });
    await expect(page.getByRole('button', { name: /Switch to Russian|Переключить на английский/ })).toBeVisible();
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('offscreen video waits for scrolling and pauses when leaving the viewport', async ({ page }) => {
  await page.goto('/projects/playground/');
  const video = page.locator('video[data-lazy-video]').last();
  await expect(video).not.toHaveAttribute('src');
  await video.scrollIntoViewIfNeeded();
  await expect(video).toHaveAttribute('src', /\.mp4/);
  await expect.poll(() => video.evaluate(node => !node.paused)).toBe(true);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => video.evaluate(node => node.paused)).toBe(true);
});

test('fullscreen gallery resolves lazy responsive video and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/projects/avito-charity/subscription/');
  const preview = page.locator('video[data-responsive-video]');
  await preview.scrollIntoViewIfNeeded();
  await expect(preview).toHaveAttribute('poster', /\.webp/);
  await expect(preview).not.toHaveAttribute('src');
  await preview.click();
  const gallery = page.locator('.case-lightbox');
  await expect(gallery).toBeVisible();
  const selected = gallery.locator('video.case-lightbox__video[src*="kind-subscription-300-flow"]').first();
  await expect(selected).toHaveAttribute('src', /\.mp4/);
  await expect(gallery.locator('video[src=""]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(gallery).not.toBeVisible();
});
