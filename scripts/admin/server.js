#!/usr/bin/env node
'use strict';
/*
  Локальная админка сайта: npm run admin → http://localhost:8010/dev/admin/
  Раздаёт сайт как есть, правит файлы репозитория и публикует их обычным
  путём — коммит и push в main, дальше деплой GitHub Actions.
  Слушает только 127.0.0.1. Описание — docs/admin.md.
*/
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawnSync, spawn } = require('node:child_process');
const html = require('./html-source');
const feed = require('./feed-data');
const { prepareImages } = require('../prepare-images');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = Number(process.env.ADMIN_PORT || 8010);
const PROJECTS_JS = 'pages/home/data/projects.js';
const FEED_JS = 'components/project-feed/project-feed.js';
const CHROME_JS = 'components/site-chrome/site-chrome.js';
const SCAFFOLD_FROM = 'projects/avito-charity/recycle-map/index.html';
const MEDIA_EXT = /\.(webp|png|jpe?g|avif|svg|gif|mp4|webm|pdf)$/i;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.avif': 'image/avif', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8'
};

/* ─── Файлы ─────────────────────────────────────────────────────────── */

function resolve(relative) {
  const clean = String(relative || '').replace(/^\/+/, '');
  const full = path.resolve(ROOT, clean);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) throw httpError(400, 'Путь вне сайта');
  if (/(^|[/\\])(\.git|node_modules)([/\\]|$)/.test(path.relative(ROOT, full))) throw httpError(400, 'Служебная папка');
  return full;
}
const rel = full => path.relative(ROOT, full).split(path.sep).join('/');
const read = file => fs.readFileSync(resolve(file), 'utf8');
function httpError(status, message) { const error = Error(message); error.status = status; return error; }

// История отмен: каждое действие — набор файлов с содержимым до правки.
const history = [];
function write(changes) {
  const group = [];
  for (const [file, content] of Object.entries(changes)) {
    const full = resolve(file);
    const before = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
    if (before === content) continue;
    group.push({ file, before });
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  if (group.length) history.push(group);
  if (history.length > 100) history.shift();
  return group.map(item => item.file);
}
function undo() {
  const group = history.pop();
  if (!group) throw httpError(400, 'Отменять нечего');
  for (const { file, before } of group) {
    if (before === null) fs.rmSync(resolve(file), { force: true });
    else fs.writeFileSync(resolve(file), before);
  }
  return group.map(item => item.file);
}

function walk(dir, test, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, test, found);
    else if (test(full)) found.push(full);
  }
  return found;
}

/* ─── Лента и страницы ──────────────────────────────────────────────── */

// Места плиток из набора PATTERN компонента — у всех проектов сразу,
// чтобы явные места и места по порядку не смешивались.
function withPlaces(projects) {
  const { pattern, rows } = feed.readPattern(read(FEED_JS));
  return projects.map((project, index) => {
    if (project.place) return project;
    const preset = pattern[index % pattern.length];
    const place = { c: preset.c, r: preset.r + Math.floor(index / pattern.length) * rows };
    if (preset.big) place.big = true;
    return { ...project, place };
  });
}

function feedState() {
  const data = feed.readFeed(read(PROJECTS_JS));
  const { pattern, rows } = feed.readPattern(read(FEED_JS));
  return { ...data, pattern, rows };
}

const pageFileOf = href => href ? href.replace(/^\/+/, '').replace(/[?#].*$/, '').replace(/index\.html$/, '').replace(/\/?$/, '/') + 'index.html' : null;

function htaccessRules() {
  const file = resolve('.htaccess');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').map((line, index) => {
    const match = line.match(/^\s*RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[([^\]]+)\])?/);
    if (!match) return null;
    try { return { index, line, pattern: new RegExp(match[1]), target: match[2], redirect: /\bR(=|\b)/.test(match[3] || '') }; } catch { return null; }
  }).filter(Boolean);
}
function redirected(url, rules = htaccessRules()) {
  const target = url.replace(/^\/+/, '');
  for (const rule of rules) if (rule.pattern.test(target)) return rule.redirect ? rule : null;
  return null;
}

