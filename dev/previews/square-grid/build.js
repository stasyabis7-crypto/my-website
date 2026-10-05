// Собирает страницы стенда «сетка из квадратов» с настоящим контентом сайта.
//   node build.js
// Контент кейсов, статей, постов и Playground лежит в content.json — его
// снимает с живых страниц extract.js. Проекты Главной берутся из данных ленты.
//
// Раскладка: каждый блок — прямоугольник из целых квадратов. Размер блока
// выбирается по виду контента (и длине текста), место подбирает укладчик:
// блоки идут по порядку слева направо, соседние стоят на одном уровне.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const content = require('./content.json');
const home = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../../pages/home/data/projects.js'), 'utf8'), home);
const projects = home.window.portfolioProjects;
const tagLabel = Object.fromEntries(home.window.portfolioTags.map(tag => [tag.id, tag.label]));

const COLS = { d: 6, t: 4, m: 2 };
const esc = value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const icon = name => `<span class="icon icon--${name}" aria-hidden="true"></span>`;
const caseFile = href => 'case-' + href.split('/').filter(Boolean).pop() + '.html';

/* ---------- Размеры блоков ---------- */

// Высота текстового блока в квадратах: шрифты стенда привязаны к стороне
// квадрата, поэтому оценка одна для всех ширин экрана.
function textRows(width, chars, titleChars = 0, extra = 0) {
  const perLine = (21 * width - 3) * 0.86;
  const lines = Math.ceil(chars / perLine);
  const titleLines = titleChars ? Math.ceil(titleChars / (perLine * 0.72)) : 0;
  return Math.max(1, Math.ceil(lines * 0.107 + titleLines * 0.125 + extra + 0.2 - 0.03));
}
// Медиа: размер по пропорции кадра. [ширина, высота] для десктопа, планшета, телефона.
function mediaSize(ratio) {
  if (ratio >= 1.9) return { d: [4, 2], t: [4, 2], m: [2, 1] };
  if (ratio >= 1.4) return { d: [3, 2], t: [3, 2], m: [2, 2] };
  if (ratio >= 0.78) return { d: [2, 2], t: [2, 2], m: [2, 2] };
  if (ratio >= 0.6) return { d: [2, 3], t: [2, 3], m: [2, 3] };
  return { d: [1, 2], t: [1, 2], m: [1, 2] };
}
const sized = (d, t = d, m = t) => ({ d, t, m });
const textSize = (chars, widths, titleChars, extra) => {
  const size = {};
  for (const bp of ['d', 't', 'm']) size[bp] = [widths[bp], textRows(widths[bp], chars, titleChars, extra)];
  return size;
};

/* ---------- Укладчик ---------- */

class Packer {
  constructor(cols) { this.cols = cols; this.rows = []; this.from = 1; this.bottom = 0; this.anchor = 1; }
  free(col, row, w, h) {
    for (let r = row; r < row + h; r++) for (let c = col; c < col + w; c++) if ((this.rows[r] || [])[c]) return false;
    return true;
  }
  // Первое свободное место не выше предыдущего блока; col закрепляет колонку.
  place(w, h, col) {
    w = Math.min(w, this.cols);
    for (let row = this.from; ; row++) {
      const candidates = col ? [Math.min(col, this.cols - w + 1)] : Array.from({ length: this.cols - w + 1 }, (_, i) => i + 1);
      for (const c of candidates) {
        if (!this.free(c, row, w, h)) continue;
        for (let r = row; r < row + h; r++) { this.rows[r] = this.rows[r] || []; for (let x = c; x < c + w; x++) this.rows[r][x] = true; }
        this.from = row;
        this.bottom = Math.max(this.bottom, row + h - 1);
        return [c, row, w, h];
      }
    }
  }
  // Следующий блок начнётся с нового ряда (skip — сколько рядов воздуха оставить).
  breakRow(skip = 0) { this.from = this.bottom + 1 + skip; this.bottom = this.from - 1; this.anchor = this.from; }
  // Точное место: колонка и ряд относительно последнего разрыва ряда.
  pin(w, h, col, offset) {
    const row = this.anchor + offset;
    for (let r = row; r < row + h; r++) { this.rows[r] = this.rows[r] || []; for (let x = col; x < col + w; x++) this.rows[r][x] = true; }
    this.bottom = Math.max(this.bottom, row + h - 1);
    return [col, row, w, h];
  }
}

