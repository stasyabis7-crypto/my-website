// Собирает страницы стенда из компактного описания блоков.
// Блок: [подпись, тип, десктоп [c,r,w,h], планшет [c,w,h] | 0, телефон [c,w,h] | 0, ссылка]
// На планшете и телефоне блоки идут по порядку, ряд подбирается сам.
const fs = require('fs');
const path = require('path');

const block = ([label, type, d, t, m, href]) => {
  const vars = [`--c:${d[0]}`, `--r:${d[1]}`, `--w:${d[2]}`, `--h:${d[3]}`];
  const cls = ['b'];
  if (type) type.split(' ').forEach(name => cls.push('b--' + name));
  if (t) vars.push(`--tc:${t[0]}`, `--tw:${t[1]}`, `--th:${t[2]}`); else cls.push('t-off');
  const mm = m === undefined ? t : m;
  if (mm) vars.push(`--mc:${mm[0]}`, `--mw:${mm[1]}`, `--mh:${mm[2]}`); else cls.push('m-off');
  const tag = href ? 'a' : 'div';
  return `      <${tag} class="${cls.join(' ')}"${href ? ` href="${href}"` : ''} style="${vars.join(';')}">${label}</${tag}>`;
};
const grid = ({ name, air = 0, header, hero, blocks }) => {
  const cells = `<div class="grid${header ? ' grid--header' : ''}${hero ? ' hero__cells' : ''}"${air ? ` style="--air:${air}"` : ''}>\n${blocks.map(block).join('\n')}\n    </div>`;
  if (header) return `    <!-- ${name} -->\n    <header class="site-top" aria-label="${name}">${cells}</header>`;
  if (hero) return `    <!-- ${name} -->\n    <section class="hero" aria-label="${name}">\n${hero}\n    ${cells}\n    </section>`;
  return `    <!-- ${name} -->\n    <section aria-label="${name}">${cells}</section>`;
};
const page = (title, sections) => `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>Сетка — ${title}</title>
<link rel="stylesheet" href="../../../styles/fonts.css" />
<link rel="stylesheet" href="../../../styles/typography.css" />
<link rel="stylesheet" href="../../../components/icons/icons.css" />
<link rel="stylesheet" href="grid.css" />
</head>
<body>
  <div class="page">
    <div class="lines" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
${sections.map(grid).join('\n\n')}
  </div>
</body>
</html>
`;

const icon = name => `<span class="icon icon--${name}" aria-hidden="true"></span>`;
const header = back => ({ name: 'Шапка', header: true, blocks: [
  [(back ? icon('arrow-left') : '<img class="top-avatar" src="../../../components/site-brand/avatar-portrait-v2.webp" alt="" />') +
    '<span class="top-logo" role="img" aria-label="Анастасия Вихарева"></span>', 'row', [1, 1, 1, 1], [1, 2, 1], [1, 1, 1], 'index.html'],
  ['<span>Резюме PDF</span>' + icon('cv'), 'btn row', [2, 1, 1, 1], 0, 0, '/cv.pdf'],
  ['Статьи', 'row', [3, 1, 1, 1], 0, 0, 'collection.html'],
  ['Посты', 'row', [4, 1, 1, 1], 0, 0, 'collection.html'],
  ['Playground', 'row', [5, 1, 1, 1], 0, 0, 'playground.html'],
  ['<span>Связаться</span>' + icon('contacts'), 'row', [6, 1, 1, 1], [3, 1, 1], 0, '#contacts'],
  ['<span>Меню</span>' + icon('hamburger'), 'row menu', [1, 1, 1, 1], [4, 1, 1], [2, 1, 1]],
] });
const fixHeader = html => html;

const contactLink = (label, name, href, d, t, m) =>
  [`<span>${label}</span>${icon('social-' + name)}`, 'link', d, t, m, href];
