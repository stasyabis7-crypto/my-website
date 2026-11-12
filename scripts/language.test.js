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
    removeAttribute(name) { delete this.attributes[name]; },
    get className() { return this.getAttribute('class') || ''; },
    set className(value) { this.setAttribute('class', value); },
    get nextSibling() { return this.parentElement?.childNodes[this.parentElement.childNodes.indexOf(this) + 1] || null; },
    querySelector(selector) {
      for (const child of this.childNodes) {
        if (child.nodeType !== 1) continue;
        if (selector.startsWith('.') ? child.className.split(' ').includes(selector.slice(1)) : child.tagName === selector.toUpperCase()) return child;
        const nested = child.querySelector(selector);
        if (nested) return nested;
      }
      return null;
    },
    insertBefore(node, reference) {
      if (node.parentElement) node.parentElement.childNodes.splice(node.parentElement.childNodes.indexOf(node), 1);
      const index = reference === null ? this.childNodes.length : this.childNodes.indexOf(reference);
      assert(index >= 0, 'Reference must belong to the insertion parent');
      this.childNodes.splice(index, 0, node);
      node.parentElement = this;
    },
    closest(selector) { return selector.split(',').some(s => { s = s.trim(); return s.startsWith('[') ? this.hasAttribute(s.slice(1, -1)) : s.toUpperCase() === this.tagName; }) ? this : this.parentElement?.closest(selector); }
  };
}
function adapt(node) {
  if (node.nodeName === '#text') return { nodeType: 3, nodeValue: node.value };
  const el = element(node.tagName || 'document', node.attrs || [], (node.childNodes || []).map(adapt));
  for (const child of el.childNodes) child.parentElement = el;
  return el;
}
function run(file, query = '', stored, denied = false, additionalMedia = {}, viewportWidth = 1280) {
  const tree = adapt(parse5.parse(fs.readFileSync(path.join(root, file), 'utf8')));
  const html = tree.childNodes.find(node => node.tagName === 'HTML');
  const callbacks = {}, values = { 'portfolio-language': stored };
  let mutation, redirect;
  const mediaQueries = [];
  const href = 'https://portfolio.test/' + file.replace(/index.html$/, '') + query;
  const context = { URL, location: { href, origin: 'https://portfolio.test', pathname: new URL(href).pathname, replace(value) { redirect = value; } },
    localStorage: { getItem(key) { if (denied) throw Error('blocked'); return values[key]; }, setItem(key, value) { if (denied) throw Error('blocked'); values[key] = value; } },
    document: { documentElement: html, addEventListener(name, callback) { callbacks[name] = callback; }, getElementById() { return null; },
      querySelector(selector) { return html.querySelector(selector); }, createElement(tag) { return element(tag); } },
    MutationObserver: function (callback) { mutation = callback; this.observe = () => {}; }, window: { matchMedia(query) {
      assert.equal(query, '(width < 1000px)');
      const listeners = [];
      const media = { matches: viewportWidth < 1000, addEventListener(name, callback) { assert.equal(name, 'change'); listeners.push(callback); } };
      mediaQueries.push({ media, listeners });
      return media;
    } } };
  vm.createContext(context);
  for (const source of ['site/languages/english-copy.js', 'site/languages/media.js']) vm.runInContext(fs.readFileSync(path.join(root, source), 'utf8'), context);
  Object.assign(context.window.siteLanguageMedia, additionalMedia);
  vm.runInContext(fs.readFileSync(process.env.LANGUAGE_TEST_SOURCE || path.join(root, 'site/language.js'), 'utf8'), context);
  return { ...context, tree, html, callbacks, mutation, redirect, resize(width) {
    for (const { media, listeners } of mediaQueries) {
      const matches = width < 1000;
      if (matches !== media.matches) { media.matches = matches; listeners.forEach(callback => callback(media)); }
    }
  } };
}
function textNodes(node, out = []) {
  if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName) || (node.nodeType === 1 && node.hasAttribute('hidden'))) return out;
  if (node.nodeType === 3) out.push(node.nodeValue);
  for (const child of node.childNodes || []) textNodes(child, out);
  return out;
}

function find(node, predicate, out = []) {
  if (predicate(node)) out.push(node);
  for (const child of node.childNodes || []) find(child, predicate, out);
  return out;
}

