// Home covers show "N проектов" for each clickable section: keep the number in
// pages/home/data/sections.js equal to what the section page really holds.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const count = {
  'avito-charity': html => (html.match(/"id": "/g) || []).length,
  'ozon-crm': html => (html.match(/"id": "/g) || []).length,
  concepts: html => (html.match(/class="works-grid__item"/g) || []).length,
  activities: html => (html.match(/class="activity-article"/g) || []).length + (html.match(/<article class="project-card/g) || []).length,
};
global.window = {};
new Function('window', read('pages/home/data/sections.js'))(global.window);
let failed = false;
for (const group of window.portfolioGroups.filter(item => item.href)) {
  const slug = group.href.replace(/^\/projects\/|\/$/g, '');
  const actual = count[slug] ? count[slug](read(`projects/${slug}/index.html`)) : null;
  if (actual === null) { console.error(`Нет правила подсчёта для ${slug}`); failed = true; }
  else if (group.count !== actual) { console.error(`${slug}: в sections.js count=${group.count}, на странице ${actual}`); failed = true; }
}
if (failed) process.exit(1);
console.log('Счётчики проектов на обложках Главной совпадают со страницами разделов.');