const contacts = { name: 'Контакты', air: 1, blocks: [
  ['<h2 class="t-h2" id="contacts">Связаться</h2>', 'head', [1, 1, 2, 1], [1, 2, 1], [1, 2, 1]],
  contactLink('Telegram', 'telegram', 'https://t.me/stasyabis', [1, 2, 1, 1], [1, 1, 1], [1, 1, 1]),
  contactLink('Почта', 'email', 'mailto:stasyabis7@gmail.com', [2, 2, 1, 1], [2, 1, 1], [2, 1, 1]),
  contactLink('Dribbble', 'dribbble', 'https://dribbble.com/Stasyabis', [3, 2, 1, 1], [3, 1, 1], [1, 1, 1]),
  contactLink('Figma community', 'figma', 'https://www.figma.com/@stasyabis', [4, 2, 1, 1], [4, 1, 1], [2, 1, 1]),
  contactLink('Medium', 'medium', 'https://medium.com/@stasyabis', [5, 2, 1, 1], [1, 1, 1], [1, 1, 1]),
  contactLink('Habr', 'habr', 'https://habr.com/ru/users/stasyabis/', [6, 2, 1, 1], [2, 1, 1], [2, 1, 1]),
] };

// Данные проектов — те же, что у ленты Главной.
const vm = require('vm');
const data = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../../pages/home/data/projects.js'), 'utf8'), data);
const tagLabel = Object.fromEntries(data.window.portfolioTags.map(tag => [tag.id, tag.label]));
const realProject = (p, c, r, tc) => [
  [`<video src="${p.video}" poster="${p.image}" muted loop playsinline autoplay preload="metadata" aria-label="${p.alt}"></video>`,
    'fill', [c, r, 3, 2], [tc, 3, 2], [1, 2, 2], p.href],
  [`<h3 class="t-h3">${p.title}</h3><p class="t-body">${p.description}</p><p class="t-tags">${p.tags.map(id => tagLabel[id]).join(' · ')}</p>`,
    'text', [c, r + 2, 2, 1], [tc, 2, 1], [1, 2, 1]],
  ['<span>Открыть кейс</span>' + icon('arrow-diagonal'), 'btn', [c + 2, r + 2, 1, 1], [tc + 2, 1, 1], [2, 1, 1], p.href],
];
const heroMedia = `      <video class="hero__video" muted loop playsinline autoplay
        poster="/components/hero-mood/media/hero-desktop.webp" src="/components/hero-mood/media/hero-desktop-v2.mp4"
        data-portrait-poster="/components/hero-mood/media/hero-mobile.webp" data-portrait-src="/components/hero-mood/media/hero-mobile-v2.mp4"></video>
      <script>
        (function () {
          var v = document.currentScript.previousElementSibling;
          if (matchMedia('(max-aspect-ratio: 4/5)').matches) { v.poster = v.dataset.portraitPoster; v.src = v.dataset.portraitSrc; }
        })();
      </script>`;

// Проект в ленте: обложка, текст (название, описание, теги) и кнопка.
const project = (n, c, r, tc) => [
  [`Обложка проекта ${n}`, 'media', [c, r, 3, 2], [tc, 3, 2], [1, 2, 2], 'case.html'],
  [`Название, описание и теги проекта ${n}`, '', [c, r + 2, 2, 1], [tc, 2, 1], [1, 2, 1]],
  ['Открыть кейс ↗', 'btn', [c + 2, r + 2, 1, 1], [tc + 2, 1, 1], [2, 1, 1], 'case.html'],
];

