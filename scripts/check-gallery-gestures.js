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
assert.deepEqual(run([[0, 90], [300, 15], [300, 8], [300, 1]]), [1], 'sparse momentum');
assert.deepEqual(run([[0, 100], [30, 1], [30, 400], [30, -50], [30, 20, 60, false]]), [1], 'acceleration, bounce, axis noise');
assert.deepEqual(run([...long, [450, 100]]), [1, 1], 'new gesture after silence');
assert.deepEqual(run([[0, 0, 100], [100, 0, 300], [100, 0, 50]], false), ['gallery'], 'hero entry consumes entire gesture');
assert.deepEqual(run([[0, -100], [100, -400]]), [-1], 'long reverse swipe');
assert.deepEqual(run([[0, 100], [40, 10], [40, -12], [16, -18], [16, -30], [16, -100], [16, -20]]), [1, -1], 'immediate deliberate swipe back, then momentum');
assert.deepEqual(run([[0, -100], [40, -10], [40, 12], [16, 18], [16, 30], [16, 100]]), [-1, 1], 'immediate deliberate swipe forward');
assert.deepEqual(run([[0, 100], [30, -3], [16, -3], [16, -3], [16, 20]]), [1], 'small reverse bounce does not change card');
assert.deepEqual(run(long.map(([gap, amount]) => [gap, 0, amount])), [1], 'long downward scroll advances once');
assert.deepEqual(run([[0, 0, 100], [450, 0, 100]]), [1, 1], 'separate downward gestures');
assert.deepEqual(run([[0, -100], [40, 0, 12], [16, 0, 18], [16, 0, 30], [16, 0, 100]]), [-1, 1], 'downward scroll after swipe back advances');
assert.deepEqual(run([[0, 100], [40, 0, 12], [16, 0, 18], [16, 0, 30], [16, 0, 100]]), [1, 1], 'deliberate downward gesture after horizontal swipe');
// Successive trackpad strokes are not separated by 400 ms of silence.
assert.deepEqual(run([[0, 80], [180, 80], [180, 80], [180, 80]]), [1, 1, 1, 1], 'four quick separate strokes');
const stroke = [[16, 60], [16, 100], [16, 40], [16, 12], [16, 5], [16, 3], [16, 2], [16, 1], [16, .5]];
assert.deepEqual(run([...stroke, ...stroke, ...stroke]), [1, 1, 1], 'three same-direction strokes with no silent gap');
assert.deepEqual(run([...stroke, ...stroke, ...stroke].map(([gap, amount]) => [gap, 0, amount])), [1, 1, 1], 'three downward trackpad strokes');
assert.deepEqual(run([...stroke, [16, 50], [16, 1], [16, .5]]), [1], 'one isolated tail spike is ignored');
console.log('Gallery: single-action wheel gesture checks passed.');
