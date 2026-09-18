#!/usr/bin/env node
'use strict';

// Static component: no runtime fetching, layout shift or dependency on JS.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { structure, preserveContent } = require('./hero-mood-content');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const template = read('components/hero-mood/template.html').trimEnd();
const index = read('index.html');
const start = '    <!-- component:hero-mood:start -->';
const end = '    <!-- component:hero-mood:end -->';
const block = `${start}\n${template}\n${end}`;
const from = index.indexOf(start);
const to = index.indexOf(end);

if (from < 0 || to < from || index.indexOf(start, from + 1) !== -1 ||
    index.indexOf(end, to + 1) !== -1) {
  throw new Error('Ожидается одна пара маркеров компонента hero-mood в index.html.');
}

if (process.argv.includes('--sync')) {
  const preserved = preserveContent(block, index.slice(from, to + end.length));
  fs.writeFileSync(path.join(root, 'index.html'), index.slice(0, from) + preserved + index.slice(to + end.length));
  console.log('Структура hero-mood синхронизирована. Тексты страницы и эталон не изменены.');
} else {
  const errors = [];
  if (structure(index.slice(from, to + end.length)) !== structure(block)) {
    errors.push('index.html: структура баннера отличается от шаблона компонента');
  }
  const baseline = JSON.parse(read('components/hero-mood/baseline.json'));
  for (const [file, expected] of Object.entries(baseline)) {
    let source = fs.readFileSync(path.join(root, file));
    let hash = expected;
    if (typeof expected === 'object') {
      if (file !== 'components/hero-mood/template.html' || expected.mode !== 'hero-content-slots-v1') {
        throw new Error(`Неизвестный режим эталона: ${file}`);
      }
      source = structure(source.toString('utf8'));
      hash = expected.sha256;
    }
    const actual = crypto.createHash('sha256').update(source).digest('hex');
    if (actual !== hash) errors.push(`${file}: изменён закреплённый компонент`);
  }
  if (errors.length) {
    console.error(errors.join('\n'));
    console.error('Баннер меняется только по явной просьбе пользователя. См. components/hero-mood/README.md.');
    process.exitCode = 1;
  } else {
    console.log('hero-mood: структура, стили и поведение сохранены; тексты страницы независимы.');
  }
}
