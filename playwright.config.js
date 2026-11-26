const { defineConfig, devices } = require('@playwright/test');
const remote = process.env.SITE_URL;

module.exports = defineConfig({
  testDir: './scripts/browser',
  outputDir: '.artifacts/browser/results',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { outputFolder: '.artifacts/browser/report', open: 'never' }]],
  use: {
    baseURL: remote || 'http://127.0.0.1:8123',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 20000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: remote ? undefined : {
    command: 'node scripts/test-server.js',
    url: 'http://127.0.0.1:8123',
    reuseExistingServer: false,
    timeout: 15000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
  },
});
