#!/usr/bin/env node

const { spawnSync } = require('child_process');
const chokidar = require('chokidar');
const path = require('path');

const repoRoot = process.cwd();
const ignored = ['**/.git/**', '**/node_modules/**'];
let pending = new Set();
let timer = null;
const DEBOUNCE_MS = 600;

function git(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`Git ${cmd} ${args.join(' ')} failed: ${res.stderr}`);
  }
  return res.stdout.trim();
}

function stageAndCommit(files) {
  const relFiles = files.map((f) => path.relative(repoRoot, f));
  try {
    git('git', ['add', '--'].concat(relFiles));
  } catch (err) {
    console.error('Failed to git add:', err.message);
    return;
  }

  const message = `Auto: update ${relFiles.join(', ')}`;
  try {
    // Use --no-verify to skip hooks if user prefers
    git('git', ['commit', '-m', message, '--no-verify']);
    console.log(new Date().toISOString(), 'Committed:', message);
  } catch (err) {
    // If there is nothing to commit, git exits non-zero; ignore
    if (/nothing to commit/.test(err.message) || /exit code 1/.test(err.message)) {
      // nothing to commit
      return;
    }
    console.error('Commit failed:', err.message);
    return;
  }

  const autoPush = process.env.AUTO_PUSH === 'true' || process.env.AUTO_PUSH === '1';
  if (autoPush) {
    try {
      git('git', ['push']);
      console.log(new Date().toISOString(), 'Pushed to remote');
    } catch (err) {
      console.error('Push failed:', err.message);
    }
  }
}

function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (pending.size === 0) return;
  const files = Array.from(pending);
  pending.clear();
  stageAndCommit(files);
}

console.log('Starting file watcher (auto-commit).');
console.log('Note: push is disabled by default. Set AUTO_PUSH=1 to enable.');

const watcher = chokidar.watch('.', {
  ignored,
  ignoreInitial: true,
  persistent: true,
  followSymlinks: true,
  depth: 10,
});

watcher.on('all', (event, filePath) => {
  if (!filePath) return;
  const abs = path.join(repoRoot, filePath);
  pending.add(abs);
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, DEBOUNCE_MS);
});

process.on('SIGINT', () => {
  console.log('\nStopping watcher...');
  flush();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nStopping watcher...');
  flush();
  process.exit(0);
});