function pages() {
  const { projects } = feed.readFeed(read(PROJECTS_JS));
  const rules = htaccessRules();
  return walk(resolve('projects'), full => full.endsWith(`${path.sep}index.html`)).map(full => {
    const file = rel(full);
    const source = fs.readFileSync(full, 'utf8');
    const url = '/' + file.replace(/index\.html$/, '');
    const project = projects.find(item => item.href && pageFileOf(item.href) === file);
    const title = (source.match(/<title>([^<]*)<\/title>/) || [])[1] || file;
    const status = source.includes('case__blocks') ? 'case' : source.includes('project-detail__pending') ? 'stub' : 'page';
    return { file, url, title, status, project: project ? project.id : null, soon: project ? !!project.soon : null, redirected: !!redirected(url, rules), depth: file.split('/').length };
  }).sort((a, b) => (a.project ? 0 : 1) - (b.project ? 0 : 1) || a.file.localeCompare(b.file));
}

// Первый кадр страницы кейса и обложка в projects.js — один и тот же файл
// (scripts/check-case-covers.js). После правки страницы подтягиваем обложку.
function coverSync(file, source, changes) {
  const projectsSource = changes[PROJECTS_JS] || read(PROJECTS_JS);
  const { projects } = feed.readFeed(projectsSource);
  const project = projects.find(item => item.href && pageFileOf(item.href) === file);
  if (!project) return;
  const summary = source.match(/<section\b[^>]*\bid="summary"[\s\S]*?<\/section>/);
  const frame = summary && summary[0].match(/<div class="case-cover__media[^"]*">([\s\S]*?)<\/div>/);
  if (!frame) return;
  const media = frame[1];
  const src = (media.match(/<(?:video|img)\b[^>]*\bsrc="([^"]+)"/) || [])[1];
  if (!src) return;
  const absolute = src.startsWith('/') ? src : '/' + path.posix.join(path.posix.dirname(file), src);
  const width = Number((media.match(/\bwidth="(\d+)"/) || [])[1]) || project.width;
  const height = Number((media.match(/\bheight="(\d+)"/) || [])[1]) || project.height;
  const next = { ...project, width, height };
  if (/^<video/.test(media.trim()) || /<video\b/.test(media)) {
    next.video = absolute;
    const poster = (media.match(/\bposter="([^"]+)"/) || [])[1];
    if (poster) next.image = poster.startsWith('/') ? poster : '/' + path.posix.join(path.posix.dirname(file), poster);
  } else {
    next.image = absolute;
    delete next.video;
  }
  if (JSON.stringify(next) === JSON.stringify(project)) return;
  // Новые поля обложки встают сразу за href, как у остальных проектов.
  const ordered = {};
  for (const key of Object.keys(project)) {
    if (key in next) ordered[key] = next[key];
    if (key === 'href') for (const extra of ['image', 'video', 'width', 'height']) if (extra in next && !(extra in project)) ordered[extra] = next[extra];
  }
  Object.assign(ordered, next);
  changes[PROJECTS_JS] = feed.writeProjects(projectsSource, projects.map(item => item === project ? ordered : item));
}

function editPage(file, op) {
  if (!/^projects\/.+\.html$/.test(file)) throw httpError(400, 'Редактируются только страницы в projects/');
  const source = read(file);
  const result = html.apply(source, op);
  if (!result.changed) return { version: html.version(source), changed: [] };
  const changes = { [file]: result.source };
  coverSync(file, result.source, changes);
  return { version: html.version(result.source), changed: write(changes), inserted: result.inserted || null };
}

/* ─── Загрузка файлов ───────────────────────────────────────────────── */

