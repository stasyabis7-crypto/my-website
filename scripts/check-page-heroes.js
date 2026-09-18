#!/usr/bin/env node
// A family contract, not identical markup/copy across unrelated pages.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const errors = [];
let count = 0;
function check(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const hero = source.match(/<section\b[^>]*class="[^"]*\bmood-hero\b[^"]*"[^>]*>[\s\S]*?<\/section>/);
  if (!hero) return; // Older case placeholders do not have this banner yet.
  count++;
  const markup = hero[0];
  const fail = message => errors.push(`${file}: ${message}`);
  if (!/<h1\b[^>]*class="[^"]*\bmood-title\b/.test(markup)) fail('Нет заголовка баннера');
  if (!/<p\b[^>]*class="[^"]*\bmood-subtitle\b/.test(markup)) fail('Нет подзаголовка баннера');
  if (file === 'index.html') {
    if (!markup.includes('id="mood-character"') || !markup.includes('id="mood-canvas"')) fail('На Главной ожидается персонаж');
  } else {
    if (!/<img\b[^>]*class="[^"]*\bproject-hero__image\b/.test(markup)) fail('Внутренний баннер должен содержать картинку');
    if (markup.includes('id="mood-character"')) fail('Персонаж не должен заменять картинку внутреннего баннера');
  }
  const actions = [...markup.matchAll(/<a\b[^>]*class="[^"]*\bmood-primary\b[^"]*"[^>]*>[\s\S]*?<\/a>/g)];
  if (actions.length !== 1) { fail('Ожидается одна основная кнопка'); return; }
  const action = actions[0][0];
  const href = action.match(/\bhref="([^"]+)"/)?.[1] || '';
  if (href.startsWith('#') && href.length > 1) {
    if (!source.includes(`id="${href.slice(1)}"`)) fail('Цель прокрутки кнопки не найдена');
    if (!action.includes('icon--down')) fail('Кнопке прокрутки нужна иконка вниз');
    if (/\btarget=/.test(action)) fail('Прокрутка должна оставаться на текущей странице');
  } else if (/^https?:\/\//.test(href)) {
    if (!action.includes('icon--arrow-diagonal')) fail('Ссылке на прод нужна диагональная стрелка');
    if (action.includes('target="_blank"') && !/\brel="[^"]*\bnoopener\b/.test(action)) fail('Для нового окна нужен rel="noopener"');
  } else fail('Кнопка должна вести на прод (http/https) или на раздел этой страницы (#id)');
}
function visit(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (entry.name.endsWith('.html')) check(file);
  }
}
check('index.html');
visit('projects');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Баннеры: ${count} проверено; тексты, картинки и адреса задаются страницами.`);
