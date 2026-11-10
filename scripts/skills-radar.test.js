'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'components/skills-radar/skills-radar.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'about/index.html'), 'utf8');
class Element {
  constructor() {
    this.events = new Map(); this.attrs = {}; this.dataset = {}; this.style = {};
    this.open = false; this.showing = false; this.focused = false;
    const classes = new Set();
    this.classList = { add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n)), contains: name => classes.has(name) };
    this.title = { textContent: '' }; this.description = { textContent: '' };
  }
  addEventListener(name, fn) { this.events.set(name, [...(this.events.get(name) || []), fn]); }
  emit(name, event = {}) { for (const fn of this.events.get(name) || []) fn(event); }
  querySelector(selector) { return selector === '[data-skill-title]' ? this.title : selector === '[data-skill-description]' ? this.description : this.closeButton; }
  setAttribute(name, value) { this.attrs[name] = value; }
  removeAttribute(name) { delete this.attrs[name]; }
  matches() { return this.showing; }
  getBoundingClientRect() { return { left: 20, top: 20, bottom: 64, right: 340, width: 320, height: 180 }; }
  showPopover() { this.showing = true; this.emit('toggle'); }
  hidePopover() { this.showing = false; this.emit('toggle'); }
  showModal() { this.open = true; }
  close() { this.open = false; this.emit('close'); }
  focus() { this.focused = true; }
}
function harness(isMobile, isReduced = false, language = 'ru') {
  const section = new Element(), plot = new Element(), popover = new Element(), sheet = new Element(), documentRoot = new Element();
  sheet.closeButton = new Element();
  popover.closeButton = new Element();
  const triggers = Array.from({ length: 16 }, (_, i) => { const e = new Element(); e.dataset.skill = String(i % 8); return e; });
  const mobile = new Element(); mobile.matches = isMobile;
  const reduced = new Element(); reduced.matches = isReduced;
  section.querySelector = selector => ({ '.skills-radar__svg': plot, '#skills-popover': popover, '#skills-sheet': sheet })[selector];
  section.querySelectorAll = () => triggers;
  const globals = new Element();
  let intersection;
  const timers = new Map(); let timerId = 0;
  const context = {
    document: { querySelector: () => section, documentElement: documentRoot },
    window: { IntersectionObserver: true, siteLanguage: { t(value) { return language === 'en' ? english.phrases[value] || value : value; } } }, innerWidth: isMobile ? 375 : 1200, innerHeight: 800,
    matchMedia: q => q.includes('699') ? mobile : reduced,
    addEventListener: (n, f) => globals.addEventListener(n, f),
    IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} disconnect() {} },
    setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id)
  };
  vm.runInNewContext(source, context);
  return { section, plot, popover, sheet, documentRoot, triggers, mobile, globals, intersection, timers };
}
const dictionaries = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'site/languages/english-copy.js'), 'utf8'), dictionaries);
const english = dictionaries.window.siteEnglish;
const titles = ['Product thinking', 'Research & validation', 'Interaction & UI craft', 'Design systems', 'AI products & tools', 'Data & metrics', 'Accessibility', 'Collaboration & influence'];
const desktop = harness(false, false, 'en');
assert.equal(desktop.plot.attrs.viewBox, '0 0 1040 800');
assert(!desktop.section.classList.contains('is-visible'));
desktop.intersection([{ isIntersecting: true }]);
assert(desktop.section.classList.contains('is-visible'));
for (let i = 0; i < 8; i++) {
  desktop.triggers[i].emit('click');
  assert(desktop.popover.showing, `Desktop point ${i} opens`);
  assert.equal(desktop.popover.title.textContent, titles[i]);
  assert(desktop.popover.description.textContent.length > 40);
  assert.equal(desktop.triggers[i + 8].attrs['aria-expanded'], 'true');
  assert(parseFloat(desktop.popover.style.left) >= 16);
  desktop.popover.closeButton.emit('click');
  assert(!desktop.popover.showing);
  assert(desktop.triggers[i].focused, 'Desktop close returns focus');
  assert(desktop.triggers.every(t => t.attrs['aria-expanded'] === 'false'));
}
desktop.triggers[0].emit('click'); desktop.globals.emit('scroll'); assert(!desktop.popover.showing);
const mobile = harness(true, true, 'en');
assert.equal(mobile.plot.attrs.viewBox, '200 80 640 640');
assert(mobile.section.classList.contains('is-visible'), 'Reduced motion shows content immediately');
for (let i = 0; i < 8; i++) {
  mobile.triggers[i + 8].emit('click');
  assert(mobile.sheet.open, `Mobile label ${i} opens`);
  assert.equal(mobile.sheet.title.textContent, titles[i]);
  assert(mobile.documentRoot.classList.contains('skills-sheet-open'));
  let cancelled = false;
  mobile.sheet.emit('cancel', { preventDefault() { cancelled = true; } });
  assert(cancelled); assert(!mobile.sheet.open);
  assert(!mobile.documentRoot.classList.contains('skills-sheet-open'));
  assert(mobile.triggers[i + 8].focused, 'Focus returns to the selected control');
}
mobile.triggers[0].emit('click'); mobile.mobile.matches = false; mobile.mobile.emit('change');
assert(!mobile.sheet.open); assert.equal(mobile.plot.attrs.viewBox, '0 0 1040 800');
const animated = harness(true);
animated.triggers[4].emit('click'); animated.sheet.closeButton.emit('click');
assert(animated.sheet.classList.contains('is-closing')); assert(animated.sheet.open);
animated.sheet.emit('animationend', { target: animated.sheet, animationName: 'skill-sheet-out' });
assert(!animated.sheet.open);
desktop.section.emit('animationend', { animationName: 'skill-line-in' });
assert(desktop.section.classList.contains('is-line-complete'), 'Finished reveal leaves a solid contour');
const revealMask = html.match(/<mask id="skills-reveal"[\s\S]*?<\/mask>/);
assert(revealMask && !revealMask[0].includes('non-scaling-stroke'), 'Reveal scales separately from the non-scaling contour');
assert(!html.includes('A closer look'));
const skillSection = html.match(/<section class="skills-radar"[\s\S]*?<\/section>/)[0];
assert.equal((skillSection.match(/data-skill="/g) || []).length, 16);
assert(skillSection.includes('<noscript>'));
assert(html.indexOf('id="about-heading"') < html.indexOf('id="skills"'));
assert(html.indexOf('id="skills"') < html.indexOf('id="experience"'));
// On narrow screens, every 44px tap target remains inside the plot and targets
// do not collide; this validates coordinates, not browser text rendering.
const coordinates = [...skillSection.matchAll(/--mobile-x:([\d.]+)%;--mobile-y:([\d.]+)%/g)].map(m => [Number(m[1]), Number(m[2])]);
assert.equal(coordinates.length, 8);
for (const width of [320, 375, 390, 600]) {
  const size = width - 32;
  const points = coordinates.map(p => p.map(v => v * size / 100));
  for (const p of points) for (const v of p) assert(v >= 22 && v <= size - 22, `Target stays within ${width}px viewport`);
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) assert(Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]) >= 44, 'Tap targets do not overlap');
}
const russian = harness(false);
russian.triggers[0].emit('click');
assert.equal(russian.popover.title.textContent, 'Продуктовое мышление');
assert(/[А-Яа-я]/.test(russian.popover.description.textContent));
console.log('Skills radar: RU/EN copy, 8 desktop popovers, 8 mobile details, focus/scroll cleanup, animated close, reduced motion, breakpoint changes and 320–600px target geometry passed.');
