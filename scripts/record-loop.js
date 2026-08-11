// One-off tool: records a works/*/index.html animation as a looping webm,
// used to replace heavy live iframes in the homepage grid with cheap video.
// Not part of the site runtime — run manually with node, not shipped.
//
// Usage: node scripts/record-loop.js <relative-path-to-project> <width> <height> <durationSeconds> <outFile> [bgColor]
// Example: node scripts/record-loop.js works/15-spief-2025/index.html 1080 1080 11.2 /tmp/slot15.webm
//
// bgColor: some projects render on a transparent canvas and rely on the
// gallery card behind the iframe (.works-grid__item, --color-surface-alt)
// for their real backdrop. Standalone in a browser tab that card doesn't
// exist, so pass the same color explicitly or the recording won't match
// what the live site actually shows.

const puppeteer = require('puppeteer-core');
const path = require('path');
const http = require('http');
const serveHandler = null; // no external static-server dep; tiny handler below

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function startServer(root, port) {
  const fs = require('fs');
  const mime = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2',
    '.png': 'image/png', '.jpg': 'image/jpeg',
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
  const [, , projectRelPath, wArg, hArg, durArg, outFile, bgColor] = process.argv;
  if (!projectRelPath || !outFile) {
    console.error('Usage: node record-loop.js <project/index.html> <w> <h> <durationSeconds> <outFile>');
    process.exit(1);
  }
  const width = parseInt(wArg, 10);
  const height = parseInt(hArg, 10);
  const duration = parseFloat(durArg);
  const root = path.resolve(__dirname, '..');
  const port = 8934;

  const server = await startServer(root, port);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [`--window-size=${width},${height}`],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    // Warm navigation first so fonts/images are cached — the page's own
    // animation loop starts synchronously during parsing, well before the
    // 'load' event, so waiting for 'load' here would already put us deep
    // into cycle 1 and break the loop seam. Reload timed to
    // 'domcontentloaded' instead and start capturing right away: that's as
    // close as we can get to frame 0 of the animation's own cycle.
    await page.goto(`http://localhost:${port}/${projectRelPath}`, { waitUntil: 'load' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    if (bgColor) {
      await page.evaluate((color) => {
        document.documentElement.style.background = color;
        document.body.style.background = color;
      }, bgColor);
    }

    const recorder = await page.screencast({ path: outFile });
    await new Promise((r) => setTimeout(r, Math.round(duration * 1000)));
    await recorder.stop();
    console.log('Wrote', outFile);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
