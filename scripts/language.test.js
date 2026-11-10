const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const parse5 = require('parse5');
const { variantPaths, prepareLanguageAssets } = require('./prepare-language-assets');
const root = path.resolve(__dirname, '..');
function element(tag, attrs = [], children = []) {
  return {
    nodeType: 1, tagName: tag.toUpperCase(), attributes: Object.fromEntries(attrs.map(a => [a.name, a.value])), childNodes: children,
    hasAttribute(name) { return Object.hasOwn(this.attributes, name); },
    getAttribute(name) { return this.attributes[name] ?? null; },
    setAttribute(name, value) { this.attributes[name] = value; },
    closest(selector) { return selector.split(',').some(s => s.trim().toUpperCase() === this.tagName) ? this : this.parentElement?.closest(selector); }
  };
}
function adapt(node) {
  if (node.nodeName === '#text') return { nodeType: 3, nodeValue: node.value };
  const el = element(node.tagName || 'document', node.attrs || [], (node.childNodes || []).map(adapt));
  for (const child of el.childNodes) child.parentElement = el;
  return el;
}
function run(file, query = '?lang=en', stored, denied = false, additionalMedia = {}) {
  const tree = adapt(parse5.parse(fs.readFileSync(path.join(root, file), 'utf8')));
  const html = tree.childNodes.find(node => node.tagName === 'HTML');
  const callbacks = {}, values = { 'portfolio-language': stored };
  let mutation, redirect;
  const href = 'https://portfolio.test/' + file.replace(/index.html$/, '') + query;
  const context = { URL, location: { href, origin: 'https://portfolio.test', pathname: new URL(href).pathname, replace(value) { redirect = value; } },
    localStorage: { getItem(key) { if (denied) throw Error('blocked'); return values[key]; }, setItem(key, value) { if (denied) throw Error('blocked'); values[key] = value; } },
    document: { documentElement: html, addEventListener(name, callback) { callbacks[name] = callback; }, getElementById() { return null; } },
    MutationObserver: function (callback) { mutation = callback; this.observe = () => {}; }, window: {} };
  vm.createContext(context);
  for (const source of ['site/languages/english-copy.js', 'site/languages/media.js']) vm.runInContext(fs.readFileSync(path.join(root, source), 'utf8'), context);
  Object.assign(context.window.siteLanguageMedia, additionalMedia);
  vm.runInContext(fs.readFileSync(process.env.LANGUAGE_TEST_SOURCE || path.join(root, 'site/language.js'), 'utf8'), context);
  return { ...context, tree, html, callbacks, mutation, redirect };
}
function textNodes(node, out = []) {
  if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName)) return out;
  if (node.nodeType === 3) out.push(node.nodeValue);
  for (const child of node.childNodes || []) textNodes(child, out);
  return out;
}

function find(node, predicate, out = []) {
  if (predicate(node)) out.push(node);
  for (const child of node.childNodes || []) find(child, predicate, out);
  return out;
}
const metricCases = [
  ['projects/ozon-crm/customer-segments/index.html', ['15%', '≈1M', '13%']],
  ['projects/avito-charity/recycle-map/index.html', ['306K', '1.5–3K', 'Up to 70']],
  ['projects/avito-charity/subscription/index.html', ['≈55', '+64%', '≈1,300']]
];
for (const [file, expectedValues] of metricCases) {
  const page = run(file);
  const cards = find(page.tree, node => node.nodeType === 1 && (node.getAttribute('class') || '').split(' ').includes('cg-item--stat'));
  assert.equal(cards.length, 3, file);
  cards.forEach((card, index) => {
    const texts = textNodes(card).map(text => text.trim()).filter(Boolean);
    assert.equal(texts[0], expectedValues[index], file + ': translated metric value');
    assert(!texts.some(text => /[А-Яа-яЁё]/.test(text)), file + ': metric labels must be English: ' + texts.join(' / '));
  });
  // Typography and later rendering may use a different kind of space.
  assert.equal(page.window.siteLanguage.t('≈1\u202fмлн'), '≈1M');
  assert.equal(page.window.siteLanguage.t('Продавцов используют CRM ежемесячно, в 1,5 раза выше цели'), 'Sellers use CRM monthly, 1.5\u00a0times the target');
}