// Every entry path stays English, even for a returning Russian-language visitor.
for (const file of ['index.html', 'about/index.html', 'projects/ozon-crm/customer-segments/index.html']) {
  for (const query of ['', '?lang=ru', '?lang=en', '?lang=invalid']) {
    for (const stored of [undefined, 'ru', 'en']) for (const width of [375, 999, 1000, 1440]) {
      const page = run(file, query, stored, false, {}, width);
      page.callbacks.DOMContentLoaded();
      assert.equal(page.html.lang, 'en');
      assert.equal(page.window.siteLanguage.current, 'en');
      assert.equal(page.document.querySelector('.site-language'), null);
      assert.equal(find(page.tree, node => node.nodeType === 1 && node.hasAttribute('data-language-switch')).length, 0);
      assert(!textNodes(page.tree).some(value => /[А-Яа-яЁё]/.test(value)), file + ': English-only visible copy');
    }
  }
}
console.log('English-only entry points: defaults, old RU/EN links, stored preferences and mobile/desktop headers verified.');
const metricCases = [
  ['projects/ozon-crm/customer-segments/index.html', ['15%', '≈1M', '13%']],
  ['projects/avito-charity/recycle-map/index.html', ['306K', '1.5–3K', 'Up to 70']]
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

// Subscription results compare measured outcomes with their targets.
const subscriptionResults = run('projects/avito-charity/subscription/index.html');
const resultRows = find(subscriptionResults.tree, node => node.nodeType === 1 && node.className.split(' ').includes('cg-result'));
assert.equal(resultRows.length, 2);
for (const [index, expected] of [[100, 130], [50, 55]].entries()) {
  const row = resultRows[index];
  const heading = find(row, node => node.tagName === 'H3')[0];
  assert.equal(textNodes(heading).join(''), index === 0 ? 'Report views' : 'Monthly donation subscriptions');
  assert.equal(heading.className, 'text-h2');
  assert.equal(row.getAttribute('aria-labelledby'), heading.getAttribute('id'));
  const bars = find(row, node => node.nodeType === 1 && node.className.split(' ').includes('cg-bars__bar'));
  assert.deepEqual(bars.map(node => Number(node.getAttribute('style').match(/--bar-value: (\d+)/)[1])), expected);
  const chart = find(row, node => node.tagName === 'FIGURE')[0];
  assert(chart.getAttribute('aria-label').includes(index === 0 ? '30%' : '10%'));
  const scale = find(row, node => node.nodeType === 1 && node.className === 'cg-bars')[0];
  assert.equal(Number(scale.getAttribute('style').match(/--bar-max: (\d+)/)[1]), expected[1]);
}
const emphasizedResults = find(subscriptionResults.tree, node => node.tagName === 'STRONG').map(node => textNodes(node).join(''));
for (const value of ['30%', '50', '55', '10%', '64%']) assert(emphasizedResults.includes(value));
assert(textNodes(resultRows[1]).join(' ').includes('second and third payments'));

const en = run('index.html');
assert.equal(en.html.lang, 'en');
assert.equal(en.window.siteLanguage.url('/about/?preview=1#experience'), '/about/?preview=1#experience');
assert.equal(en.window.siteLanguage.url('https://medium.com/@stasyabis'), 'https://medium.com/@stasyabis');
assert.equal(en.window.siteLanguage.url('/cv.pdf?v=3'), '/cv-en.pdf?v=3');
assert.equal(en.window.siteLanguage.url('https://elsewhere.test/cv.pdf'), 'https://elsewhere.test/cv.pdf');
assert.equal(en.window.siteLanguage.media('projects/articles/covers/triz.webp'), 'projects/articles/covers/triz.webp');
assert.equal(run('index.html', '?lang=ru', 'en').html.lang, 'en');
assert.equal(en.window.siteLanguage.url('/about/?lang=ru&preview=1#experience'), '/about/?preview=1#experience');
assert.equal(run('index.html', '?lang=ru').window.siteLanguage.url('/cv.pdf?v=3'), '/cv-en.pdf?v=3');
assert.equal(run('index.html', '', 'en').html.lang, 'en');
assert.equal(run('index.html', '?lang=invalid', undefined, true).html.lang, 'en');
assert.equal(run('index.html', '?lang=en', undefined, true).html.lang, 'en');
assert.equal(run('projects/posts/index.html').redirect, '/');
assert.equal(run('projects/posts/index.html', '?lang=ru').redirect, '/');
const ru = run('index.html', '?lang=ru');
assert(!textNodes(ru.tree).join(' ').includes('Резюме PDF'));
assert(textNodes(ru.tree).join(' ').includes('CV PDF'));
const enSubtitle = find(en.tree, node => node.nodeType === 1 && (node.getAttribute('class') || '').split(' ').includes('mood-subtitle'))[0];
assert.equal(textNodes(enSubtitle).join(''), 'I believe that the design surrounding us undoubtedly reflects the quality of our lives');
assert(!textNodes(en.tree).join(' ').includes('Резюме PDF'));
assert(!textNodes(en.tree).some(value => /[А-Яа-яЁё]/.test(value)), 'Home page must translate all visible copy, including non-breaking spaces');
for (const [source, expected] of [['1 из 3', '1 of 3'], ['Оглавление проекта', 'Project contents'], ['Закрыть оглавление', 'Close contents'], ['Скопирована', 'Copied']]) assert.equal(en.window.siteLanguage.t(source), expected);
const dynamic = { nodeType: 3, nodeValue: 'Скоро появится', parentElement: element('span') };
en.mutation([{ type: 'childList', addedNodes: [dynamic] }]);
assert.equal(dynamic.nodeValue, 'Coming soon');
const about = run('about/index.html');
assert(textNodes(about.tree).join(' ').includes('Senior Product Designer'));
assert(!textNodes(about.tree).some(value => /[А-Яа-яЁё]/.test(value)), 'About page must translate all visible copy');
const enExperience = find(about.tree, node => node.nodeType === 1 && node.getAttribute('data-language-content') === 'en')[0];
assert.equal(find(about.tree, node => node.nodeType === 1 && node.getAttribute('data-language-content') === 'ru').length, 0);
assert(!enExperience.hasAttribute('hidden'));
assert.equal(enExperience.getAttribute('data-resume-source'), '/cv-en.pdf');
assert(textNodes(enExperience).join(' ').includes('Doubled one-time donations'));
const allENExperience = find(enExperience, node => node.nodeType === 3).map(node => node.nodeValue).join(' ');
assert(allENExperience.includes('company’s workers'));
assert(!allENExperience.includes('miners'));
assert.equal(find(about.tree, node => node.nodeType === 1 && (node.getAttribute('class') || '').includes('site-header__avatar')).length, 0);
assert.equal(find(about.tree, node => node.nodeType === 1 && (node.getAttribute('class') || '').includes('site-header__cta')).length, 0);
assert.equal(find(about.tree, node => node.nodeType === 1 && node.hasAttribute('data-resume-link')).length, 1);
const project = en.window.siteLanguage.project({ id: 'customer-segments', title: 'CRM для продавцов Ozon', feed: { image: '/original.webp' } });
assert.equal(project.title, 'How to work with your audience as a seller');
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
vm.runInContext(fs.readFileSync(path.join(root, 'projects/articles/articles.js'), 'utf8'), vm.createContext(en));
assert.equal(en.window.portfolioArticles.length, 17);
assert.equal(en.window.portfolioArticles.filter(article => article.language === 'en').length, 7);
assert.equal(en.window.portfolioArticles.filter(article => article.language === 'ru').length, 10);
assert.equal(new Set(en.window.portfolioArticles.map(a => a.href)).size, 17);
const expected = ['57f6efab408a', 'c1a7bd1cd186', 'b1f4b625d1e7', 'ec37f61fa428', '58666230c9a7', 'e71d9671744f', 'b9b21faa723b'];
for (const id of expected) assert(en.window.portfolioArticles.some(a => a.href.endsWith(id)));
// Preserve the former Russian-only publications alongside preferred English editions.
const russianIDs = ['1828292', '1237967', '1306587', '1169783', '1168304', '635298', '855954', '1212420', '1194004', '841766'];
for (const id of russianIDs) assert(en.window.portfolioArticles.some(article => article.language === 'ru' && article.href.includes(id)));
const articleList = { innerHTML: '' };
vm.runInNewContext(fs.readFileSync(path.join(root, 'components/article-catalog/article-catalog.js'), 'utf8'), {
  window: en.window, document: { querySelector() { return articleList; } }
});
const renderedArticles = adapt(parse5.parseFragment(articleList.innerHTML));
const articleLinks = find(renderedArticles, node => node.tagName === 'A');
const languageBadges = find(renderedArticles, node => node.nodeType === 1 && (node.className || '').includes('article-tile__language'));
assert.equal(articleLinks.length, 17);
assert.equal(languageBadges.length, 17);
for (const [index, article] of en.window.portfolioArticles.entries()) {
  assert.equal(articleLinks[index].getAttribute('href'), article.href);
  assert.equal(articleLinks[index].getAttribute('hreflang'), article.language);
  assert.equal(textNodes(languageBadges[index]).join(''), article.language.toUpperCase());
  assert(!languageBadges[index].className.split(' ').includes('btn'));
  const cover = fs.readFileSync(path.join(root, article.image), 'utf8');
  assert(article.image.endsWith('-diagram.svg'));
  assert(!article.video);
  assert.deepEqual([...cover.matchAll(/stroke="([^"]+)"/g)].map(match => match[1]), ['#000000']);
}
const staticArticles = run('projects/articles/index.html');
const staticArticleLinks = find(staticArticles.tree, node => node.tagName === 'A' && node.hasAttribute('hreflang'));
assert.deepEqual(staticArticleLinks.map(node => node.getAttribute('href')), Array.from(en.window.portfolioArticles, article => article.href));
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
console.log('English-only site: legacy links, unavailable storage, dynamic content, all public page text and metadata, six metrics, two result comparisons, animated number formats, media fallbacks and 17 articles, preferred English editions and language badges verified.');