/* ---------- Сборка секции ---------- */

// Элемент: { html, type, size: {d,t,m}, col?: {d,t,m}, pin?: {d: [колонка, ряд от разрыва]}, href?, stack?: [элементы под ним] } или { break: n }.
function layout(items) {
  const blocks = items.filter(item => !('break' in item)).flatMap(item => [item, ...(item.stack || [])]);
  blocks.forEach(block => { block.pos = {}; });
  for (const bp of ['d', 't', 'm']) {
    const packer = new Packer(COLS[bp]);
    for (const item of items) {
      if ('break' in item) { if (!item.only || item.only.includes(bp)) packer.breakRow(item.break); continue; }
      const parts = [item, ...(item.stack || [])];
      const w = Math.min(item.size[bp][0], COLS[bp]);
      const h = parts.reduce((sum, part) => sum + part.size[bp][1], 0);
      const [c, r] = item.pin && item.pin[bp] ? packer.pin(w, h, ...item.pin[bp]) : packer.place(w, h, item.col && item.col[bp]);
      let row = r;
      for (const part of parts) { part.pos[bp] = [c, row, w, part.size[bp][1]]; row += part.size[bp][1]; }
    }
  }
  return blocks;
}
function blockHtml(block) {
  const vars = [];
  const off = [];
  for (const [bp, prefix] of [['d', ''], ['t', 't'], ['m', 'm']]) {
    // Блока нет на этой ширине экрана.
    if (!block.pos[bp]) { off.push(bp + '-off'); continue; }
    const [c, r, w, h] = block.pos[bp];
    vars.push(`--${prefix}c:${c}`, `--${prefix}r:${r}`, `--${prefix}w:${w}`, `--${prefix}h:${h}`);
    if (block.ratio) vars.push(`--${prefix}fit:${Math.abs(Math.log((w / h) / block.ratio)) > 0.13 ? 'contain' : 'cover'}`);
  }
  const cls = ['b', ...(block.type ? block.type.split(' ').map(name => 'b--' + name) : []), ...(block.href ? ['b--click'] : []), ...off].join(' ');
  if (block.group) block.attrs = (block.attrs || '') + ` data-group="${block.group}"`;
  const tag = block.href ? 'a' : 'div';
  const link = block.href ? ` href="${esc(block.href)}"${/^https?:/.test(block.href) ? ' target="_blank" rel="noopener noreferrer"' : ''}` : '';
  return `      <${tag} class="${cls}"${link}${block.attrs || ''} style="${vars.join(';')}">${block.html}</${tag}>`;
}
const section = (name, items, { air = 1, id = '' } = {}) =>
  `    <!-- ${name} -->\n    <section class="grid" aria-label="${esc(name)}"${id ? ` id="${id}"` : ''}${air ? ` style="--air:${air}"` : ''}>\n${layout(items).map(blockHtml).join('\n')}\n    </section>`;

/* ---------- Компоненты ---------- */

const mediaTag = (media, auto = true) => media.tag === 'video'
  ? `<video src="${esc(media.src)}"${media.poster ? ` poster="${esc(media.poster)}"` : ''} muted loop playsinline${auto ? ' autoplay' : ''} preload="metadata" aria-label="${esc(media.alt)}"></video>`
  : `<img src="${esc(media.src)}" alt="${esc(media.alt)}" loading="lazy" decoding="async" />`;
const mediaBlock = (media, size) => ({ html: mediaTag(media), type: 'fill', size: size || mediaSize(media.ratio), ratio: media.ratio });
const heading = (title, level = 'h2') => ({ html: `<${level} class="t-${level}">${esc(title)}</${level}>`, type: 'head', size: sized([level === 'h1' ? 4 : 2, 1], [level === 'h1' ? 4 : 2, 1], [2, 1]) });
const textBlock = (text, widths = { d: 3, t: 3, m: 2 }) => ({ html: `<p class="t-body">${esc(text)}</p>`, type: 'text', size: textSize(text.length, widths) });
// Кнопка — ячейка с подписью, без стрелки.
const button = (label, name, href) => ({ html: `<span>${esc(label)}</span>`, type: 'btn', size: sized([1, 1]), href });
// Заглушка на месте будущей картинки.
const placeholder = (label, size) => ({ html: `<span class="t-small">${esc(label)}</span>`, type: 'fill ph', size });

