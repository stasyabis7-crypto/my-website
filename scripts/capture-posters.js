// One-off tool: captures a still of a works/*/index.html animation's first
// frame, used as the mobile tap-to-play poster (see works-tap-play.js) —
// the whole point is showing SOMETHING without ever mounting the live
// iframe (that's what costs memory), so the poster has to be a plain
// image, not the iframe itself.
//
// Usage: node scripts/capture-posters.js <relative-path-to-project> <width> <height> <outFile> [embedTheme] [bgColor]
// Example: node scripts/capture-posters.js works/15-spief-2025/index.html 1080 1080 works/15-spief-2025/tap-poster.webp
//
// embedTheme: 'dark' | 'light' — see record-loop.js for why this needs to
// be forced explicitly when the page isn't actually embedded in the parent.
//
// bgColor: same reasoning as record-loop.js — projects with
// allowtransparency (see index.html) render on a transparent canvas and
// rely on the gallery card (--color-surface-alt) behind the iframe for
// their real backdrop. Standalone, that card doesn't exist, so pass the
// matching --color-surface-alt for the theme or the poster background is
// just whatever Chrome paints for "transparent" outside an iframe context
// (not the same thing, and not themed).

const puppeteer = require('puppeteer-core');
const path = require('path');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function startServer(root, port) {
  const mime = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4',
  };
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = path.join(root, urlPath);
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

async function main() {
  const [, , projectRelPath, wArg, hArg, outFile, embedTheme, bgColor] = process.argv;
  if (!projectRelPath || !outFile) {
    console.error('Usage: node capture-posters.js <project/index.html> <w> <h> <outFile> [embedTheme]');
    process.exit(1);
  }
  const width = parseInt(wArg, 10);
  const height = parseInt(hArg, 10);
  const root = path.resolve(__dirname, '..');
  const port = 8934 + Math.floor(Math.random() * 1000);

  const server = await startServer(root, port);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [`--window-size=${width},${height}`],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    // Same reload-to-catch-frame-0 trick as record-loop.js: the animation
    // loop starts synchronously during parse, well before 'load', so a
    // fresh navigation that only waits for domcontentloaded is the closest
    // we get to "frame 0" — reusing an already-warm cache from the first
    // 'load' pass so fonts/images are already there for the real capture.
    await page.goto(`http://localhost:${port}/${projectRelPath}`, { waitUntil: 'load' });
    if (embedTheme) {
      await page.evaluate((theme) => {
        document.documentElement.setAttribute('data-embed-theme', theme);
      }, embedTheme);
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    if (embedTheme) {
      await page.evaluate((theme) => {
        document.documentElement.setAttribute('data-embed-theme', theme);
      }, embedTheme);
    }
    if (bgColor) {
      await page.evaluate((color) => {
        document.documentElement.style.background = color;
        document.body.style.background = color;
      }, bgColor);
    }
    // One rAF tick so canvas-driven animations have actually painted
    // their first frame before we grab pixels.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    fs.mkdirSync(path.dirname(path.join(root, outFile)), { recursive: true });
    await page.screenshot({ path: path.join(root, outFile), type: 'webp', quality: 82 });
    console.log('Wrote', outFile);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
