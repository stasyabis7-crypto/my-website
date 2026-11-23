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
    get textContent() { return this.childNodes.map(node => node.nodeType === 3 ? node.nodeValue : node.textContent).join(''); },
    set textContent(value) { this.childNodes = [{ nodeType: 3, nodeValue: value, parentElement: this }]; },
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
  let mutation, redirect, assigned;
  const mediaQueries = [];
  const href = 'https://portfolio.test/' + file.replace(/index.html$/, '') + query;
  const context = { URL, location: { href, origin: 'https://portfolio.test', pathname: new URL(href).pathname, replace(value) { redirect = value; }, assign(value) { assigned = value; } },
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
  for (const source of ['site/languages/english-copy.js', 'site/languages/editorial-copy.js', 'site/languages/russian-copy.js', 'site/languages/media.js']) vm.runInContext(fs.readFileSync(path.join(root, source), 'utf8'), context);
  Object.assign(context.window.siteLanguageMedia, additionalMedia);
  vm.runInContext(fs.readFileSync(process.env.LANGUAGE_TEST_SOURCE || path.join(root, 'site/language.js'), 'utf8'), context);
  return { ...context, tree, html, callbacks, mutation, redirect, values, assigned: () => assigned, resize(width) {
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

const hasClass = (node, name) => node.nodeType === 1 && node.className.split(' ').includes(name);
const publicFiles = ['index.html', 'about/index.html', 'projects/articles/index.html', 'projects/playground/index.html',
  'projects/ozon-crm/customer-segments/index.html', 'projects/avito-charity/subscription/index.html'];
for (const file of publicFiles) {
  for (const query of ['', '?lang=ru', '?lang=en', '?lang=invalid']) {
    for (const stored of [undefined, 'ru', 'en']) for (const denied of [false, true]) {
      const page = run(file, query, stored, denied);
      page.callbacks.DOMContentLoaded();
      const expected = query === '?lang=ru' ? 'ru' : query === '?lang=en' ? 'en' : !denied && stored === 'ru' ? 'ru' : 'en';
      assert.equal(page.html.lang, expected);
      assert.equal(page.window.siteLanguage.current, expected);
      if (expected === 'en') assert(!textNodes(page.tree).some(value => /[А-Яа-яЁё]/.test(value)), file + ': untranslated English text');
      const refs = find(page.tree, node => node.nodeType === 1 && node.hasAttribute('data-copy'));
      for (const node of refs) assert.equal(node.textContent, page.window.siteEditorialCopy[node.getAttribute('data-copy')][expected]);
    }
  }
}
const en = run('index.html'), ru = run('index.html', '?lang=ru');
const { keepWordsTogether } = require('../site/typography-rules');
const range = '1,5–3K';
assert.equal(en.window.siteLanguage.t(keepWordsTogether(range)), '1.5–3K', 'Typography joiners must not prevent translation');
assert.equal(ru.window.siteLanguage.t(keepWordsTogether('1.5–3K')), range, 'Typography joiners must not prevent reverse translation');
for (const page of [en, ru]) {
  const service = page.window.siteLanguage, language = service.current;
  assert.equal(service.url('/about/?preview=1#experience'), '/about/?preview=1&lang=' + language + '#experience');
  assert.equal(service.url('/about/?lang=ru&preview=1#experience'), '/about/?lang=' + language + '&preview=1#experience');
  assert.equal(service.url('https://elsewhere.test/cv.pdf'), 'https://elsewhere.test/cv.pdf');
  assert.equal(service.url('/cv.pdf?v=3'), service.resume);
  assert.equal(service.url('/cv-en.pdf'), service.resume);
  assert(service.resume.includes(language === 'en' ? '1Lmhy9PlbZQAygC_Ir1HPg22xBI6kVRN5' : '17iRYE0E_2xrNNLsrmFPtzYo2qP7KWtps'));
  assert.equal(service.t('1 из 4'), language === 'en' ? '1 of 4' : '1 из 4');
  assert.equal(service.t('CV PDF'), language === 'en' ? 'CV PDF' : 'Резюме PDF');
  assert.equal(run('projects/posts/index.html', '?lang=' + language).redirect, '/?lang=' + language);
}
const switching = run('projects/ozon-crm/customer-segments/index.html', '?lang=en&preview=1#dashboard', undefined, true);
switching.window.siteLanguage.switchTo('ru');
assert.equal(switching.assigned(), '/projects/ozon-crm/customer-segments/?lang=ru&preview=1#dashboard');
const homeTitle = page => find(page.tree, node => hasClass(node, 'mood-title'))[0].textContent;
assert.equal(homeTitle(en), en.window.siteEditorialCopy['main page:4'].en);
assert.equal(homeTitle(ru), ru.window.siteEditorialCopy['main page:4'].ru);
for (const page of [en, ru]) {
  const subtitle = find(page.tree, node => hasClass(node, 'mood-subtitle'))[0];
  assert.equal(subtitle.textContent.replace(/\s+/g, ' ').trim(), page.window.siteEditorialCopy['main page:5'][page.html.lang]);
}
// Dynamically inserted controls are translated without changing literal language labels.
const dynamic = { nodeType: 3, nodeValue: 'Скоро появится', parentElement: element('span') };
en.mutation([{ type: 'childList', addedNodes: [dynamic] }]);
assert.equal(dynamic.nodeValue, 'Coming soon');
const literal = element('button', [{ name: 'data-language-literal', value: '' }]);
const label = { nodeType: 3, nodeValue: 'EN', parentElement: literal };
ru.mutation([{ type: 'childList', addedNodes: [label] }]);
assert.equal(label.nodeValue, 'EN');
// The chosen UI language must never select a Russian image, poster or video.
const slots = prepareLanguageAssets({ check: true });
for (const slot of slots) for (const language of ['ru', 'en']) assert(fs.existsSync(path.join(root, slot.active[language])), slot.active[language]);
for (const file of publicFiles) {
  const media = language => find(run(file, '?lang=' + language).tree, node => ['IMG', 'VIDEO', 'SOURCE'].includes(node.tagName))
    .map(node => ['src', 'poster', 'data-src', 'srcset'].map(key => node.getAttribute(key)));
  assert.deepEqual(media('ru'), media('en'), file + ': media must remain English in both languages');
}
for (const language of ['ru', 'en']) {
  const localized = run('index.html', '?lang=' + language, undefined, false, {
    '/image.webp': { ru: '/image-ru.webp', en: '/image-en.webp' },
    '/clip.mp4': { ru: '/clip-ru.mp4', en: '/clip-en.mp4' }
  });
  assert.equal(localized.window.siteLanguage.media('/image.webp'), '/image-en.webp');
  assert.equal(localized.window.siteLanguage.mediaPair({ image: '/image.webp', video: '/clip.mp4' }).video, '/clip-en.mp4');
}
assert.deepEqual(variantPaths('/case/image.webp', 'en'), ['/case/image-en.webp']);
// The map remains in the repository and feed, but it cannot be opened on production.
for (const page of [en, ru]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, 'pages/home/data/projects.js'), 'utf8'), { window: page.window });
  const projects = page.window.portfolioProjects;
  assert.deepEqual(Array.from(projects.slice(0, 3), item => item.id), ['customer-segments', 'kind-subscription', 'recycle-map']);
  assert.equal(projects[2].soon, true);
  assert.equal(projects[1].place.c, 3); assert.equal(projects[2].place.c, 4);
  assert.equal(page.window.siteLanguage.project(projects[0]).title, page.window.siteEditorialCopy['main page:7'][page.html.lang]);
  const grid = { innerHTML: '', querySelectorAll: () => [] };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'components/project-feed/project-feed.js'), 'utf8'), {
    window: page.window, document: { querySelector: () => ({ querySelector: () => grid }) }, matchMedia: () => ({ matches: false })
  });
  const rendered = adapt(parse5.parseFragment(grid.innerHTML));
  const cards = find(rendered, node => node.tagName === 'ARTICLE');
  assert.equal(find(cards[2], node => node.tagName === 'A').length, 0);
  assert.equal(find(cards[2], node => hasClass(node, 'feed-card__badge')).length, 1);
}
assert(fs.existsSync(path.join(root, 'projects/avito-charity/recycle-map/index.html')));
const rules = fs.readFileSync(path.join(root, '.htaccess'), 'utf8');
const redirect = rules.split('\n').find(line => line.includes('(?:avito-charity/)?recycle-map'));
const pattern = new RegExp(redirect.trim().split(/\s+/)[1]);
for (const target of ['projects/avito-charity/recycle-map/', 'projects/avito-charity/recycle-map/index.html', 'projects/recycle-map/']) assert(pattern.test(target));
assert(!pattern.test('projects/avito-charity/recycle-map/covers/cover.webp'));
assert(redirect.includes('R=302'));
// RU prefers Russian editions and shows language badges; EN has no badges.
for (const page of [en, ru]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, 'projects/articles/articles.js'), 'utf8'), { window: page.window });
  const articleList = { innerHTML: '' };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'components/article-catalog/article-catalog.js'), 'utf8'), {
    window: page.window, document: { querySelector: () => articleList }
  });
  const rendered = adapt(parse5.parseFragment(articleList.innerHTML));
  const links = find(rendered, node => node.tagName === 'A');
  const badges = find(rendered, node => hasClass(node, 'article-tile__language'));
  assert.equal(links.length, page.html.lang === 'ru' ? 17 : 7);
  assert.equal(badges.length, page.html.lang === 'ru' ? links.length : 0);
  const expected = page.window.portfolioArticles.filter(item => page.html.lang === 'ru' || item.language === 'en');
  const bilingual = page.window.portfolioArticles.filter(item => item.editions?.ru);
  assert.equal(bilingual.length, 6, 'All six confirmed Russian alternatives are retained');
  assert.equal(new Set(page.window.portfolioArticles.map(item => item.id)).size, 17, 'One card per article');
  expected.forEach((article, index) => {
    const edition = article.editions?.[page.html.lang];
    const language = edition ? page.html.lang : article.language;
    assert.equal(links[index].getAttribute('href'), edition || article.href);
    assert.equal(links[index].getAttribute('hreflang'), language);
    if (page.html.lang === 'ru') {
      assert.equal(badges[index].textContent, language.toUpperCase());
      assert(!hasClass(badges[index], 'btn'));
    }
    assert(article.image.endsWith('-diagram.svg'));
  });
}
// Resume links are native actions; there is no interception or language picker.
const chrome = fs.readFileSync(path.join(root, 'components/site-chrome/site-chrome.js'), 'utf8');
const resumeCode = chrome.slice(chrome.indexOf('  function configureResume'), chrome.indexOf('  /* ---------- chrome:'));
for (const page of [en, ru]) {
  const triggers = [{ dataset: {} }, { dataset: {} }];
  vm.runInNewContext(resumeCode, { window: page.window, document: { documentElement: { lang: page.html.lang }, querySelectorAll: () => triggers } });
  for (const trigger of triggers) {
    assert.equal(trigger.href, page.window.siteLanguage.resume);
    assert.equal(trigger.target, '_blank');
    assert.equal(trigger.dataset.resumeDocument, page.html.lang);
  }
}
assert(!chrome.includes('resumePicker'));
assert(chrome.includes("var cv = document.createElement('a')"));
// Run the real switch mounting logic and resize it between both specified positions.
const switchCode = chrome.slice(chrome.indexOf('    // One compact'), chrome.indexOf("    var menuBtn = document.createElement('button')"));
for (const language of ['en', 'ru']) {
  const header = { appendChild(node) { this.child = node; node.parentNode = this; } };
  const identity = { insertBefore(node, reference) { this.child = node; assert.equal(reference, logo); node.parentNode = this; } };
  const logo = { parentNode: identity }, listeners = {};
  let clicked;
  const control = { setAttribute() {}, addEventListener(name, handler) { if (name === 'click') clicked = handler; } };
  const media = { matches: true, addEventListener(name, handler) { listeners[name] = handler; } };
  vm.runInNewContext(switchCode, {
    root: { lang: language }, window: { matchMedia: () => media, siteLanguage: { switchTo(next) { assert.equal(next, language === 'en' ? 'ru' : 'en'); } } },
    document: { createElement: () => control, querySelector: selector => selector === '.site-header' ? header : logo }
  });
  assert.equal(control.parentNode, identity);
  assert.equal(control.textContent, language.toUpperCase());
  assert(control.className.includes('btn--fill-glass-ui'));
  clicked(); media.matches = false; listeners.change();
  assert.equal(control.parentNode, header);
  media.matches = true; listeners.change(); assert.equal(control.parentNode, identity);
}
// Every public English page remains fully translated, including accessible copy.
for (const pathname of Object.keys(en.window.siteEnglish.pages)) {
  if (pathname === '/projects/posts/') continue;
  const file = pathname.slice(1) + 'index.html';
  if (!fs.existsSync(path.join(root, file))) continue;
  const translated = run(file);
  for (const text of textNodes(translated.tree)) assert(!/[А-Яа-яЁё]/.test(text), file + ': untranslated text: ' + text.trim());
  for (const node of find(translated.tree, node => node.nodeType === 1)) {
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

if (process.env.LANGUAGE_AUDIT) {
  for (const file of publicFiles) {
    const page = run(file, '?lang=ru');
    const values = find(page.tree, node => node.nodeType === 3 && !node.parentElement?.closest('script, style, noscript')).map(node => node.nodeValue.trim()).filter(text => /[a-z]{3}/i.test(text) && !/[А-Яа-яЁё]/.test(text));
    console.log(file, JSON.stringify([...new Set(values)], null, 2));
  }
}
console.log('Languages: Sheets copy, selection and persistence, switch positions, shared English media, direct resumes, hidden map and RU/EN article collections verified.');