// Проект: сначала название с описанием, под ними обложка. Кликабельны оба
// блока и подсвечиваются вместе. На десктопе место закреплено, чтобы два
// проекта рядом стояли на одном уровне.
function projectItems(project, col) {
  const tags = project.tags.map(id => tagLabel[id]).join(' · ');
  const href = caseFile(project.href);
  const cover = { tag: 'video', src: project.video, poster: project.image, alt: project.alt, ratio: project.width / project.height };
  const group = 'project-' + project.id;
  return [
    { html: `<h3 class="t-h3">${esc(project.title)}</h3><p class="t-body">${esc(project.description)}</p><p class="t-tags">${esc(tags)}</p>`,
      type: 'text', size: sized([3, 1], [3, 1], [2, 1]), col: { t: 1, m: 1 }, pin: { d: [col, 0] }, href, group },
    { html: mediaTag(cover), type: 'fill cover', size: sized([3, 2], [3, 2], [2, 2]),
      col: { t: 1, m: 1 }, pin: { d: [col, 1] }, href, group, attrs: ` tabindex="-1" aria-hidden="true"` },
  ];
}

const CONTACTS = [
  ['Telegram', 'telegram', 'https://t.me/stasyabis'],
  ['Почта', 'email', 'mailto:stasyabis7@gmail.com'],
  ['Dribbble', 'dribbble', 'https://dribbble.com/Stasyabis'],
  ['Figma community', 'figma', 'https://www.figma.com/@stasyabis'],
  ['Medium', 'medium', 'https://medium.com/@stasyabis'],
  ['Habr', 'habr', 'https://habr.com/ru/users/stasyabis/'],
];
const NAV = [['Статьи', 'articles.html'], ['Посты', 'posts.html'], ['Playground', 'playground.html']];
const contactsSection = () => section('Контакты', [
  { html: '<h2 class="t-h2">Связаться</h2>', type: 'head', size: sized([2, 1]) },
  { break: 0 },
  ...CONTACTS.map(([label, name, href]) => ({ html: `<span>${label}</span>${icon('social-' + name)}`, type: 'link', size: sized([1, 1]), href })),
], { id: 'contacts' });

// Шапка — не сетка: строка с линией снизу. Лого слева, пункты меню текстом
// по центру, справа кнопки-ячейки «Резюме PDF» и «Связаться» шириной в
// колонку. Ниже десктопа пункты уходят в «Меню» на весь экран.
function header(current, back) {
  const external = href => (/^https?:/.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '');
  const row = ([label, name, href], cls = '') => `        <a class="drop__row b--click${cls}" href="${href}"${external(href)}><span>${label}</span>${name ? icon(name) : ''}</a>`;
  const contactRows = CONTACTS.map(([label, name, href]) => [label, 'social-' + name, href]);
  return `    <!-- Шапка -->
    <header class="site-top">
      <a class="top-home" href="index.html" aria-label="${back ? 'Назад на главную' : 'Анастасия Вихарева'}">${back ? icon('arrow-left') : ''}<span class="top-logo"></span></a>
      <nav class="top-nav" aria-label="Разделы сайта">
${NAV.map(([label, href]) => `        <a class="top-link" href="${href}"${current === href ? ' aria-current="page"' : ''}>${label}</a>`).join('\n')}
      </nav>
      <div class="top-actions">
        <a class="top-cell top-cell--resume b--click" href="/cv.pdf" target="_blank" rel="noopener noreferrer">Резюме PDF</a>
        <button type="button" class="top-cell top-cell--contacts b--click" data-drop="drop-contacts" aria-expanded="false" aria-controls="drop-contacts">Связаться</button>
        <button type="button" class="top-cell top-cell--menu b--click" data-drop="drop-menu" aria-expanded="false" aria-controls="drop-menu">Меню</button>
      </div>
      <div class="drop drop--contacts" id="drop-contacts" hidden>
${contactRows.map(item => row(item)).join('\n')}
      </div>
      <div class="drop drop--menu" id="drop-menu" hidden>
${[...NAV.map(([label, href]) => row([label, '', href], ' drop__row--big')), row(['Резюме PDF', '', '/cv.pdf'], ' drop__row--big'), ...contactRows.map(item => row(item))].join('\n')}
      </div>
    </header>`;
}

