const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const budgets = require('./performance-budgets.json');

// Repeatable lab regression checks; production checks additionally include hosting latency.
for (const path of ['/', '/about/', '/projects/articles/', '/projects/playground/',
  '/projects/ozon-crm/customer-segments/', '/projects/avito-charity/subscription/']) {
  test(`loading and scrolling stay within the performance budget: ${path}`, async ({ page, context }, info) => {
    const mobile = info.project.name === 'mobile';
    const limits = { ...budgets[info.project.name], ...budgets.pages[path]?.[info.project.name] };
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: mobile ? 80 : 20,
      downloadThroughput: (mobile ? 6 : 20) * 1024 * 1024 / 8,
      uploadThroughput: 1024 * 1024 / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: mobile ? 4 : 1 });
    await context.route(/https:\/\/(?:mc\.yandex\.(?:ru|com)|www\.googletagmanager\.com|www\.google-analytics\.com)\//,
      route => route.fulfill({ status: 204, body: '' }));
    await page.addInitScript(() => {
      const metrics = window.testPerformance = { lcp: 0, shifts: [], tasks: [] };
      new PerformanceObserver(list => { for (const entry of list.getEntries()) metrics.lcp = entry.startTime; })
        .observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) metrics.shifts.push({ time: entry.startTime, value: entry.value,
          sources: entry.sources.map(source => ({ node: source.node?.className || source.node?.nodeName, before: source.previousRect.toJSON(), after: source.currentRect.toJSON() })) });
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) metrics.tasks.push({ time: entry.startTime, duration: entry.duration });
      }).observe({ type: 'longtask', buffered: true });
    });
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/is-page-loading/);
    await expect(page.locator('.page-spinner')).not.toHaveClass(/is-visible/);
    const ready = await page.evaluate(() => performance.now());
    // Wait for first-viewport images, then observe a full five-second load window.
    // Otherwise a late large image could be missed after an earlier text paint.
    await expect.poll(() => page.locator('img').evaluateAll(images => images.filter(image => {
      const box = image.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.top < innerHeight && box.bottom > 0;
    }).every(image => image.complete && image.naturalWidth > 0)), { timeout: 12000 }).toBe(true);
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, Math.max(500, 5000 - performance.now()))));
    const initial = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        ttfb: nav.responseStart - nav.requestStart,
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        lcp: window.testPerformance.lcp,
        transferBytes: performance.getEntriesByType('resource').reduce((sum, entry) => sum + entry.transferSize, nav.transferSize),
      };
    });
    const scrollStart = await page.evaluate(async () => {
      const start = performance.now();
      for (let step = 0; step < 30; step++) {
        scrollTo({ top: document.documentElement.scrollHeight * step / 29, behavior: 'instant' });
        await new Promise(resolve => setTimeout(resolve, 60));
      }
      return start;
    });
    const observed = await page.evaluate(scrollStart => {
      const data = window.testPerformance;
      const blocking = tasks => tasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0);
      // CLS uses the largest 5-second session window, separated by a 1-second gap.
      let cls = 0, session = 0, first = null, previous = 0;
      for (const shift of data.shifts) {
        if (first === null || shift.time - previous > 1000 || shift.time - first > 5000) { session = 0; first = shift.time; }
        session += shift.value; previous = shift.time; cls = Math.max(cls, session);
      }
      return { cls, loadBlocking: blocking(data.tasks.filter(task => task.time < scrollStart)),
        scrollBlocking: blocking(data.tasks.filter(task => task.time >= scrollStart)) };
    }, scrollStart);
    const metrics = { ...initial, ready, ...observed };
    const shifts = await page.evaluate(() => window.testPerformance.shifts);
    const filename = info.outputPath('performance.json');
    fs.mkdirSync(require('node:path').dirname(filename), { recursive: true });
    fs.writeFileSync(filename, JSON.stringify({ path, profile: info.project.name, metrics, shifts, limits }, null, 2));
    await info.attach('performance.json', { path: filename, contentType: 'application/json' });
    console.log(`${info.project.name} ${path}: ${JSON.stringify(metrics)}`);
    expect(metrics.fcp, 'First contentful paint must be observed').toBeGreaterThan(0);
    expect(metrics.lcp, 'Largest contentful paint must be observed').toBeGreaterThan(0);
    for (const [metric, limit] of Object.entries(limits)) {
      expect.soft(metrics[metric], `${path}: ${metric}, limit ${limit}`).toBeLessThanOrEqual(limit);
    }
  });
}
