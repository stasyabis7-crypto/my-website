const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../components/site-brand/logo-contrast.js'), 'utf8');
const callbacks = {}, frames = [], styles = {}, attrs = {};
let regionBox = { left: 0, right: 100, top: 0, bottom: 500 }, covered = false, modalOpen = false;
const photo = { closest: () => null }, foreground = { closest: () => null };
const region = { getBoundingClientRect: () => regionBox, contains: node => node === photo };
const mark = { getBoundingClientRect: () => ({ left: 50, right: 250, top: 20, bottom: 70 }), style: { setProperty: (key, value) => { styles[key] = value; } } };
const context = {
  document: { querySelector: selector => selector === '.site-header__logo-mark' ? mark : null, querySelectorAll: () => [region], documentElement: { classList: { contains: name => modalOpen && name === 'contact-scroll-lock' }, setAttribute: (key, value) => { attrs[key] = value; } }, elementsFromPoint: () => modalOpen ? [] : [covered ? foreground : photo], fonts: { ready: { then() {} } } },
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
modalOpen = true;
callbacks.resize(); frames.shift()();
assert.equal(styles['--logo-light-clip'], 'inset(0px 0px 0px 0px)', 'Opening a modal preserves the logo colour when the inert background disappears from hit testing');
modalOpen = false;
covered = true;
callbacks.scroll(); frames.shift()();
assert.equal(styles['--logo-light-clip'], 'inset(0 100% 0 0)', 'A light section covering the photo restores the regular signature');
covered = false;
regionBox = { left: 0, right: 500, top: -500, bottom: 0 };
callbacks.scroll(); frames.shift()();
assert.equal(styles['--logo-light-clip'], 'inset(0 100% 0 0)', 'Scrolling beyond the portrait restores the regular signature');
console.log('Logo contrast: partial/full photo overlap, occlusion, scrolling and frame batching verified.');

// Desktop hover must remain visible through the opaque contrast layer over
// the hero. Check the actual CSS for both painted layers in stylesheet order.
const css = ['components/site-header/header.css', 'styles/buttons.css']
  .map(file => fs.readFileSync(require('node:path').join(__dirname, '..', file), 'utf8')).join('\n');
function logoPaint(layer, hovered) {
  const selector = '.site-header__logo-mark' + (layer === 'contrast' ? '::after' : '');
  const matching = [selector];
  if (hovered) matching.push('.site-header__logo:hover ' + selector);
  const paint = {};
  for (const rule of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!rule[1].split(',').some(value => matching.includes(value.trim()))) continue;
    for (const declaration of rule[2].split(';')) {
      const colon = declaration.indexOf(':');
      if (colon < 0) continue;
      const property = declaration.slice(0, colon).trim();
      const value = declaration.slice(colon + 1).trim();
      if (property === 'background') {
        paint['background-image'] = 'none';
        paint['background-size'] = 'auto';
      }
      paint[property] = value;
    }
  }
  return paint;
}
for (const hovered of [false, true]) {
  const base = logoPaint('base', hovered), contrast = logoPaint('contrast', hovered);
  for (const property of ['background-image', 'background-size', 'background-position', 'background-repeat']) {
    assert.equal(contrast[property], base[property], `The white hero layer must share ${property} with the signature (hover=${hovered})`);
  }
}
assert.equal(logoPaint('base', true)['background-size'], '100% 100%', 'Hover reveals the full gradient');
assert.equal(logoPaint('contrast', false).background, '#fff', 'Resting contrast stays white');
console.log('Logo hover: the hero contrast layer and signature share the gradient sweep.');