const page = (title, current, back, body) => `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>Сетка — ${esc(title)}</title>
<link rel="stylesheet" href="../../../styles/fonts.css" />
<link rel="stylesheet" href="../../../styles/typography.css" />
<link rel="stylesheet" href="../../../components/icons/icons.css" />
<link rel="stylesheet" href="grid.css" />
</head>
<body>
  <div class="page">
    <div class="lines" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
${header(current, back)}

${body.join('\n\n')}

${contactsSection()}
  </div>
  <script src="grid.js"></script>
</body>
</html>
`;

/* ---------- Страницы ---------- */

const pages = {};

// Главная. Баннер — одна фотография, разрезанная на квадраты-секторы. Каждый
// сектор показывает свой кусок фото в одном из стилей и время от времени
// меняет стиль (grid.js). Заголовок, подзаголовок и кнопка занимают по одному
// квадрату; у текстовых квадратов меняется только яркий фон.
// Пока настоящих стилизованных фото нет, стили изображают CSS-фильтры.
// Фото одно и одной пропорции (2:1) на всех ширинах: оно только масштабируется,
// а режется по колонкам страницы — 6×3, 4×2 или 2×1 квадратов. На десктопе
// текстовые квадраты стоят внутри фото, на узких экранах — рядом под ним.
const HERO = {
  d: { cols: 6, rows: 3, title: [5, 2], text: [5, 3], button: [6, 3] },
  t: { cols: 4, rows: 2, title: [2, 3], text: [3, 3], button: [4, 3] },
  m: { cols: 2, rows: 1, title: [1, 2], text: [2, 2], button: [2, 3] },
};
const heroFree = bp => {
  const { cols, rows, title, text, button } = HERO[bp];
  const taken = [title, text, button].map(String);
  const cells = [];
  for (let r = 1; r <= rows; r++) for (let c = 1; c <= cols; c++) if (!taken.includes(String([c, r]))) cells.push([c, r]);
  return cells;
};
const heroCell = (html, type, at, extra = {}) => ({
  html, type, ...extra,
  pos: Object.fromEntries(['d', 't', 'm'].map(bp => [bp, at[bp] ? [...at[bp], 1, 1] : null])),
});
const free = { d: heroFree('d'), t: heroFree('t'), m: heroFree('m') };
const heroBlocks = [
  ...free.d.map((cell, i) => heroCell('', 'photo', { d: cell, t: free.t[i], m: free.m[i] }, { attrs: ` data-style="${(i * 3) % 7}" aria-hidden="true"` })),
  heroCell('<h1 class="t-body">Анастасия Вихарева</h1>', 'tone', { d: HERO.d.title, t: HERO.t.title, m: HERO.m.title }, { attrs: ' data-tone="0"' }),
  heroCell('<p class="t-body">Senior Product Designer в Авито, раньше Ozon. 6&nbsp;лет проектирую продуктовые сценарии: платежи, CRM, дашборды.</p>',
    'tone', { d: HERO.d.text, t: HERO.t.text, m: HERO.m.text }, { attrs: ' data-tone="2"' }),
  heroCell('<span>Смотреть работы</span>', 'btn', { d: HERO.d.button, t: HERO.t.button, m: HERO.m.button }, { href: '#works' }),
];
const hero = `    <!-- Баннер -->\n    <section class="grid hero" aria-label="Баннер">\n${heroBlocks.map(blockHtml).join('\n')}\n    </section>`;
const feed = [];
projects.forEach((project, index) => {
  // Пара проектов — общий ряд; между парами ряд воздуха (на узких экранах — между проектами).
  feed.push(index % 2 === 0 ? { break: index ? 1 : 0 } : { break: 1, only: ['t', 'm'] });
  feed.push(...projectItems(project, index % 2 ? 4 : 1));
});
pages['index.html'] = page('Главная', '', false, [hero, section('Проекты', feed, { id: 'works' })]);

