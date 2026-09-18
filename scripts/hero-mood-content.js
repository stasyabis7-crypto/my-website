'use strict';

// Only page heading/copy are content slots. Tags, attributes, controls and
// character markup remain part of the frozen component contract.
const slots = [['h1', 'mood-title'], ['p', 'mood-subtitle'], ['a', 'mood-primary']];

function mapSlots(html, transform) {
  for (const [tag, className] of slots) {
    let count = 0;
    const pattern = new RegExp(`(<${tag}\\b[^>]*\\bclass="[^"]*\\b${className}\\b[^"]*"[^>]*>)([\\s\\S]*?)(<\\/${tag}>)`, 'g');
    html = html.replace(pattern, (_, open, content, close) => {
      count++;
      return open + transform(content, className) + close;
    });
    if (count !== 1) throw new Error(`Ожидается один текстовый слот ${className}, найдено: ${count}`);
  }
  return html;
}

function structure(html) {
  html = mapSlots(html, content => content.replace(/(^|>)[^<]+/g, '$1'));
  return mapAction(html, action => action
    .replace(/\s+(href|target|rel)="[^"]*"/g, '')
    .replace(/\bicon--(?:down|arrow-diagonal)\b/g, 'icon--action')).trimEnd();
}

function preserveContent(template, current) {
  const content = new Map();
  mapSlots(current, (value, slot) => { content.set(slot, value); return value; });
  let action;
  mapAction(current, value => { action = value; return value; });
  return mapAction(mapSlots(template, (_, slot) => content.get(slot)), () => action);
}

function mapAction(html, transform) {
  return html.replace(/<a\b[^>]*\bclass="[^"]*\bmood-primary\b[^"]*"[^>]*>[\s\S]*?<\/a>/g, transform);
}

module.exports = { structure, preserveContent };
