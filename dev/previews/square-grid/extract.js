// Снимает настоящий контент страниц сайта в content.json для стенда.
// Нужен запущенный локальный сервер: node extract.js http://127.0.0.1:8123
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const base = process.argv[2] || 'http://127.0.0.1:8000';
const cases = ['/projects/ozon-crm/customer-segments/', '/projects/avito-charity/recycle-map/', '/projects/avito-charity/subscription/'];
const collections = ['/projects/articles/', '/projects/posts/', '/projects/playground/'];

function scrape() {
  const text = el => (el ? el.innerText.replace(/\s+/g, ' ').trim() : '');
  const media = el => {
    if (!el) return null;
    const src = el.currentSrc || el.getAttribute('src') || (el.querySelector('source') || {}).src || '';
    const url = new URL(src, location.href);
    const poster = el.poster ? new URL(el.poster, location.href) : null;
    const w = el.videoWidth || el.naturalWidth || +el.getAttribute('width') || 16;
    const h = el.videoHeight || el.naturalHeight || +el.getAttribute('height') || 10;
    return { tag: el.tagName.toLowerCase(), src: url.pathname + url.search, poster: poster && poster.pathname + poster.search, alt: el.alt || el.getAttribute('aria-label') || '', ratio: +(w / h).toFixed(3) };
  };
  const LEAF = '.case-card, .case-metric, .case-team__card, .case-scenario__card, .activity-article, .project-card, .works-grid__item';
  const sections = [];
  document.querySelectorAll('main section').forEach(section => {
    if (section.parentElement.closest('section')) return;
    const heading = section.querySelector('h1, h2');
    const out = { id: section.id, title: text(heading), level: heading ? heading.tagName.toLowerCase() : '', items: [] };
    const seen = new Set();
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_ELEMENT);
    let node = walker.currentNode;
    while ((node = walker.nextNode())) {
      if (node === heading || [...seen].some(parent => parent.contains(node))) continue;
      if (node.closest('[hidden]') || getComputedStyle(node).display === 'none') { seen.add(node); continue; }
      if (node.matches(LEAF)) {
        seen.add(node);
        const title = text(node.querySelector('h3, .case-metric__value, .case-scenario__label'));
        const parts = [...node.querySelectorAll('p, li')].filter(p => !p.matches('.case-metric__value, .case-scenario__label')).map(text).filter(Boolean);
        const link = node.matches('a') ? node : node.querySelector('a[href]');
        const kind = node.matches('.case-metric') ? 'metric' : node.matches('.case-team__card') ? 'team' : node.matches('.case-scenario__card') ? 'step'
          : node.matches('.activity-article') ? 'article' : 'card';
        const number = text(node.querySelector('.activity-article__number, .case-scenario__number, .case-team__number'));
        const picture = kind === 'metric' ? null : node.querySelector('video, img:not(.case-team__avatar)');
        out.items.push({ kind, number, title, text: parts.join(' '), href: link ? link.getAttribute('href') : '', media: media(picture) });
      } else if (node.matches('video, img')) {
        seen.add(node);
        if (node.getBoundingClientRect().width > 80) out.items.push({ kind: 'media', media: media(node) });
      } else if (node.matches('a.btn')) {
        seen.add(node);
        out.items.push({ kind: 'button', title: text(node), href: node.getAttribute('href') });
      } else if (node.matches('p, h3, li') && !node.querySelector(LEAF) && text(node)) {
        seen.add(node);
        out.items.push({ kind: node.matches('h3') ? 'subhead' : 'text', text: text(node) });
      }
    }
    sections.push(out);
  });
  return { title: document.title, path: location.pathname, sections };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
  const content = {};
  for (const url of [...cases, ...collections]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(base + url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } });
    await new Promise(r => setTimeout(r, 800));
    content[url] = await page.evaluate(scrape);
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'content.json'), JSON.stringify(content, null, 1));
  for (const [url, page] of Object.entries(content)) console.log(url, page.sections.map(s => `${s.title || s.id}:${s.items.length}`).join(' | '));
})();
