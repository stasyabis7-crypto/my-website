// Exercise the actual wheel handler: a long gesture must consume one action.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('components/work-gallery/work-gallery.js', 'utf8');
const start = source.indexOf('  let wheel = null;');
const end = source.indexOf('\n  function beginGesture', start);
function run(events, initiallyVisible = true) {
  let handler, now = 0, inGallery = initiallyVisible;
  const actions = [];
  vm.runInNewContext(source.slice(start, end), {
    window: { addEventListener: (_, callback) => { handler = callback; } },
    performance: { now: () => now }, viewport: { clientWidth: 1000 },
    visible: () => inGallery, locked: () => false,
    showGallery: () => { actions.push('gallery'); inGallery = true; },
    showHero: () => { actions.push('hero'); inGallery = false; },
    goTo: direction => actions.push(direction)
  });
  events.forEach(([gap, x, y = 0, cancelable = true]) => {
    now += gap;
    handler({ deltaX: x, deltaY: y, deltaMode: 0, cancelable,
      preventDefault() {}, target: { closest: () => null } });
  });
  return actions;
}
const long = Array.from({ length: 80 }, (_, i) => [100, i % 4 === 0 ? 500 : 20]);
assert.deepEqual(run(long), [1], 'eight-second swipe');
assert.deepEqual(run([[0, 90], [300, 15], [300, 200], [300, 1]]), [1], 'sparse momentum');
assert.deepEqual(run([[0, 100], [30, 1], [30, 400], [30, -50], [30, 20, 60, false]]), [1], 'acceleration, bounce, axis noise');
assert.deepEqual(run([...long, [450, 100]]), [1, 1], 'new gesture after silence');
assert.deepEqual(run([[0, 0, 100], [100, 0, 300], [100, 0, 50]], false), ['gallery'], 'hero entry consumes entire gesture');
assert.deepEqual(run([[0, -100], [100, -400]]), [-1], 'long reverse swipe');
console.log('Gallery: single-action wheel gesture checks passed.');
