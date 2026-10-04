#!/usr/bin/env node
// Rule: a case's home cover (pages/home/data/projects.js) is also the first
// frame of its page — the same file from the case's covers/ folder.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'pages/home/data/projects.js'), 'utf8'), context);
const clean = url => (url || '').split(/[?#]/)[0];
const errors = [];
for (const project of context.window.portfolioProjects) {
  const page = path.join(root, project.href.replace(/^\//, ''), 'index.html');
  const html = fs.readFileSync(page, 'utf8');
  const summary = html.match(/<section\b[^>]*\bid="summary"[\s\S]*?<\/section>/);
  const frame = summary && summary[0].match(/<div class="case-cover__media[^"]*">([\s\S]*?)<\/div>/);
  if (!frame) { errors.push(`${project.id}: нет первого кадра .case-cover__media`); continue; }
  const media = frame[1];
  const expected = clean(project.video || project.image);
  const src = clean((media.match(/<(?:video|img)\b[^>]*\bsrc="([^"]+)"/) || [])[1]);
  if (src !== expected) errors.push(`${project.id}: первый кадр ${src || '—'}, а обложка ${expected}`);
  if (project.video) {
    const poster = clean((media.match(/\bposter="([^"]+)"/) || [])[1]);
    if (poster !== clean(project.image)) errors.push(`${project.id}: заглушка видео ${poster || '—'}, а обложка ${clean(project.image)}`);
  }
  if (!/\/covers\//.test(expected)) errors.push(`${project.id}: обложка должна лежать в covers/ кейса`);
}
if (errors.length) {
  console.error('Обложки кейсов:\n' + errors.join('\n'));
  process.exitCode = 1;
} else console.log(`Обложки кейсов: ${context.window.portfolioProjects.length} совпадают с первым кадром страницы.`);
