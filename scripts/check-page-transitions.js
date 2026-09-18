// Exercise navigation interception and the cursor handoff with the real controller.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../components/page-transition/page-transition.js'), 'utf8');

function page(base, route, storage, reduced = false) {
  const events = {}, timers = [], classes = new Set();
  const root = { classList: {
    add: (...names) => names.forEach(name => classes.add(name)),
    remove: name => classes.delete(name), contains: name => classes.has(name)
  } };
  const location = { href: base + route, origin: new URL(base).origin,
    pathname: new URL(base + route).pathname, assign: href => { location.assigned = href; } };
  const window = { addEventListener() {} };
  const document = {
    currentScript: { src: base + 'components/page-transition/page-transition.123456.js' },
    documentElement: root, querySelector: () => ({}),
    addEventListener: (name, callback) => { events[name] = callback; },
    createElement: () => ({ relList: { supports: () => true } }), head: { appendChild() {} }
  };
  vm.runInNewContext(source, {
    window, document, location, URL, navigator: {},
    performance: { getEntriesByType: () => [{ type: 'navigate' }] },
    sessionStorage: { getItem: key => storage.get(key), removeItem: key => storage.delete(key),
      setItem: (key, value) => storage.set(key, value) },
    matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
    clearTimeout() {}, getComputedStyle: () => ({ display: 'block', getPropertyValue: () => '' })
  });
  events.DOMContentLoaded();
  function click(href) {
    const link = { href, hasAttribute: () => false };
    const event = { button: 0, defaultPrevented: false, target: { closest: () => link },
      preventDefault() { this.defaultPrevented = true; } };
    events.click(event);
    return event.defaultPrevented;
  }
  return { window, root, events, timers, location, click };
}

for (const base of ['https://example.test/', 'https://example.test/preview/']) {
  for (const [from, to] of [
    ['projects/ozon-crm/', '#works-gallery'],
    ['index.html', 'projects/ozon-crm/'],
    ['projects/ozon-crm/', 'projects/ozon-crm/customers/index.html']
  ]) {
    const storage = new Map();
    const outgoing = page(base, from, storage);
    outgoing.root.classList.add('has-dot-cursor');
    outgoing.events.pointermove({ pointerType: 'mouse', clientX: 130, clientY: 240 });
    assert.equal(outgoing.click(base + to), true, `Intercept ${base + to}`);
    assert.equal(outgoing.location.assigned, undefined, 'Wait for the outgoing ribbons');
    assert(outgoing.root.classList.contains('is-transition-covering'));
    outgoing.timers.filter(timer => timer.delay === 1100).at(-1).callback();
    assert.equal(outgoing.location.assigned, base + to);
    const incoming = page(base, to, storage);
    assert(incoming.root.classList.contains('is-transition-boot'), 'Continue the covered transition');
    assert.equal(incoming.window.__pageTransitionCursor.x, 130);
    assert.equal(incoming.window.__pageTransitionCursor.y, 240);
    assert.equal(storage.size, 0, 'Consume cursor handoff once');
  }
  for (const destination of ['https://external.test/', base + 'projects/ozon-crm/#details']) {
    assert.equal(page(base, 'projects/ozon-crm/', new Map()).click(destination), false);
  }
  assert.equal(page(base, 'index.html', new Map(), true).click(base + 'projects/ozon-crm/'), false);
}
console.log('Page transitions: root/subdirectory navigation, cursor handoff and native exclusions passed.');