const en = run('index.html');
assert.equal(en.html.lang, 'en');
assert.equal(en.window.siteLanguage.url('/about/?preview=1#experience'), '/about/?preview=1&lang=en#experience');
assert.equal(en.window.siteLanguage.url('https://medium.com/@stasyabis'), 'https://medium.com/@stasyabis');
assert.equal(en.window.siteLanguage.url('/cv.pdf?v=3'), '/cv-en.pdf?v=3');
assert.equal(en.window.siteLanguage.url('https://elsewhere.test/cv.pdf'), 'https://elsewhere.test/cv.pdf');
assert.equal(en.window.siteLanguage.media('projects/articles/covers/triz.webp'), 'projects/articles/covers/triz.webp');
assert.equal(run('index.html', '?lang=ru', 'en').html.lang, 'ru');
assert.equal(run('index.html', '?lang=ru').window.siteLanguage.url('/cv.pdf?v=3'), '/cv.pdf?v=3');
assert.equal(run('index.html', '', 'en').html.lang, 'en');
assert.equal(run('index.html', '?lang=invalid', undefined, true).html.lang, 'ru');
assert.equal(run('index.html', '?lang=en', undefined, true).html.lang, 'en');
assert.equal(run('projects/posts/index.html').redirect, '/?lang=en');
assert.equal(run('projects/posts/index.html', '?lang=ru').redirect, undefined);
const ru = run('index.html', '?lang=ru');
assert(textNodes(ru.tree).join(' ').includes('Резюме PDF'));
const enSubtitle = find(en.tree, node => node.nodeType === 1 && (node.getAttribute('class') || '').split(' ').includes('mood-subtitle'))[0];
assert.equal(textNodes(enSubtitle).join(''), 'I believe that the design surrounding us undoubtedly reflects the quality of our lives');
assert(!textNodes(en.tree).join(' ').includes('Резюме PDF'));
assert(!textNodes(en.tree).some(value => /[А-Яа-яЁё]/.test(value)), 'Home page must translate all visible copy, including non-breaking spaces');
for (const [source, expected] of [['1 из 3', '1 of 3'], ['Оглавление проекта', 'Project contents'], ['Закрыть оглавление', 'Close contents'], ['Почта скопирована', 'Email copied']]) assert.equal(en.window.siteLanguage.t(source), expected);
const dynamic = { nodeType: 3, nodeValue: 'Скоро появится', parentElement: element('span') };
en.mutation([{ type: 'childList', addedNodes: [dynamic] }]);
assert.equal(dynamic.nodeValue, 'Coming soon');
const about = run('about/index.html');
assert(textNodes(about.tree).join(' ').includes('Senior Product Designer'));
assert(!textNodes(about.tree).some(value => /[А-Яа-яЁё]/.test(value)), 'About page must translate all visible copy');
const project = en.window.siteLanguage.project({ id: 'customer-segments', title: 'CRM для продавцов Ozon', feed: { image: '/original.webp' } });
assert.equal(project.title, 'CRM for Ozon sellers');
assert.equal(project.feed.image, '/original.webp');
const slots = prepareLanguageAssets({ check: true });
assert(slots.some(slot => slot.pages.includes('pages/home/data/projects.js')));
assert(slots.some(slot => slot.pages.includes('projects/ozon-crm/customer-segments/index.html')));
for (const slot of slots) for (const language of ['ru', 'en']) assert(fs.existsSync(path.join(root, slot.active[language])), slot.active[language]);
const source = slots.find(slot => slot.source.endsWith('.webp')).source;
const imageVariant = source.replace('.webp', '-en.webp');
const localized = run('index.html', '?lang=en', undefined, false, { [source]: { ru: source, en: imageVariant } });
assert.equal(localized.window.siteLanguage.media(source), imageVariant);
assert.equal(localized.window.siteLanguage.media('/unknown.webp'), '/unknown.webp');
const pair = localized.window.siteLanguage.mediaPair({ image: source, video: '/clip.mp4' });
assert.equal(pair.image, imageVariant);
assert.equal(pair.video, undefined, 'A translated still must suppress a video in the previous language');
const movie = run('index.html', '?lang=en', undefined, false, { [source]: { ru: source, en: imageVariant }, '/clip.mp4': { ru: '/clip.mp4', en: '/clip-en.mp4' } });
assert.equal(movie.window.siteLanguage.mediaPair({ image: source, video: '/clip.mp4' }).video, '/clip-en.mp4');
assert.deepEqual(variantPaths('/projects/case/covers/cover.webp', 'en'), ['/projects/case/covers/cover-en.webp']);
assert.deepEqual(variantPaths('/projects/case/media/movie.mp4', 'ru'), ['/projects/case/media/movie-ru.mp4']);
vm.runInContext(fs.readFileSync(path.join(root, 'projects/articles/articles-en.js'), 'utf8'), vm.createContext(en));
assert.equal(en.window.portfolioEnglishArticles.length, 7);
assert.equal(new Set(en.window.portfolioEnglishArticles.map(a => a.href)).size, 7);
const expected = ['57f6efab408a', 'c1a7bd1cd186', 'b1f4b625d1e7', 'ec37f61fa428', '58666230c9a7', 'e71d9671744f', 'b9b21faa723b'];
for (const id of expected) assert(en.window.portfolioEnglishArticles.some(a => a.href.endsWith(id)));
// Audit every translated public page, including metadata and accessible names.
for (const pathname of Object.keys(en.window.siteEnglish.pages)) {
  if (pathname === '/projects/posts/') continue;
  const file = pathname.slice(1) + 'index.html';
  if (!fs.existsSync(path.join(root, file))) continue;
  const translated = run(file);
  for (const text of textNodes(translated.tree)) assert(!/[А-Яа-яЁё]/.test(text), file + ': untranslated text: ' + text.trim());
  for (const node of find(translated.tree, node => node.nodeType === 1)) {
    if (node.tagName === 'A' && /cv(?:-en)?\.pdf/.test(node.getAttribute('href') || '')) assert(node.getAttribute('href').startsWith('/cv-en.pdf'), file + ': English resume');
    for (const name of ['alt', 'aria-label', 'aria-description', 'aria-roledescription', 'aria-valuetext', 'title', 'placeholder']) {
      const value = node.getAttribute(name);
      if (value) assert(!/[А-Яа-яЁё]/.test(value), file + ': untranslated ' + name + ': ' + value);
    }
    if (node.tagName === 'META') assert(!/[А-Яа-яЁё]/.test(node.getAttribute('content') || ''), file + ': untranslated metadata');
  }
}
// Exercise the real animated metric module with deterministic animation frames.
for (const lang of ['ru', 'en']) {
  const frames = [], snapshots = [];
  const value = { _text: lang === 'en' ? '≈1,300 / 1.5–3K' : '≈1 300 / 1,5–3K', get textContent() { return this._text; }, set textContent(value) { this._text = value; snapshots.push(value); } };
  let observe;
  const matchMedia = () => ({ matches: false });
  const context = { document: { documentElement: { lang }, querySelectorAll(selector) { return selector === '.case-metric__value' ? [value] : []; } }, matchMedia,
    window: { matchMedia, IntersectionObserver: true },
    IntersectionObserver: class { constructor(callback) { observe = callback; } observe() {} unobserve() {} },
    requestAnimationFrame(callback) { frames.push(callback); } };
  const moduleSource = fs.readFileSync(path.join(root, 'components/case-blocks/case-blocks.js'), 'utf8');
  vm.runInNewContext(moduleSource.slice(0, moduleSource.indexOf('/*\n  Карусель')), context);
  observe([{ isIntersecting: true, target: value }]);
  for (const time of [0, 600, 1200]) frames.shift()(time);
  assert.equal(value.textContent, lang === 'en' ? '≈1,300 / 1.5–3K' : '≈1 300 / 1,5–3K');
  assert(snapshots[1].includes(lang === 'en' ? '1,138 / 1.3–3K' : '1 138 / 1,3–3K'), snapshots[1]);
}
const menu = fs.readFileSync(path.join(root, 'components/site-chrome/site-chrome.js'), 'utf8');
assert(menu.includes("item.href !== '/projects/posts/'"));
console.log('Languages: RU/EN copy, routing, persistence, unavailable storage, dynamic content, all public page text and metadata, nine metrics, animated number formats, media fallbacks and seven English articles verified.');
