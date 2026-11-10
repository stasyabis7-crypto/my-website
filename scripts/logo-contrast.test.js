const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../components/site-brand/logo-contrast.js'), 'utf8');
const callbacks = {}, frames = [], styles = {}, attrs = {};
let regionBox = { left: 0, right: 100, top: 0, bottom: 500 }, covered = false;
const photo = { closest: () => null }, foreground = { closest: () => null };
const region = { getBoundingClientRect: () => regionBox, contains: node => node === photo };
const mark = { getBoundingClientRect: () => ({ left: 50, right: 250, top: 20, bottom: 70 }), style: { setProperty: (key, value) => { styles[key] = value; } } };
const context = {
  document: { querySelector: selector => selector === '.site-header__logo-mark' ? mark : null, querySelectorAll: () => [region], documentElement: { setAttribute: (key, value) => { attrs[key] = value; } }, elementsFromPoint: () => [covered ? foreground : photo], fonts: { ready: { then() {} } } },
  addEventListener: (name, callback) => { callbacks[name] = callback; },
  requestAnimationFrame: callback => { frames.push(callback); }, ResizeObserver: class { observe() {} }
};
vm.runInNewContext(source, context);
assert.equal(styles['--logo-light-clip'], 'inset(0px 150px 0px 0px)', 'Only the 50px over the photo turns white');
regionBox = { left: 0, right: 500, top: 0, bottom: 500 };
callbacks.scroll(); callbacks.scroll();
assert.equal(frames.length, 1, 'Repeated scroll events share one frame');
frames.shift()();
assert.equal(styles['--logo-light-clip'], 'inset(0px 0px 0px 0px)', 'Full photo overlap uses the complete white signature');
covered = true;
callbacks.scroll(); frames.shift()();
assert.equal(styles['--logo-light-clip'], 'inset(0 100% 0 0)', 'A light section covering the photo restores the regular signature');
covered = false;
regionBox = { left: 0, right: 500, top: -500, bottom: 0 };
callbacks.scroll(); frames.shift()();
assert.equal(styles['--logo-light-clip'], 'inset(0 100% 0 0)', 'Scrolling beyond the portrait restores the regular signature');
console.log('Logo contrast: partial/full photo overlap, occlusion, scrolling and frame batching verified.');