const pages = {
  'index.html': ['Главная', [
    header(false),
    // Баннер — видео на весь экран; на нём три квадрата-блока у нижнего края.
    { name: 'Баннер', hero: heroMedia, blocks: [
      ['<h1 class="t-title">Анастасия Вихарева</h1>', 'title', [4, 1, 3, 1], [1, 3, 1], [1, 2, 1]],
      ['<p class="t-body">Senior Product Designer в Авито, раньше Ozon. 6&nbsp;лет проектирую продуктовые сценарии: платежи, CRM, дашборды.</p>', 'text', [4, 2, 2, 1], [1, 3, 1], [1, 1, 1]],
      ['<span>Смотреть работы</span>' + icon('down'), 'btn', [6, 2, 1, 1], [4, 1, 1], [2, 1, 1], '#works'],
    ] },
    { name: 'Проекты', air: 1, blocks: [...realProject(data.window.portfolioProjects[0], 1, 1, 1), ...realProject(data.window.portfolioProjects[1], 4, 2, 2), ...realProject(data.window.portfolioProjects[2], 1, 5, 1)] },
    contacts,
  ]],
  'case.html': ['Кейс', [
    header(true),
    { name: 'Сводка кейса', blocks: [
      ['Заголовок кейса', '', [1, 1, 4, 1], [1, 4, 1], [1, 2, 1]],
      ['Открыть на проде ↗', 'btn', [6, 1, 1, 1], [4, 1, 1], [2, 1, 1]],
      ['Проблема и решение', '', [1, 2, 3, 1], [1, 3, 1], [1, 2, 1]],
      ['Содержание', '', [5, 2, 2, 1], 0],
      ['Обложка кейса', 'media', [1, 3, 4, 3], [1, 4, 3], [1, 2, 2]],
      ['Метрика 1', '', [5, 3, 2, 1], [1, 2, 1], [1, 2, 1]],
      ['Метрика 2', '', [5, 4, 2, 1], [3, 2, 1], [1, 2, 1]],
      ['Метрика 3', '', [5, 5, 2, 1], [1, 2, 1], [1, 2, 1]],
    ] },
    { name: 'О проекте', air: 1, blocks: [
      ['О проекте — заголовок', '', [1, 1, 2, 1], [1, 2, 1], [1, 2, 1]],
      ['Картинка с подписью', 'media', [1, 2, 3, 3], [1, 3, 3], [1, 2, 2]],
      ['Карточка: как было', '', [5, 2, 2, 1], [3, 2, 1], [1, 2, 1]],
      ['Карточка: задача', '', [5, 3, 2, 1], [3, 2, 1], [1, 2, 1]],
      ['Карточка: ограничения', '', [5, 4, 2, 1], [3, 2, 1], [1, 2, 1]],
    ] },
    { name: 'Команда', air: 1, blocks: [
      ['Команда — заголовок', '', [1, 1, 1, 1], [1, 2, 1], [1, 2, 1]],
      ['Роль 1', '', [2, 1, 1, 1], [3, 1, 1], [1, 1, 1]],
      ['Роль 2', '', [3, 1, 1, 1], [4, 1, 1], [2, 1, 1]],
      ['Роль 3', '', [4, 1, 1, 1], [2, 1, 1], [1, 1, 1]],
      ['Роль 4', '', [5, 1, 1, 1], [3, 1, 1], [2, 1, 1]],
      ['Роль 5', '', [6, 1, 1, 1], [4, 1, 1], [1, 1, 1]],
    ] },
    { name: 'Роль', air: 1, blocks: [
      ['Роль — заголовок', '', [5, 1, 2, 1], [3, 2, 1], [1, 2, 1]],
      ['Карточка: что делала 1', '', [1, 2, 2, 1], [1, 2, 1], [1, 2, 1]],
      ['Картинка с подписью', 'media', [4, 2, 3, 3], [2, 3, 3], [1, 2, 2]],
      ['Карточка: что делала 2', '', [1, 3, 2, 1], [1, 2, 1], [1, 2, 1]],
      ['Карточка: что делала 3', '', [1, 4, 2, 1], [1, 2, 1], [1, 2, 1]],
    ] },
    { name: 'Сценарий', air: 1, blocks: [
      ['Сценарий — заголовок', '', [1, 1, 2, 1], [1, 2, 1], [1, 2, 1]],
      ['Шаг 1', '', [3, 1, 1, 1], [1, 1, 1], [1, 1, 1]],
      ['Шаг 2', '', [4, 1, 1, 1], [2, 1, 1], [2, 1, 1]],
      ['Шаг 3', '', [5, 1, 1, 1], [3, 1, 1], [1, 1, 1]],
      ['Шаг 4', '', [6, 1, 1, 1], [4, 1, 1], [2, 1, 1]],
    ] },
    { name: 'Проблемы', air: 1, blocks: [
      ['Проблемы — заголовок', '', [1, 1, 2, 1], [1, 2, 1], [1, 2, 1]],
      ['Проблема 1', '', [1, 2, 2, 1], [1, 2, 1], [1, 2, 1]],
      ['Проблема 2', '', [3, 2, 2, 1], [3, 2, 1], [1, 2, 1]],
      ['Проблема 3', '', [5, 2, 2, 1], [1, 2, 1], [1, 2, 1]],
    ] },
    { name: 'Решение: сравнение', air: 1, blocks: [
      ['Раздел решения — заголовок и текст', '', [1, 1, 3, 1], [1, 3, 1], [1, 2, 1]],
      ['Было', 'media', [1, 2, 3, 2], [1, 2, 2], [1, 2, 2]],
      ['Стало', 'media', [4, 2, 3, 2], [3, 2, 2], [1, 2, 2]],
    ] },
    { name: 'Решение: большой экран', air: 1, blocks: [
      ['Раздел решения — заголовок и текст', '', [5, 1, 2, 2], [1, 3, 1], [1, 2, 1]],
      ['Большой экран или видео', 'media', [1, 1, 4, 3], [1, 4, 3], [1, 2, 2]],
    ] },
    { name: 'Итог', air: 1, blocks: [
      ['Итог — заголовок', '', [1, 1, 2, 1], [1, 2, 1], [1, 2, 1]],
      ['Результат 1', '', [3, 1, 2, 1], [3, 2, 1], [1, 2, 1]],
      ['Результат 2', '', [5, 1, 2, 1], [1, 2, 1], [1, 2, 1]],
      ['Что проверяю дальше', '', [3, 2, 4, 1], [1, 4, 1], [1, 2, 1]],
    ] },
    { name: 'Следующий проект', air: 1, blocks: project('— следующий', 4, 1, 2) },
    contacts,
  ]],
  'collection.html': ['Статьи и посты', [
    header(true),
    { name: 'Заголовок раздела', blocks: [
      ['Заголовок раздела — «Статьи» / «Посты в Telegram»', '', [1, 1, 3, 1], [1, 3, 1], [1, 2, 1]],
    ] },
    { name: 'Список', air: 1, blocks: [
      ['Статья 1 — обложка и название', 'media', [1, 1, 2, 2], [1, 2, 2], [1, 2, 2], '#'],
      ['Статья 2', 'media', [4, 1, 2, 2], [3, 2, 2], [1, 2, 2], '#'],
      ['Статья 3', 'media', [2, 3, 2, 2], [1, 2, 2], [1, 2, 2], '#'],
      ['Статья 4', 'media', [5, 3, 2, 2], [3, 2, 2], [1, 2, 2], '#'],
      ['Статья 5', 'media', [1, 5, 2, 2], [1, 2, 2], [1, 2, 2], '#'],
      ['Статья 6', 'media', [4, 5, 2, 2], [3, 2, 2], [1, 2, 2], '#'],
      ['Статья 7', 'media', [2, 7, 2, 2], [1, 2, 2], [1, 2, 2], '#'],
      ['Статья 8', 'media', [5, 7, 2, 2], [3, 2, 2], [1, 2, 2], '#'],
    ] },
    contacts,
  ]],
  'playground.html': ['Playground', [
    header(true),
    { name: 'Заголовок раздела', blocks: [
      ['Заголовок раздела — «Playground»', '', [1, 1, 3, 1], [1, 3, 1], [1, 2, 1]],
    ] },
    { name: 'Мозаика', air: 1, blocks: [
      ['Работа 1', 'media', [1, 1, 3, 3], [1, 3, 3], [1, 2, 2]],
      ['Работа 2', 'media', [5, 1, 2, 2], [3, 2, 2], [1, 2, 2]],
      ['Работа 3', 'media', [4, 3, 1, 1], [1, 1, 1], [1, 1, 1]],
      ['Работа 4', 'media', [5, 4, 2, 2], [2, 2, 2], [1, 2, 2]],
      ['Работа 5', 'media', [1, 5, 2, 2], [1, 2, 2], [1, 2, 2]],
      ['Работа 6', 'media', [3, 5, 1, 1], [4, 1, 1], [2, 1, 1]],
      ['Работа 7', 'media', [3, 6, 3, 2], [1, 3, 2], [1, 2, 1]],
      ['Работа 8', 'media', [6, 7, 1, 1], [4, 1, 1], [1, 1, 1]],
    ] },
    contacts,
  ]],
};
for (const [file, [title, sections]] of Object.entries(pages)) {
  fs.writeFileSync(path.join(__dirname, file), fixHeader(page(title, sections)));
}
console.log('Собрано страниц:', Object.keys(pages).length);
