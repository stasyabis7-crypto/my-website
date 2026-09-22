// Exercise the actual wheel handler: a long gesture must consume one action.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('components/work-gallery/work-gallery.js', 'utf8');
const start = source.indexOf('  let wheel = null;');
const end = source.indexOf('\n  function beginGesture', start);
function run(events, initiallyVisible = true, enqueue) {
  let handler, now = 0, inGallery = initiallyVisible;
  const actions = [];
  vm.runInNewContext(source.slice(start, end), {
    window: { addEventListener: (_, callback) => { handler = callback; } },
    performance: { now: () => now }, viewport: { clientWidth: 1000 },
    visible: () => inGallery, locked: () => false,
    showGallery: () => { actions.push('gallery'); inGallery = true; },
    showHero: () => { actions.push('hero'); inGallery = false; },
    goTo: direction => { actions.push(direction); enqueue?.(direction); }
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
assert.deepEqual(run([[0, 100], [30, 1], [30, 400], [30, -2], [30, 20, 4, false]]), [1], 'acceleration, bounce, axis noise');
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
const fastStroke = [[16, 60], [16, 100], [16, 40], [16, 12]];
assert.deepEqual(run([...fastStroke, ...fastStroke, ...fastStroke]), [1, 1, 1], 'same direction renewed before tail reaches near-zero');
assert.deepEqual(run([...fastStroke, ...fastStroke, ...fastStroke].map(([gap, amount]) => [gap, 0, amount])), [1, 1, 1], 'three quick downward swipes');
assert.deepEqual(run([[0, 60], [16, 100], [16, 40], [16, 12], [16, 50], [16, 1]]), [1], 'falling envelope then one spike is not a swipe');
assert.deepEqual(run([[0, 0, -60], [16, 0, -100]]), ['hero'], 'upward swipe returns to hero and consumes momentum');
assert.deepEqual(run([[0, 60], [30, 0, -20], [16, 0, -100]]), [1, 'hero'], 'upward swipe after horizontal swipe returns to hero');
assert.deepEqual(run([[0, 0, 60], [30, 0, -20], [16, 0, -100]]), [1, 'hero'], 'upward reversal returns to hero');
assert.deepEqual(run([[0, 0, -60], [450, 0, 60]]), ['hero', 'gallery'], 'new downward gesture reopens gallery without advancing');
assert.deepEqual(run([[0, 60], [30, 0, 20]]), [1, 1], 'short downward swipe after horizontal swipe');
// A real trackpad swipe wobbles diagonally; one noisy sample must not pivot the
// established axis and fire a second advance for what is one continuous swipe.
assert.deepEqual(run([[0, 100], [16, 20, 5], [16, 30, 50], [16, 20, 5], [16, 5, 1]]), [1], 'diagonal wobble mid-swipe does not double-advance');
// Exercise the real navigation queue with smooth scrolling still unfinished.
function navigation() {
  const context = {
    pendingTarget: null, physical: 7, drag: null, touch: null, navigationQueue: [],
    projects: Array(7), slides: Array(21), offsets: Array.from({ length: 21 }, (_, i) => i * 100),
    reduced: { matches: false }, targets: []
  };
  context.viewport = { scrollLeft: 700, scrollTo({ left, behavior }) {
    if (behavior === 'instant') this.scrollLeft = left;
    else context.targets.push(left);
  } };
  context.loopPosition = left => 700 + ((left - 700) % 700 + 700) % 700;
  context.update = () => { context.physical = Math.round(context.viewport.scrollLeft / 100); };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function recenter()'), source.indexOf('  // Button, wheel')), context);
  context.finish = () => {
    context.viewport.scrollLeft = context.offsets[context.pendingTarget];
    context.settleNavigation();
  };
  return context;
}
const forward = navigation();
run([...fastStroke, ...fastStroke, ...fastStroke], true, forward.goTo);
assert.deepEqual(forward.targets, [800], 'first animation started');
assert.equal(forward.navigationQueue.length, 2, 'two additional gestures retained during animation');
forward.finish(); forward.finish(); forward.finish();
assert.deepEqual(forward.targets, [800, 900, 1000], 'three swipes produce three completed transitions');
const mixed = navigation();
mixed.goTo(1); mixed.goTo(-1); mixed.goTo(1);
mixed.finish(); mixed.finish(); mixed.finish();
assert.deepEqual(mixed.targets, [800, 700, 800], 'opposite queued gestures are not cancelled out');
// Touch and mouse dragging use the same preview/finish handlers.
function gesture(points, cancelled = false) {
  const actions = [], previews = [];
  const context = {
    recenter() {}, pendingTarget: null, nearest: () => 2,
    offsets: [0, 100, 200, 300, 400],
    viewport: { scrollTo: ({ left }) => previews.push(left) },
    showHero: () => actions.push('hero'), centerAt: target => actions.push(target)
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function beginGesture'), source.indexOf("  gallery.addEventListener('touchstart'")), context);
  const state = context.beginGesture(100, 100);
  points.forEach(([x, y]) => context.previewGesture(state, x, y));
  context.finishGesture(state, cancelled);
  return { actions, previews };
}
const upward = gesture([[102, 160], [103, 220]]);
assert.deepEqual(upward.actions, ['hero'], 'touch scrolling toward page top returns to hero');
assert.ok(upward.previews.every(left => left === 200), 'return gesture does not move slider');
assert.deepEqual(gesture([[100, 120]]).actions, [], 'short touch does not leave gallery');
assert.deepEqual(gesture([[100, 160]], true).actions, [], 'cancelled touch does not leave gallery');
assert.deepEqual(gesture([[100, 40]]).actions, [3], 'downward page scroll advances card');
assert.deepEqual(gesture([[160, 102]]).actions, [1], 'horizontal reverse touch selects previous card');
assert.deepEqual(gesture([[100, 50], [100, 160]]).actions, ['hero'], 'vertical touch reversal returns to hero');
console.log('Gallery: gesture recognition and queued animation checks passed.');