// Кейс: сводка (заголовок, кнопка, проблема и решение, обложка, метрики) и разделы.
function caseItem(item, context) {
  const cardWidths = { d: 2, t: 2, m: 2 };
  if (item.kind === 'media') {
    const squares = context.medias.filter(media => media.ratio >= 0.9 && media.ratio < 1.4).length;
    const big = context.medias.length === 2 && squares === 2 ? sized([3, 3], [2, 2], [2, 2]) : null;
    return mediaBlock(item.media, big);
  }
  if (item.kind === 'metric') return { html: `<p class="t-metric">${esc(item.title)}</p><p class="t-body">${esc(item.text)}</p>`, type: 'text', size: sized([2, 1]) };
  if (item.kind === 'team') return { html: `<p class="t-small">${esc(item.number)}</p><h3 class="t-h3">${esc(item.title)}</h3><p class="t-small">${esc(item.text)}</p>`, type: 'text', size: sized([1, 1]) };
  if (item.kind === 'step') return { html: `<p class="t-small">${esc(item.number)}</p><p class="t-body">${esc(item.title)}</p>`, type: 'text', size: sized([1, 1]) };
  if (item.kind === 'button') return button(item.title, 'arrow-diagonal', item.href);
  if (item.kind === 'card') {
    const text = { html: (item.title ? `<h3 class="t-h3">${esc(item.title)}</h3>` : '') + `<p class="t-body">${esc(item.text)}</p>`, type: 'text' };
    if (!item.media) return { ...text, size: textSize(item.text.length, cardWidths, (item.title || '').length) };
    // Картинка с подписью: сначала текст, под ним картинка той же ширины.
    const media = mediaBlock(item.media, context.pairSize);
    const widths = { d: media.size.d[0], t: media.size.t[0], m: media.size.m[0] };
    return { ...text, size: textSize(item.text.length, widths, (item.title || '').length), stack: [media] };
  }
  return textBlock(item.text);
}
function caseSection(part) {
  const medias = part.items.filter(item => item.media && item.kind !== 'metric').map(item => item.media);
  const squares = medias.filter(media => media.ratio >= 0.9 && media.ratio < 1.4).length;
  const context = { medias, pairSize: medias.length === 2 && squares === 2 ? sized([3, 3], [2, 2], [2, 2]) : null };
  const items = [heading(part.title)];
  const rest = [...part.items];
  // Вводный абзац встаёт рядом с заголовком раздела.
  if (rest[0] && rest[0].kind === 'text') items.push(textBlock(rest.shift().text));
  items.push({ break: 0 });
  let previous = '';
  for (const item of rest) {
    // Картинки и текст после них не смешиваются в одном ряду с карточками другого вида.
    const group = item.kind === 'text' ? 'text' : item.media ? 'media' : item.kind;
    if (previous && group !== previous && (group === 'text' || previous === 'text' || group === 'metric' || previous === 'metric')) items.push({ break: 0 });
    items.push(caseItem(item, context));
    previous = group;
  }
  return section(part.title, items, { id: part.id });
}
projects.forEach((project, index) => {
  const data = content[project.href];
  const [summary, ...parts] = data.sections;
  const texts = summary.items.filter(item => item.kind === 'text');
  const cta = summary.items.find(item => item.kind === 'button');
  const cover = summary.items.find(item => item.kind === 'media');
  const metrics = summary.items.filter(item => item.kind === 'metric');
  const top = [
    { html: `<h1 class="t-h1">${esc(summary.title)}</h1>`, type: 'head', size: sized([4, 1], [3, 1], [2, 1]) },
    ...(cta ? [{ ...button(cta.title, 'arrow-diagonal', cta.href), col: { d: 6, t: 4, m: 2 } }] : []),
    { break: 0 },
    ...texts.map(item => textBlock(item.text)),
    { break: 0 },
    { ...mediaBlock(cover.media, sized([4, 3], [4, 3], [2, 2])), type: 'fill cover', ratio: 0 },
    ...metrics.map(item => caseItem(item, {})),
  ];
  const next = projects[(index + 1) % projects.length];
  pages[caseFile(project.href)] = page(summary.title, '', true, [
    section('Сводка', top, { air: 0, id: 'summary' }),
    ...parts.map(caseSection),
    // Перед контактами — блок с другим проектом.
    section('Другие проекты', [heading('Другие проекты'), { break: 0 }, ...projectItems(next, 1)]),
  ]);
});

