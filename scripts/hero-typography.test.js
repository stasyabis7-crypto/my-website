const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const typography = require('../site/typography-rules');

// Run the actual reveal controller: an isolated preposition in an inline-block
// can wrap even when a neighbouring text node has been typographed correctly.
function revealGroups(text) {
  let children = [];
  const title = {
    textContent: text, setAttribute() {},
    replaceChildren(...nodes) { children = nodes; },
    querySelectorAll() { return children.filter(node => node.className === 'hero-reveal-word'); }
  };
  const style = { setProperty() {} };
  const hero = {
    style, clientWidth: 375, offsetHeight: 800,
    getBoundingClientRect: () => ({ top: 0 }), contains: () => false,
    classList: { add() {}, remove() {}, contains: () => false },
    querySelector(selector) {
      return { '.mood-title': title, '.mood-stage': { style: {} }, '.hero-video': { style: {} } }[selector] || null;
    }
  };
  const document = {
    hidden: false, documentElement: { classList: { toggle() {} } },
    querySelector: selector => selector === '.mood-hero--video' ? hero : null,
    createElement: () => ({ style, setAttribute() {}, offsetTop: 0 }),
    createTextNode: textContent => ({ textContent }), elementsFromPoint: () => []
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../components/hero-mood/hero-video.js'), 'utf8'), {
    document, window: { siteTypography: typography }, innerWidth: 375,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {}, requestAnimationFrame() {}, ResizeObserver: class { observe() {} }
  });
  return children.filter(node => node.className === 'hero-reveal-word').map(node => node.textContent);
}
const home = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const heading = home.match(/<h1[^>]+id="mood-heading"[^>]*>([^<]+)<\/h1>/)[1];
const groups = revealGroups(heading);
assert(groups.includes('с\u00a0опытом'), 'The real hero must keep «с опытом» inside one reveal span: ' + JSON.stringify(groups));
assert(!groups.includes('с'), 'The preposition must not be a standalone inline-block');
assert(revealGroups('Работа и в команде').includes('и\u00a0в\u00a0команде'));
assert(revealGroups('Сделать бы лучше').includes('Сделать\u00a0бы'));
assert(revealGroups('Designer with 6 years of experience').includes('of\u00a0experience'));
assert(home.indexOf('site/typography-rules.js') < home.indexOf('components/hero-mood/hero-video.js'), 'Shared typography must load before the reveal splits the heading');
console.log('Hero typography: actual heading, conjunction chains, particles and English groups stay together during reveal.');
