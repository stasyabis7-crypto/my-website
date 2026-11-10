const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const parse5 = require('parse5');

function run(html) {
  let notify;
  const document = { querySelectorAll: () => [] };
  function adapt(source, parent) {
    const node = {
      nodeType: source.nodeName === '#text' ? 3 : 1,
      tagName: (source.tagName || '').toUpperCase(), nodeValue: source.value,
      attributes: Object.fromEntries((source.attrs || []).map(a => [a.name, a.value])),
      parentElement: parent, ownerDocument: document,
      matches(selectors) {
        return selectors.split(',').some(selector => {
          selector = selector.trim();
          if (selector === '[contenteditable]:not([contenteditable="false"])') return this.attributes.contenteditable !== undefined && this.attributes.contenteditable !== 'false';
          if (selector.startsWith('[class*=')) return (this.attributes.class || '').includes('subtitle');
          if (selector.startsWith('[')) return selector.slice(1, -1) in this.attributes;
          if (selector.startsWith('.')) return (this.attributes.class || '').split(' ').includes(selector.slice(1));
          return this.tagName === selector.toUpperCase();
        });
      },
      closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector); },
      querySelectorAll(selector) {
        return descendants(this).filter(n => n.nodeType === 1 && n.matches(selector));
      }
    };
    node.childNodes = (source.childNodes || []).map(child => adapt(child, node));
    return node;
  }
  function descendants(root) { return root.childNodes.flatMap(node => [node, ...descendants(node)]); }
  const tree = adapt(parse5.parse(html));
  document.body = descendants(tree).find(node => node.tagName === 'BODY');
  document.createTreeWalker = (root, filter) => {
    const nodes = descendants(root).filter(node => filter & (node.nodeType === 3 ? 4 : 1));
    let index = 0;
    return { nextNode: () => nodes[index++] || null };
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../site/typography-rules.js'), 'utf8'), {
    document, window: {}, Node: { ELEMENT_NODE: 1, TEXT_NODE: 3, DOCUMENT_NODE: 9 },
    NodeFilter: { SHOW_ELEMENT: 1, SHOW_TEXT: 4 },
    MutationObserver: class { constructor(callback) { notify = callback; } observe() {} }
  });
  return {
    find: id => descendants(tree).find(node => node.attributes.id === id),
    text: node => node.nodeType === 3 ? node.nodeValue : node.childNodes.map(n => n.nodeType === 3 ? n.nodeValue : descendants(n).filter(c => c.nodeType === 3).map(c => c.nodeValue).join('')).join(''),
    notify
  };
}
const page = run(`<h1 id="heading">Старший продуктовый дизайнер с опытом 6 лет</h1>
  <p id="inline">Работа и <strong>в команде</strong>, сделать <em>бы</em> лучше</p>
  <p id="english">Design for <a href="#">the people</a> and with care</p>
  <p id="break">Работа в<br>команде</p><p id="before">Работа в </p><p id="after">команде</p>
  <p id="multiline">Работа и\n    <strong>в команде</strong></p>
  <p id="dynamic">Обновляем текст</p><code id="code">а и в с не бы</code>
  <p id="editable" contenteditable>а и в с не бы</p><p id="subtitle" data-subtitle>Описание.</p>`);
assert(page.text(page.find('heading')).includes('с\u00a0опытом'));
assert.equal(page.text(page.find('inline')), 'Работа и\u00a0в\u00a0команде, сделать\u00a0бы лучше');
assert.equal(page.text(page.find('english')), 'Design for\u00a0the\u00a0people and\u00a0with\u00a0care');
assert.equal(page.text(page.find('multiline')), 'Работа и\u00a0в\u00a0команде');
assert.equal(page.text(page.find('break')), 'Работа вкоманде', 'Explicit BR remains a boundary');
assert.equal(page.text(page.find('before')), 'Работа в ');
assert.equal(page.text(page.find('code')), 'а и в с не бы');
assert.equal(page.text(page.find('editable')), 'а и в с не бы');
assert.equal(page.text(page.find('subtitle')), 'Описание');
const dynamic = page.find('dynamic').childNodes[0];
dynamic.nodeValue = 'А что если не в команде';
page.notify([{ type: 'characterData', target: dynamic }]);
assert.equal(dynamic.nodeValue, 'А\u00a0что\u00a0если\u00a0не\u00a0в\u00a0команде');
page.find('inline').childNodes[1].childNodes[0].nodeValue = 'на сайте';
page.notify([{ type: 'childList', target: page.find('inline').childNodes[1] }]);
assert.equal(page.text(page.find('inline')), 'Работа и\u00a0на\u00a0сайте, сделать\u00a0бы лучше');
// Repeated observer notifications must settle, including after locale updates.
const stable = page.text(page.find('inline'));
page.notify([{ type: 'characterData', target: page.find('inline').childNodes[0] }]);
assert.equal(page.text(page.find('inline')), stable);

// Every public page includes the shared handler, so headings, captions and
// dynamically rendered copy all receive the same rules.
const root = path.resolve(__dirname, '..');
let count = 0;
function audit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['node_modules', 'dev'].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) audit(file);
    else if (entry.name === 'index.html') {
      const source = fs.readFileSync(file, 'utf8');
      if (!source.includes('<body') || /http-equiv="refresh"/i.test(source)) continue;
      assert(source.includes('site/typography-rules.js'), path.relative(root, file));
      run(source);
      count++;
    }
  }
}
audit(root);
console.log(`Typography DOM: inline markup, dynamic text, RU/EN, explicit breaks, excluded code/editors and ${count} public pages verified.`);
