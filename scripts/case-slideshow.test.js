const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../components/case-slideshow/case-slideshow.js'), 'utf8');
const events = {}, buttons = {}, motions = [];
const preference = { matches: false, addEventListener: (_, callback) => { preference.change = callback; } };
const slides = Array.from({ length: 4 }, (_, index) => {
  const classes = new Set(index === 0 ? ['is-current'] : []);
  return {
    classes, attrs: {},
    classList: {
      add: name => classes.add(name), remove: name => classes.delete(name),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name)
    },
    setAttribute(name, value) { this.attrs[name] = value; },
    animate(frames, options) {
      const motion = { frames, options, cancelled: false };
      motion.finished = new Promise((resolve, reject) => { motion.finish = resolve; motion.reject = reject; });
      motion.cancel = () => { motion.cancelled = true; motion.reject(new Error('cancelled')); };
      motions.push(motion);
      return motion;
    }
  };
});
const counter = {};
const root = {
  clientWidth: 1000,
  querySelectorAll: () => slides,
  querySelector(selector) {
    if (selector === '.case-slideshow__counter') return counter;
    return { addEventListener: (_, callback) => { buttons[selector] = callback; } };
  },
  addEventListener: (name, callback) => { events[name] = callback; }
};
let now = 1000;
vm.runInNewContext(source, {
  document: { querySelectorAll: () => [root] },
  window: { matchMedia: () => preference }, performance: { now: () => now }
});
function active(index) {
  slides.forEach((slide, i) => {
    assert.equal(slide.classes.has('is-current'), i === index);
    assert.equal(slide.attrs['aria-hidden'], String(i !== index));
  });
  assert.equal(counter.textContent, (index + 1) + ' из 4');
}
const next = () => buttons['.case-slideshow__next']();
const prev = () => buttons['.case-slideshow__prev']();

(async () => {
  next(); active(1);
  assert.equal(motions[0].frames[1].transform, 'translateX(-100%)');
  assert.equal(motions[1].frames[0].transform, 'translateX(100%)');
  assert(slides[0].classes.has('is-leaving'));
  const first = motions.slice();
  // A completed transition's queued cleanup must not cancel a newer click.
  first.forEach(motion => motion.finish());
  next(); active(2);
  await new Promise(resolve => setImmediate(resolve));
  assert(first.every(motion => motion.cancelled));
  assert.equal(motions[2].cancelled, false);
  assert.equal(slides.filter(slide => slide.classes.has('is-leaving')).length, 1);
  motions.slice(-2).forEach(motion => motion.finish());
  await new Promise(resolve => setImmediate(resolve));
  assert(slides.every(slide => !slide.classes.has('is-leaving')));
  next(); next(); active(0);
  assert.equal(motions.at(-1).frames[0].transform, 'translateX(100%)', 'Forward wrap keeps moving left');
  prev(); active(3);
  assert.equal(motions.at(-1).frames[0].transform, 'translateX(-100%)', 'Backward wrap reverses the motion');
  events.keydown({ key: 'ArrowLeft', preventDefault() {} }); active(2);
  events.pointerdown({ pointerType: 'touch', clientX: 200, clientY: 20, target: { setPointerCapture() {} } });
  events.pointerup({ clientX: 100, clientY: 22 }); active(3);
  let suppressed = false;
  events.click({ preventDefault() { suppressed = true; }, stopImmediatePropagation() {} });
  assert(suppressed, 'Swipe must not open the lightbox');
  const wheel = { deltaX: 80, deltaY: 0, deltaMode: 0, preventDefault() {} };
  events.wheel(wheel); active(0);
  events.wheel(wheel); active(0);
  now += 300; events.wheel(wheel); active(1);
  preference.matches = true; preference.change();
  assert(motions.every(motion => motion.cancelled));
  assert(slides.every(slide => !slide.classes.has('is-leaving')));
  const count = motions.length;
  next(); active(2);
  assert.equal(motions.length, count, 'Reduced motion switches immediately');
  console.log('Case slideshow: direction, wrap, rapid clicks, cleanup, keyboard, swipe, wheel inertia and reduced motion passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
