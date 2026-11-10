#!/usr/bin/env node
const { spawn } = require('node:child_process');
const path = require('node:path');
const { prepareImages, watchImages } = require('./prepare-images');
try { prepareImages(); } catch (error) { console.error(error.message); process.exit(1); }
const watcher = watchImages();
const { prepareLanguageAssets } = require('./prepare-language-assets');
prepareLanguageAssets();
// Reuse the existing PNG importer; this watcher only refreshes locale slots.
const languageWatcher = require('chokidar').watch(['projects', 'pages', 'about', 'components/site-brand'], { ignoreInitial: true });
let languageTimer;
languageWatcher.on('all', (_event, file) => {
  if (!/\.(?:webp|gif|svg|jpe?g|mp4|webm|html|js)$/.test(file)) return;
  clearTimeout(languageTimer);
  languageTimer = setTimeout(() => { try { prepareLanguageAssets(); } catch (error) { console.error(error.message); } }, 300);
});
const server = spawn('python3', ['-m', 'http.server', process.env.PORT || '8000', '--bind', '127.0.0.1'], {
  cwd: path.resolve(__dirname, '..'), stdio: 'inherit'
});
server.on('error', async error => { console.error(error.message); clearTimeout(languageTimer); await languageWatcher.close(); await watcher.close(); process.exitCode = 1; });
server.on('exit', async code => { clearTimeout(languageTimer); await languageWatcher.close(); await watcher.close(); process.exitCode = code || 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { server.kill(signal); clearTimeout(languageTimer); await languageWatcher.close(); await watcher.close(); });