// Шахматная раскладка: по два блока в ряду, каждый следующий ряд сдвинут на
// колонку, между блоками остаётся пустая колонка. На планшете — по два без
// сдвига, на телефоне — по одному.
function checker(units, rows, gap) {
  const items = [];
  units.forEach((unit, index) => {
    const band = Math.floor(index / 2);
    if (index % 2 === 0 && index) items.push({ break: gap, only: ['t'] });
    if (index) items.push({ break: gap, only: ['m'] });
    items.push({ ...unit, pin: { d: [(band % 2 ? 2 : 1) + (index % 2) * 3, band * (rows + gap)] } });
  });
  return items;
}

// Статьи: сначала название, сразу под ним обложка той же ширины (пока
// заглушка); пары отделены друг от друга пустотой.
const articles = content['/projects/articles/'].sections[0];
pages['articles.html'] = page('Статьи', 'articles.html', true, [
  section('Статьи', [
    heading(articles.title, 'h1'),
    { break: 1 },
    ...checker(articles.items.filter(item => item.kind === 'article').map((item, index) => ({
      html: `<p class="t-small">${esc(item.number)}</p><h3 class="t-h3">${esc(item.title)}</h3><p class="t-body">${esc(item.text)}</p>`,
      type: 'text', size: sized([2, 1]), href: item.href, group: 'article-' + index,
      stack: [{ ...placeholder('Обложка ' + item.number, sized([2, 1])), href: item.href, group: 'article-' + index, attrs: ' tabindex="-1" aria-hidden="true"' }],
    })), 2, 1),
  ], { air: 0 }),
]);

// Посты: квадратные обложки в шахматном порядке.
const posts = content['/projects/posts/'].sections[0];
pages['posts.html'] = page('Посты', 'posts.html', true, [
  section('Посты', [
    heading(posts.title, 'h1'),
    { break: 1 },
    ...checker(posts.items.filter(item => item.media).map(item => ({ ...mediaBlock(item.media, sized([2, 2])), type: 'fill cover', ratio: 0, href: item.href })), 2, 0),
  ], { air: 0 }),
]);

// Playground: мозаика с воздухом. На десктопе места закреплены: крупные
// работы чередуются слева и справа, рядом с ними остаются пустые колонки.
const playground = content['/projects/playground/'].sections[0];
const works = playground.items.filter(item => item.media);
const wide = works.filter(item => item.media.ratio >= 1.4);
const tall = works.filter(item => item.media.ratio < 0.78);
const square = works.filter(item => item.media.ratio >= 0.78 && item.media.ratio < 1.4);
const mosaic = [
  [wide[0], [3, 2], [1, 0]], [tall[0], [1, 2], [5, 0]], [tall[1], [1, 2], [6, 0]],
  [square[0], [2, 2], [2, 2]], [wide[1], [3, 2], [4, 2]],
  [wide[2], [3, 2], [1, 4]], [square[1], [2, 2], [5, 4]],
  [square[2], [2, 2], [2, 6]], [square[3], [2, 2], [4, 6]],
].filter(([item]) => item);
pages['playground.html'] = page('Playground', 'playground.html', true, [
  section('Playground', [
    heading(playground.title, 'h1'),
    { break: 1 },
    ...mosaic.map(([item, size, pin]) => ({ ...mediaBlock(item.media, { ...mediaSize(item.media.ratio), d: size }), type: 'fill cover', ratio: 0, pin: { d: pin } })),
  ], { air: 0 }),
]);

for (const old of ['case.html', 'collection.html']) fs.rmSync(path.join(__dirname, old), { force: true });
for (const [file, html] of Object.entries(pages)) fs.writeFileSync(path.join(__dirname, file), html);
console.log('Собрано страниц:', Object.keys(pages).join(', '));
