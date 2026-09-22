'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the real controller with browser APIs stubbed. In particular, deliver
// multiple visibility changes in one callback, as cached navigation can do.
const frames = new Map();
let frameId = 0;
let visibilityObserver;
const box = { width: 1400, height: 850, top: 0, left: 0, right: 1400, bottom: 850 };
const context = new Proxy({}, {
  get(_, key) {
    if (key === 'getImageData' || key === 'createImageData') return () => ({ data: new Uint8ClampedArray(420 * 420 * 4) });
    if (key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return () => {};
  },
  set() { return true; }
});
const canvas = { getContext: () => context, dataset: {} };
const title = {
  textContent: 'Test heading', setAttribute() {}, replaceChildren() {},
  querySelectorAll: () => []
};
const stage = { getBoundingClientRect: () => box };
const content = { getBoundingClientRect: () => ({ ...box, top: 160, bottom: 440 }), querySelectorAll: () => [] };
const root = { matches: () => false };
const hero = {
  classList: { add() {}, remove() {} },
  querySelector: selector => ({ '.hero-spheres': canvas, '.mood-stage': stage, '.mood-content': content, '.mood-title': title })[selector]
};
const document = {
  hidden: false, documentElement: root, fonts: { ready: Promise.resolve() },
  querySelector: selector => selector === '.mood-hero--spheres' ? hero : { getBoundingClientRect: () => ({ left: 0, top: 0, right: 350, bottom: 80 }) },
  createElement: tag => tag === 'canvas' ? { getContext: () => context } : { style: { setProperty() {} }, setAttribute() {} },
  createTextNode: text => ({ textContent: text }),
  addEventListener() {}
};
const sandbox = {
  console, document, devicePixelRatio: 1,
  performance: { now: () => 1 },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  addEventListener() {},
  requestAnimationFrame: callback => { const id = ++frameId; frames.set(id, callback); return id; },
  cancelAnimationFrame: id => frames.delete(id),
  MutationObserver: class { observe() {} disconnect() {} },
  ResizeObserver: class { observe() {} },
  IntersectionObserver: class { constructor(callback) { this.deliver = callback; visibilityObserver = this; } observe() {} },
  Image: class { constructor() { this.width = this.height = 1200; } set src(_) { this.onload(); } }
};

(async () => {
  const source = fs.readFileSync(path.join(__dirname, '../components/hero-mood/hero-spheres.js'), 'utf8');
  await vm.runInNewContext(source, sandbox);
  assert.equal(frames.size, 1, 'Visible hero starts an animation frame');
  visibilityObserver.deliver([{ target: canvas, isIntersecting: false }, { target: canvas, isIntersecting: true }]);
  assert.equal(frames.size, 1, 'A cached-load batch ending visible must keep the animation running');
  visibilityObserver.deliver([{ target: canvas, isIntersecting: true }, { target: canvas, isIntersecting: false }]);
  assert.equal(frames.size, 0, 'A batch ending offscreen pauses the animation');
  visibilityObserver.deliver([{ target: canvas, isIntersecting: true }]);
  assert.equal(frames.size, 1, 'Returning onscreen resumes exactly one frame loop');
  console.log('Hero spheres: batched visibility changes, pause and resume verified.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
