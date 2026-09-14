#!/usr/bin/env node
'use strict';

// Static component: no runtime fetching, layout shift or dependency on JS.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const template = read('components/hero-garden/template.html').trimEnd();
const index = read('index.html');
const start = '    <!-- component:hero-garden:start -->';
const end = '    <!-- component:hero-garden:end -->';
const block = `${start}\n${template}\n${end}`;
const from = index.indexOf(start);
const to = index.indexOf(end);

if (from < 0 || to < from || index.indexOf(start, from + 1) !== -1 ||
    index.indexOf(end, to + 1) !== -1) {
  throw new Error('Ожидается одна пара маркеров компонента hero-garden в index.html.');
}

if (process.argv.includes('--sync')) {
  fs.writeFileSync(path.join(root, 'index.html'), index.slice(0, from) + block + index.slice(to + end.length));
  console.log('Разметка hero-garden синхронизирована. Эталон не изменён.');
} else {
  const errors = [];
  if (index.slice(from, to + end.length) !== block) {
    errors.push('index.html: баннер отличается от шаблона компонента');
  }
  const baseline = JSON.parse(read('components/hero-garden/baseline.json'));
  for (const [file, expected] of Object.entries(baseline)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
    if (actual !== expected) errors.push(`${file}: изменён закреплённый компонент`);
  }
  if (errors.length) {
    console.error(errors.join('\n'));
    console.error('Баннер меняется только по явной просьбе пользователя. См. components/hero-garden/README.md.');
    process.exitCode = 1;
  } else {
    console.log('hero-garden: шаблон синхронизирован, закреплённые файлы не изменены.');
  }
}