function uploadName(dir, name, ext, width, height) {
  const base = html.slugify(name.replace(/\.[^.]+$/, '').replace(/-?\d{3,5}x\d{3,5}$/, '')) || 'file';
  const size = width && height ? `-${width}x${height}` : '';
  for (let index = 1; ; index++) {
    const stem = `${base}${index > 1 ? '-' + index : ''}${size}`;
    const taken = [ext, '.webp', '.png'].some(item => fs.existsSync(path.join(dir, stem + item)));
    if (!taken) return stem + ext;
  }
}

function upload(query, body) {
  const dir = resolve(query.get('dir'));
  const relDir = rel(dir);
  if (!/^projects\//.test(relDir + '/')) throw httpError(400, 'Файлы кейсов кладутся в projects/');
  const original = query.get('name') || 'file';
  const ext = (path.extname(original) || '').toLowerCase().replace('.jpeg', '.jpg');
  if (!MEDIA_EXT.test(ext)) throw httpError(400, 'Этот формат не подходит для сайта: ' + ext);
  fs.mkdirSync(dir, { recursive: true });
  const name = uploadName(dir, query.get('base') || original, ext, Number(query.get('w')) || 0, Number(query.get('h')) || 0);
  let full = path.join(dir, name);
  fs.writeFileSync(full, body);
  // PNG сразу превращается в WebP без потерь тем же конвертером, что и в деплое.
  if (ext === '.png') {
    prepareImages(ROOT);
    full = full.replace(/\.png$/, '.webp');
    if (!fs.existsSync(full)) throw httpError(500, 'PNG не удалось преобразовать в WebP');
  }
  const file = rel(full);
  const page = query.get('page');
  const relative = page && file.startsWith(path.posix.dirname(page) + '/') ? file.slice(path.posix.dirname(page).length + 1) : null;
  return { file, url: '/' + file, relative, size: fs.statSync(full).size };
}

/* ─── Новый проект ──────────────────────────────────────────────────── */

const SUMMARY = title => `<section class="case-block case-cover cg" id="summary" tabindex="-1" aria-label="Саммари проекта">
  <div class="cg-intro">
    <h1 class="case-cover__title text-h1">${title.replace(/</g, '&lt;')}</h1>
    <div class="cg-intro__text">
      <p class="text-body-lg" data-subtitle><span class="cg-label">Проблема:</span> ✎ что было не так</p>
      <p class="text-body-lg" data-subtitle><span class="cg-label">Решение:</span> ✎ что сделала</p>
    </div>
  </div>

  <!-- Первый кадр кейса — файл из covers/, он же обложка в pages/home/data/projects.js. -->
  <div class="cg-stub cg-bleed cg-q234 cg-row-2" data-fill="media" data-cover style="--stub-ratio: 16 / 10"><p class="text-body">Первый кадр · 2880 × 1800</p></div>

  <div class="cg-meta cg-q1 cg-row-2">
    <dl class="cg-list text-body">
      <div><dt>Роль</dt><dd>✎ роль в проекте</dd></div>
      <div><dt>Команда</dt><dd>✎ кто был в команде</dd></div>
      <div><dt>Срок</dt><dd>✎ сколько длился</dd></div>
    </dl>
  </div>
</section>
`;

function createProject(body) {
  const title = String(body.title || '').trim();
  if (!title) throw httpError(400, 'Нужно название');
  const slug = html.slugify(body.slug || title);
  const group = body.group ? html.slugify(body.group) : '';
  const dir = ['projects', group, slug].filter(Boolean).join('/');
  const state = feed.readFeed(read(PROJECTS_JS));
  if (state.projects.some(item => item.id === slug)) throw httpError(400, `Проект с id «${slug}» уже есть`);
  if (!body.feed || !body.feed.image) throw httpError(400, 'Нужна обложка для ленты');
  const changes = {};
  const project = { id: slug, soon: true, title, feed: body.feed, alt: body.alt || title };
  if (body.page) {
    const file = `${dir}/index.html`;
    const full = resolve(file);
    const existing = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
    if (existing && existing.includes('case__blocks')) throw httpError(400, 'Страница кейса уже существует: ' + file);
    changes[file] = html.scaffoldCase(read(SCAFFOLD_FROM), SCAFFOLD_FROM, { title, description: body.description || title, summary: SUMMARY(title) });
    project.href = '/' + dir + '/';
  }
  if (body.place) project.place = body.place;
  const placed = withPlaces(state.projects);
  feed.validatePlaces([...placed, project]);
  changes[PROJECTS_JS] = feed.writeProjects(read(PROJECTS_JS), feed.sortByPlace([...placed, project]));
  write(changes);
  return { project, file: body.page ? `${dir}/index.html` : null };
}

// Страница для проекта, который пока стоит в ленте без неё: папка — та же,
// где лежит обложка ленты; заготовка «Подробности скоро» заменяется кейсом.
function createPage(id) {
  const source = read(PROJECTS_JS);
  const { projects } = feed.readFeed(source);
  const project = projects.find(item => item.id === id);
  if (!project) throw httpError(404, 'Нет такого проекта');
  const cover = (project.feed && project.feed.image) || project.image || '';
  const dir = (cover.match(/^\/(projects\/.+?)\/covers\//) || [])[1] || `projects/${html.slugify(id)}`;
  const file = `${dir}/index.html`;
  const full = resolve(file);
  const changes = {};
  if (!(fs.existsSync(full) && fs.readFileSync(full, 'utf8').includes('case__blocks'))) {
    changes[file] = html.scaffoldCase(read(SCAFFOLD_FROM), SCAFFOLD_FROM, { title: project.title, description: project.description || project.title, summary: SUMMARY(project.title) });
  }
  changes[PROJECTS_JS] = feed.writeProjects(source, projects.map(item => item === project ? { ...item, href: `/${dir}/` } : item));
  write(changes);
  return { file };
}

function saveFeed(projects) {
  if (!Array.isArray(projects)) throw httpError(400, 'Нужен список проектов');
  for (const project of projects) {
    if (!project.id || !project.title) throw httpError(400, 'У каждого проекта нужны id и название');
    if (!(project.feed && project.feed.image) && !project.image) throw httpError(400, `У «${project.title}» нет обложки`);
    if (!project.soon && !project.href) throw httpError(400, `У «${project.title}» нет страницы — отметьте «Скоро появится»`);
    if (!project.soon && !project.image) throw httpError(400, `У «${project.title}» на странице ещё нет первого кадра — загрузите его в блок «Саммари», потом снимайте «Скоро появится»`);
  }
  const placed = withPlaces(projects);
  feed.validatePlaces(placed);
  const source = read(PROJECTS_JS);
  return write({ [PROJECTS_JS]: feed.writeProjects(source, feed.sortByPlace(placed)) });
}

/* ─── .htaccess: открыть опубликованную страницу ────────────────────── */

function unredirect(url) {
  const file = resolve('.htaccess');
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split('\n');
  const rule = redirected(url);
  if (!rule) return [];
  const target = url.replace(/^\/+|\/+$/g, '');
  const parts = target.split('/');
  const line = lines[rule.index];
  const alternation = line.match(/\(\?:([^()]+)\)/);
  if (!alternation) throw httpError(400, 'Правило в .htaccess нужно поправить вручную: ' + line.trim());
  const options = alternation[1].split('|');
  const own = options.find(option => parts.includes(option));
  if (!own) throw httpError(400, 'Правило в .htaccess нужно поправить вручную: ' + line.trim());
  const rest = options.filter(option => option !== own);
  const replacement = [];
  if (rest.length) replacement.push(line.replace(alternation[0], `(?:${rest.join('|')})`));
  // Правило на весь раздел: остальные заготовки раздела остаются закрытыми.
  if (parts.indexOf(own) === parts.length - 2) {
    const groupDir = resolve(parts.slice(0, -1).join('/'));
    const siblings = fs.readdirSync(groupDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name !== parts[parts.length - 1] && fs.existsSync(path.join(groupDir, entry.name, 'index.html')))
      .map(entry => entry.name);
    const base = parts.slice(0, -1).join('/');
    replacement.push(`  RewriteRule ^${base}/?(?:index\\.html)?$ /#works-gallery [R=302,NE,L]`);
    if (siblings.length) replacement.push(`  RewriteRule ^${base}/(?:${siblings.join('|')})(?:/.*)?$ /#works-gallery [R=302,NE,L]`);
  }
  lines.splice(rule.index, 1, ...replacement);
  return write({ '.htaccess': lines.join('\n') });
}

/* ─── Ссылки, контакты, резюме ──────────────────────────────────────── */

function literal(source, name) {
  const match = source.match(new RegExp(`var ${name} = (\\[[\\s\\S]*?\\n\\s*\\]);`));
  if (!match) throw httpError(500, `Не найден список ${name} в site-chrome.js`);
  return { match, value: require('node:vm').runInNewContext('(' + match[1] + ')', { EMAIL: '' }) };
}

function links() {
  const source = read(CHROME_JS);
  const email = (source.match(/var EMAIL = '([^']*)'/) || [])[1] || '';
  const items = literal(source, 'ITEMS').value.map(item => item.copy !== undefined ? { ...item, copy: 'EMAIL' } : item);
  const sections = literal(source, 'SECTIONS').value;
  // Контакты рисуют иконку icon--social-<имя>, пункты меню — icon--<имя>.
  const all = [...new Set([...read('components/icons/icons.css').matchAll(/\.icon--([a-z0-9-]+)/g)].map(match => match[1]))].sort();
  const icons = { social: all.filter(name => name.startsWith('social-')).map(name => name.slice(7)), plain: all.filter(name => !name.startsWith('social-')) };
  const resume = (read('index.html').match(/\/cv\.pdf\?v=(\d+)/) || [])[1] || '';
  return { email, items, sections, icons, resume };
}

function writeList(source, name, list, indent) {
  const { match } = literal(source, name);
  const quote = value => "'" + String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  // Поля пункта — в его собственном порядке, как в файле.
  const body = list.map(item => {
    const fields = Object.keys(item).filter(key => ['label', 'icon', 'href', 'copy'].includes(key))
      .map(key => key === 'copy' ? 'copy: EMAIL' : `${key}: ${quote(item[key])}`);
    return `${indent}{ ${fields.join(', ')} }`;
  }).join(',\n');
  const closing = match[1].match(/\n(\s*)\]$/)[1];
  return source.replace(match[1], `[\n${body}\n${closing}]`);
}

function saveLinks(body) {
  let source = read(CHROME_JS);
  if (body.email) source = source.replace(/var EMAIL = '[^']*'/, `var EMAIL = '${String(body.email).replace(/'/g, '')}'`);
  if (body.items) source = writeList(source, 'ITEMS', body.items, '      ');
  if (body.sections) source = writeList(source, 'SECTIONS', body.sections, '      ');
  return write({ [CHROME_JS]: source });
}

function replaceResume(bytes) {
  if (bytes.subarray(0, 5).toString() !== '%PDF-') throw httpError(400, 'Это не PDF');
  fs.writeFileSync(resolve('cv.pdf'), bytes);
  // Новая версия в адресе, иначе CDN хостинга отдаёт старый файл.
  const changes = {};
  for (const full of walk(ROOT, file => /\.(html|js)$/.test(file) && !rel(file).startsWith('scripts/') && !rel(file).startsWith('dev/'))) {
    const source = fs.readFileSync(full, 'utf8');
    const next = source.replace(/\/cv\.pdf\?v=(\d+)/g, (match, number) => `/cv.pdf?v=${Number(number) + 1}`);
    if (next !== source) changes[rel(full)] = next;
  }
  return write(changes);
}

/* ─── Публикация ────────────────────────────────────────────────────── */

const git = (...args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });

function orphans() {
  const tracked = new Set(git('ls-files').stdout.split('\n'));
  const media = walk(resolve('projects'), full => /[/\\](media|covers)[/\\]/.test(full) && MEDIA_EXT.test(full));
  const texts = walk(ROOT, full => /\.(html|css|js|json)$/.test(full) && !rel(full).startsWith('dev/') && !rel(full).startsWith('scripts/'))
    .map(full => fs.readFileSync(full, 'utf8')).join('\n');
  return media.filter(full => !texts.includes(path.basename(full)))
    .map(full => ({ file: rel(full), tracked: tracked.has(rel(full)), size: fs.statSync(full).size }));
}

function publishState() {
  const status = git('status', '--porcelain', '-uall').stdout.split('\n').filter(Boolean)
    .map(line => ({ code: line.slice(0, 2).trim(), file: line.slice(3) }));
  const warnings = [];
  const { projects } = feed.readFeed(read(PROJECTS_JS));
  const rules = htaccessRules();
  for (const page of pages()) {
    const source = read(page.file);
    const stubs = (source.match(/class="cg-stub/g) || []).length;
    const marks = (source.match(/✎/g) || []).length;
    if (stubs) warnings.push({ file: page.file, text: `${page.title}: ${stubs} пустых мест под картинки` });
    if (marks) warnings.push({ file: page.file, text: `${page.title}: ${marks} заготовок текста со знаком ✎` });
  }
  for (const project of projects.filter(item => !item.soon && item.href)) {
    if (redirected(project.href, rules)) warnings.push({ text: `«${project.title}» на сайте перенаправляется на Главную правилом .htaccess`, fix: { type: 'unredirect', url: project.href } });
  }
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD').stdout.trim();
  return { branch, status, warnings, orphans: orphans() };
}

function run(command, args, log) {
  return new Promise(done => {
    const child = spawn(command, args, { cwd: ROOT, env: process.env });
    child.stdout.on('data', chunk => log.push(String(chunk)));
    child.stderr.on('data', chunk => log.push(String(chunk)));
    child.on('close', code => done(code));
    child.on('error', error => { log.push(error.message + '\n'); done(1); });
  });
}

async function publish(body) {
  const log = [];
  const step = title => log.push(`\n▸ ${title}\n`);
  for (const file of body.removeOrphans || []) {
    const full = resolve(file);
    if (!/^projects\/.+[/](media|covers)[/]/.test(rel(full))) continue;
    fs.rmSync(full, { force: true });
    log.push(`удалён неиспользуемый файл ${file}\n`);
  }
  step('Картинки PNG → WebP');
  try { prepareImages(ROOT); log.push('готово\n'); } catch (error) { log.push(error.message + '\n'); return { ok: false, log: log.join('') }; }
  step('Проверки сайта (npm run check)');
  if (await run('npm', ['run', 'check', '--silent'], log)) return { ok: false, log: log.join('') + '\n✗ Проверки не прошли — ничего не опубликовано.\n' };
  step('Коммит');
  await run('git', ['add', '-A'], log);
  if (!git('diff', '--cached', '--quiet').status) return { ok: true, log: log.join('') + 'Изменений нет.\n' };
  if (await run('git', ['commit', '-m', String(body.message || 'Обновление сайта из админки')], log)) return { ok: false, log: log.join('') };
  step('Отправка (git push)');
  if (await run('git', ['push'], log)) return { ok: false, log: log.join('') + '\n✗ Коммит создан, но не отправлен — проверьте доступ к GitHub.\n' };
  history.length = 0;
  return { ok: true, log: log.join('') + '\n✓ Отправлено. Сайт обновится после деплоя GitHub Actions (обычно 2–4 минуты).\n' };
}

/* ─── HTTP ──────────────────────────────────────────────────────────── */

function body(req, limit = 512 * 1024 * 1024) {
  return new Promise((done, fail) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) { fail(httpError(413, 'Файл слишком большой')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => done(Buffer.concat(chunks)));
    req.on('error', fail);
  });
}
const json = async req => JSON.parse(String(await body(req, 20 * 1024 * 1024)) || '{}');

function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function serveFile(req, res, url) {
  let full = resolve(decodeURIComponent(url.pathname));
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
    if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: url.pathname + '/' + url.search }); res.end(); return; }
    full = path.join(full, 'index.html');
  }
  if (!fs.existsSync(full)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Не найдено'); return; }
  const type = TYPES[path.extname(full).toLowerCase()] || 'application/octet-stream';
  if (full.endsWith('.html') && url.searchParams.has('admin-edit')) {
    const file = rel(full);
    const model = html.load(fs.readFileSync(full, 'utf8'));
    const page = JSON.stringify({ file, version: model.version }).replace(/</g, '\\u003c');
    const output = html.annotate(model, {
      head: '<link rel="stylesheet" href="/dev/admin/editor.css" />\n',
      body: `<script>window.__adminPage = ${page};</script>\n<script src="/dev/admin/editor.js"></script>\n`
    });
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(output);
    return;
  }
  const stat = fs.statSync(full);
  const range = req.headers.range && req.headers.range.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : stat.size - Number(range[2]);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'no-store' });
    fs.createReadStream(full, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  fs.createReadStream(full).pipe(res);
}

const routes = {
  'GET /api/state': () => ({ feed: feedState(), pages: pages(), groups: fs.readdirSync(resolve('projects'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name), undo: history.length }),
  'GET /api/page': ({ query }) => {
    const file = query.get('file');
    const model = html.load(read(file));
    return { file, ...html.pageInfo(model) };
  },
  'GET /api/node': ({ query }) => {
    const model = html.load(read(query.get('file')));
    if (query.get('version') && query.get('version') !== model.version) throw httpError(409, 'Файл изменился');
    return html.describe(model, query.get('id'));
  },
  'POST /api/edit': async ({ req }) => { const data = await json(req); return { ...editPage(data.file, { ...data.op, version: data.version }), undo: history.length }; },
  'POST /api/upload': async ({ req, query }) => upload(query, await body(req)),
  'POST /api/feed': async ({ req }) => ({ changed: saveFeed((await json(req)).projects), undo: history.length }),
  'POST /api/project/page': async ({ req }) => ({ ...createPage((await json(req)).id), undo: history.length }),
  'POST /api/project': async ({ req }) => ({ ...createProject(await json(req)), undo: history.length }),
  'POST /api/undo': () => ({ changed: undo(), undo: history.length }),
  'GET /api/links': () => links(),
  'POST /api/links': async ({ req }) => ({ changed: saveLinks(await json(req)), undo: history.length }),
  'POST /api/resume': async ({ req }) => ({ changed: replaceResume(await body(req)), undo: history.length }),
  'GET /api/publish': () => publishState(),
  'POST /api/publish': async ({ req }) => publish(await json(req)),
  'POST /api/unredirect': async ({ req }) => ({ changed: unredirect((await json(req)).url), undo: history.length })
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    // Только этот компьютер; изменения — только из самой админки
    // (свой заголовок не отправит чужая страница без разрешения CORS).
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) throw httpError(403, 'Только localhost');
    if (url.pathname === '/admin' || url.pathname === '/admin/') { res.writeHead(302, { Location: '/dev/admin/' }); res.end(); return; }
    if (url.pathname.startsWith('/api/')) {
      if (req.headers['x-admin'] !== '1') throw httpError(403, 'Нет доступа');
      const route = routes[`${req.method} ${url.pathname}`];
      if (!route) throw httpError(404, 'Нет такого действия');
      send(res, 200, await route({ req, query: url.searchParams }));
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw httpError(405, 'Метод не поддерживается');
    serveFile(req, res, url);
  } catch (error) {
    if (!error.status) console.error(error);
    if (!res.headersSent) send(res, error.status || 500, { error: error.message });
    else res.end();
  }
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Админка: http://localhost:${PORT}/dev/admin/`);
    console.log('Сайт без режима правки: http://localhost:' + PORT + '/index.html');
  });
}

module.exports = { server, pageFileOf, redirected, htaccessRules };
