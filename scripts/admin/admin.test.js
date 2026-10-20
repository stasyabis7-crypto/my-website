#!/usr/bin/env node
// Проверки ядра админки на настоящих файлах сайта: правки не трогают
// остальную разметку, обратные операции возвращают файл байт в байт.
// Запуск: npm run admin:test (нужен parse5 из devDependencies).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = require('./html-source');
const feed = require('./feed-data');

const root = path.resolve(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const CASE = 'projects/avito-charity/recycle-map/index.html';
const source = read(CASE);
const outline = text => html.pageInfo(html.load(text)).outline;
const block = (text, id) => outline(text).find(item => item.htmlId === id);

// Оглавление уже совпадает с секциями — синхронизация ничего не меняет.
assert.equal(html.syncToc(source), source);

// Перестановка туда и обратно.
const moved = html.apply(source, { type: 'moveDown', id: block(source, 'about').id }).source;
assert.deepEqual(outline(moved).slice(0, 3).map(item => item.htmlId), ['summary', 'problems', 'about']);
assert.match(moved, /href="#problems"><span>Проблемы<\/span><\/a>\n\s*<a class="btn btn--fill-toc" href="#about">/);
assert.equal(html.apply(moved, { type: 'moveUp', id: block(moved, 'about').id }).source, source);

// Дублирование и удаление копии.
const copied = html.apply(source, { type: 'duplicate', id: block(source, 'about').id }).source;
assert.ok(block(copied, 'about-2'));
assert.equal(html.apply(copied, { type: 'remove', id: block(copied, 'about-2').id }).source, source);

// Новый блок из библиотеки: id по заголовку, пункт оглавления, пустая строка между секциями.
const inserted = html.apply(source, { type: 'insert', id: block(source, 'about').id, where: 'after', html: '<section class="case-block cg" id="new-block" tabindex="-1">\n  <div class="cg-intro">\n    <h2 class="text-h1">✎ Новый раздел</h2>\n  </div>\n</section>\n' });
assert.equal(inserted.inserted, 'novyy-razdel');
assert.match(inserted.source, /<\/section>\n\n      <section class="case-block cg" id="novyy-razdel" tabindex="-1">\n        <div class="cg-intro">/);
assert.match(inserted.source, /href="#novyy-razdel"><span>✎ Новый раздел<\/span>/);

// Переименование заголовка нового блока ведёт за собой id и оглавление.
const model = html.load(inserted.source);
const heading = model.nodes.find(node => node.tagName === 'h2' && html.cleanText(node) === '✎ Новый раздел');
const renamed = html.apply(inserted.source, { type: 'setInner', id: heading.adminId, html: 'Онбординг' }).source;
assert.ok(block(renamed, 'onbording'));
assert.match(renamed, /href="#onbording"><span>Онбординг<\/span>/);
assert.ok(!renamed.includes('novyy-razdel'));

// Текст: только строчная разметка, артефакты contenteditable убираются.
assert.equal(html.sanitizeInline('Жирный <b>текст</b>&nbsp; <i>и</i> <script>x</script><div>абзац</div>&nbsp;'), 'Жирный <strong>текст</strong> <em>и</em> x абзац');
assert.equal(html.sanitizeInline('<a href="javascript:alert(1)" onclick="x">ссылка</a>'), '<a>ссылка</a>');

// Атрибуты картинки: меняются только src и размеры.
const image = html.load(source).nodes.find(node => node.tagName === 'img' && /concept-1/.test(html.attr(node, 'src')));
const swapped = html.apply(source, { type: 'setMedia', id: image.adminId, attr: 'src', url: 'media/concepts/new-1600x900.webp', width: 1600, height: 900 }).source;
assert.match(swapped, /<img src="media\/concepts\/new-1600x900\.webp" alt="Концепт карты[^"]*" width="1600" height="900" loading="lazy" \/>/);
assert.equal(swapped.length - source.length, 'new-1600x900'.length - 'concept-1-v2-2880x1600'.length + 2 * ('1600'.length - '2880'.length) + ('900'.length - '1600'.length));

// Заглушка под кадр превращается в медиа с классами места.
const withStub = html.apply(source, { type: 'insert', id: block(source, 'about').id, where: 'append', html: '<div class="cg-stub cg-bleed" data-fill="media" style="--stub-ratio: 16 / 10"><p class="text-body">2880 × 1800</p></div>\n' }).source;
const stub = html.load(withStub).nodes.find(node => html.hasClass(node, 'cg-stub'));
const filled = html.apply(withStub, { type: 'fillStub', id: stub.adminId, url: 'media/about/x-2880x1800.webp', width: 2880, height: 1800 }).source;
assert.match(filled, /<div class="case-cover__media case-cover__media--natural cg-bleed"><img src="media\/about\/x-2880x1800\.webp" width="2880" height="1800" alt="" loading="lazy" \/><\/div>/);

// Палитра и мета-описание.
const palette = html.apply(source, { type: 'setPalette', palette: { '--case-accent': '#123456', '--case-icon-2': '' } }).source;
assert.match(palette, /--case-accent: #123456;/);
assert.ok(!palette.includes('--case-icon-2:'));
const meta = html.apply(source, { type: 'setMeta', title: 'Новое название', description: 'Новое описание' }).source;
assert.match(meta, /<title>Новое название<\/title>/);
assert.match(meta, /<meta property="og:description" content="Новое описание" \/>/);

// Заготовка нового кейса: пути от корня, одна секция и её пункт в оглавлении, без палитры.
const scaffold = html.scaffoldCase(source, CASE, { title: 'Тест', description: 'Описание', summary: '<section class="case-block case-cover cg" id="summary" tabindex="-1">\n  <h1 class="text-h1">Тест</h1>\n</section>\n' });
assert.ok(!/(src|href)="\.\.\//.test(scaffold));
assert.deepEqual(outline(scaffold).map(item => item.htmlId), ['summary']);
assert.ok(!/--case-(surface|accent|icon)/.test(scaffold));
assert.match(scaffold, /:root {\n  --page-px: 10px;\n}/);
assert.match(scaffold, /<title>Тест<\/title>/);

// Данные ленты: чтение и запись без изменений возвращают тот же файл.
const projects = read('pages/home/data/projects.js');
assert.equal(feed.writeProjects(projects, feed.readFeed(projects).projects), projects);
assert.throws(() => feed.validatePlaces([{ title: 'A', place: { c: 1, r: 1, big: true } }, { title: 'B', place: { c: 2, r: 2 } }]), /налезает/);
assert.throws(() => feed.validatePlaces([{ title: 'A', place: { c: 4, r: 1, big: true } }]), /выходит/);
assert.ok(feed.readPattern(read('components/project-feed/project-feed.js')).pattern.length > 0);

console.log('Админка: правки страниц, оглавление, заготовки и данные ленты проверены.');
