#!/usr/bin/env node
// Checks literal local resources/navigation in HTML and CSS, including srcset.
// JS-computed URLs and external services require a browser/content review.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const excluded = new Set(['node_modules', '.git', '.claude', '.github']);
const failures = [];
let checked = 0;

function check(file, value) {
  value = value.trim().replaceAll('&amp;', '&');
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value) || value.includes('${')) return;
  const pathname = decodeURIComponent(value.split(/[?#]/)[0]);
  if (!pathname) return;
  const target = path.resolve(value.startsWith('/') ? root : path.dirname(file), pathname.replace(/^\//, ''));
  if (!fs.existsSync(target)) failures.push(`${path.relative(root, file)} → ${value}`);
  else if (fs.statSync(target).isDirectory() && !fs.existsSync(path.join(target, 'index.html'))) {
    failures.push(`${path.relative(root, file)} → ${value} (нет index.html)`);
  }
  checked++;
}

function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || excluded.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { visit(file); continue; }
    if (!/\.(html|css)$/.test(file)) continue;
    const source = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g, '');
    if (file.endsWith('.html')) {
      for (const match of source.matchAll(/\b(?:src|href|poster)\s*=\s*(["'])(.*?)\1/gi)) check(file, match[2]);
      for (const match of source.matchAll(/\bsrcset\s*=\s*(["'])(.*?)\1/gi)) {
        if (!match[2].includes('data:')) for (const candidate of match[2].split(',')) check(file, candidate.trim().split(/\s+/)[0]);
      }
    }
    for (const match of source.matchAll(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi)) check(file, match[2]);
    for (const match of source.matchAll(/@import\s+(["'])(.*?)\1/gi)) check(file, match[2]);
  }
}
visit(root);
if (failures.length) {
  console.error(`Локальные ссылки: ${failures.length} ошибок\n${failures.join('\n')}`);
  process.exitCode = 1;
} else console.log(`Локальные ссылки: ${checked} проверено, ошибок нет.`);
