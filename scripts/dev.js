#!/usr/bin/env node
const { spawn } = require('node:child_process');
const path = require('node:path');
const { prepareImages, watchImages } = require('./prepare-images');
try { prepareImages(); } catch (error) { console.error(error.message); process.exit(1); }
const watcher = watchImages();
const server = spawn('python3', ['-m', 'http.server', process.env.PORT || '8000', '--bind', '127.0.0.1'], {
  cwd: path.resolve(__dirname, '..'), stdio: 'inherit'
});
server.on('error', async error => { console.error(error.message); await watcher.close(); process.exitCode = 1; });
server.on('exit', async code => { await watcher.close(); process.exitCode = code || 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { server.kill(signal); await watcher.close(); });
