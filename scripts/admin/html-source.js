'use strict';
/*
  Правка HTML-страниц по позициям в исходнике. Файл меняется только в
  затронутом месте: отступы, комментарии и остальная разметка остаются как
  написаны руками. Элементы нумеруются по порядку в документе (adminId);
  номер действителен только для той версии файла, с которой его получили.
*/
const crypto = require('node:crypto');
const path = require('node:path');
const { parse, parseFragment } = require('parse5');

const INLINE = new Set(['a', 'abbr', 'b', 'br', 'code', 'em', 'i', 'mark', 's', 'small', 'span', 'strong', 'sub', 'sup', 'u', 'time', 'nobr', 'wbr']);
const ALLOWED_INLINE = { strong: [], em: [], b: [], i: [], br: [], span: ['class'], a: ['href', 'target', 'rel', 'class'], sup: [], sub: [], s: [], u: [], nobr: [] };
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const NOT_TEXT = new Set(['script', 'style', 'template', 'svg', 'noscript', 'textarea', 'select', 'option', 'button', 'video', 'picture', 'img', 'iframe']);
// Контейнеры, чьи прямые потомки — равноправные пункты: их можно
// переставлять, дублировать и удалять по одному.
const ITEM_PARENTS = ['cg-intro__text', 'cg-text', 'cg-list', 'cg-gallery', 'cg-stage', 'cg-meta', 'works-grid', 'playground-grid'];
const PALETTE = ['--case-surface', '--case-accent', '--case-accent-text', '--case-icon', '--case-icon-ink', '--case-icon-2', '--case-icon-2-ink'];

const version = source => crypto.createHash('sha1').update(source).digest('hex').slice(0, 12);
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
const classes = node => (attr(node, 'class') || '').split(/\s+/).filter(Boolean);
const hasClass = (node, name) => classes(node).includes(name);
const located = node => node.tagName && node.sourceCodeLocation;
const elements = node => (node.childNodes || []).filter(located);
const escapeText = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = value => escapeText(value).replace(/"/g, '&quot;');

function textOf(node) {
  if (node.nodeName === '#text') return node.value;
  if (node.tagName === 'script' || node.tagName === 'style') return '';
  return (node.childNodes || []).map(textOf).join('');
}
const cleanText = node => textOf(node).replace(/\s+/g, ' ').trim();

function closest(node, test) {
  for (let current = node; current && current.nodeName !== '#document'; current = current.parentNode) {
    if (current.tagName && test(current)) return current;
  }
  return null;
}

function load(source) {
  const document = parse(source, { sourceCodeLocationInfo: true });
  const nodes = [];
  (function walk(node) {
    for (const child of node.childNodes || []) {
      if (child.tagName) { child.adminId = nodes.length; nodes.push(child); }
      walk(child);
    }
  })(document);
  const model = { source, document, nodes, version: version(source) };
  model.blocksRoot = nodes.find(node => hasClass(node, 'case__blocks')) || nodes.find(node => node.tagName === 'main') || null;
  return model;
}

function node(model, id) {
  const found = model.nodes[Number(id)];
  if (!found || !located(found)) throw Error('Элемент не найден: обновите страницу');
  return found;
}

const isBlock = (model, element) => !!model.blocksRoot && element.parentNode === model.blocksRoot && !!located(element);
function isItem(model, element) {
  if (!located(element) || !model.blocksRoot) return false;
  const parent = element.parentNode;
  if (!parent || !parent.tagName || !closest(parent, candidate => candidate === model.blocksRoot)) return false;
  if (isBlock(model, parent)) return true;
  if (['ul', 'ol', 'dl'].includes(parent.tagName)) return true;
  return ITEM_PARENTS.some(name => hasClass(parent, name));
}
function inlineOnly(element) {
  return (element.childNodes || []).every(child => !child.tagName || (INLINE.has(child.tagName) && !hasClass(child, 'btn') && inlineOnly(child)));
}
function isText(model, element) {
  if (!element.sourceCodeLocation?.endTag || NOT_TEXT.has(element.tagName) || INLINE.has(element.tagName) && element.tagName !== 'span') return false;
  if (!closest(element, candidate => candidate.tagName === 'main')) return false;
  if (hasClass(element, 'btn') || hasClass(element, 'icon')) return false;
  if (!inlineOnly(element) || !cleanText(element)) return false;
  // Текстом считается внешний подходящий элемент; вложенные span — его часть.
  const parent = element.parentNode;
  return !(parent && parent.tagName && isText(model, parent));
}

/* ─── Диапазоны в исходнике ─────────────────────────────────────────── */

function lineStart(source, index) {
  while (index > 0 && source[index - 1] !== '\n') index--;
  return index;
}
const spaceBefore = (source, index) => /^[ \t]*$/.test(source.slice(lineStart(source, index), index));
function lineEnd(source, index) {
  while (source[index] === ' ' || source[index] === '\t' || source[index] === '\r') index++;
  if (source[index] === '\n') return index + 1;
  return index >= source.length ? index : -1;
}
function previousSibling(element) {
  const siblings = element.parentNode?.childNodes || [];
  return siblings[siblings.indexOf(element) - 1] || null;
}

// Комментарий прямо над элементом (без пустой строки между ними) описывает
// его и переезжает вместе с ним.
function coreStart(element) {
  let start = element.sourceCodeLocation.startOffset;
  for (let previous = previousSibling(element); previous; previous = previousSibling(previous)) {
    if (previous.nodeName === '#text' && /^\s*$/.test(previous.value) && (previous.value.match(/\n/g) || []).length <= 1) continue;
    if (previous.nodeName === '#comment' && previous.sourceCodeLocation) { start = previous.sourceCodeLocation.startOffset; continue; }
    break;
  }
  return start;
}

function outerRange(source, element) {
  const core = { start: coreStart(element), end: element.sourceCodeLocation.endOffset };
  if (spaceBefore(source, core.start)) {
    const end = lineEnd(source, core.end);
    if (end >= 0) {
      const start = lineStart(source, core.start);
      return { start, end, lines: true, core, indent: source.slice(start, core.start) };
    }
  }
  return { start: core.start, end: core.end, lines: false, core, indent: '' };
}

const blankLineAt = (source, index) => {
  const end = source.indexOf('\n', index);
  return end >= 0 && /^[ \t\r]*$/.test(source.slice(index, end));
};
const blankLineBefore = (source, index) => index > 0 && /^[ \t\r]*$/.test(source.slice(lineStart(source, index - 1), index - 1));

function removalRange(source, element) {
  const range = outerRange(source, element);
  let { start, end } = range;
  // Не оставлять двойную пустую строку на месте убранного блока.
  if (range.lines && blankLineBefore(source, start) && blankLineAt(source, end)) end = source.indexOf('\n', end) + 1;
  return { start, end, range };
}

// Отделены ли соседние элементы контейнера пустой строкой — так же
// разделяется и вставленный элемент.
function separated(source, parent) {
  const kids = elements(parent);
  for (let i = 1; i < kids.length; i++) {
    if (/\n[ \t\r]*\n/.test(source.slice(kids[i - 1].sourceCodeLocation.endOffset, coreStart(kids[i])))) return true;
  }
  return false;
}

function reindent(text, indent) {
  const lines = text.replace(/\s+$/, '').split('\n');
  const widths = lines.filter(line => line.trim()).map(line => line.match(/^[ \t]*/)[0].length);
  const common = widths.length ? Math.min(...widths) : 0;
  return lines.map(line => line.trim() ? indent + line.slice(common) : '').join('\n') + '\n';
}

function insertionEdit(source, target, where, text, sep) {
  const range = outerRange(source, target);
  if (range.lines) {
    const block = reindent(text, range.indent);
    return where === 'before'
      ? { start: range.start, end: range.start, text: block + (sep ? '\n' : '') }
      : { start: range.end, end: range.end, text: (sep ? '\n' : '') + block };
  }
  const inline = text.trim();
  return where === 'before'
    ? { start: range.core.start, end: range.core.start, text: inline }
    : { start: range.core.end, end: range.core.end, text: inline };
}

function appendEdit(source, parent, where, text) {
  const kids = elements(parent);
  const sep = separated(source, parent);
  if (kids.length) return insertionEdit(source, where === 'prepend' ? kids[0] : kids[kids.length - 1], where === 'prepend' ? 'before' : 'after', text, sep);
  const location = parent.sourceCodeLocation;
  if (!location.endTag) throw Error('В этот элемент нельзя вставить содержимое');
  const close = location.endTag.startOffset;
  if (spaceBefore(source, close) && source.slice(location.startTag.endOffset, close).includes('\n')) {
    const parentIndent = outerRange(source, parent).indent;
    return { start: lineStart(source, close), end: lineStart(source, close), text: reindent(text, parentIndent + '  ') };
  }
  return { start: close, end: close, text: text.trim() };
}

function splice(source, edits) {
  const sorted = [...edits].sort((a, b) => b.start - a.start || b.end - a.end);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].end > sorted[i - 1].start && !(sorted[i].start === sorted[i - 1].start)) throw Error('Пересекающиеся правки');
  }
  for (const edit of sorted) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  return source;
}

/* ─── Атрибуты ──────────────────────────────────────────────────────── */

function tagEndInsert(source, element) {
  const end = element.sourceCodeLocation.startTag.endOffset;
  let index = source[end - 2] === '/' ? end - 2 : end - 1;
  while (index > 0 && /\s/.test(source[index - 1])) index--;
  return index;
}

function attrEdits(source, element, changes) {
  const location = element.sourceCodeLocation.startTag.attrs || element.sourceCodeLocation.attrs || {};
  const edits = [];
  let added = '';
  for (const [name, value] of Object.entries(changes)) {
    const at = location[name];
    const written = value === true ? name : `${name}="${escapeAttr(value)}"`;
    if (at) {
      if (value === null || value === undefined || value === false) {
        let start = at.startOffset;
        while (start > 0 && /[ \t]/.test(source[start - 1])) start--;
        edits.push({ start, end: at.endOffset, text: '' });
      } else edits.push({ start: at.startOffset, end: at.endOffset, text: written });
    } else if (value !== null && value !== undefined && value !== false) added += ' ' + written;
  }
  if (added) {
    const at = tagEndInsert(source, element);
    edits.push({ start: at, end: at, text: added });
  }
  return edits;
}

/* ─── Безопасный строчный HTML из редактора ─────────────────────────── */

function sanitizeInline(html) {
  const fragment = parseFragment(String(html));
  function write(nodeItem) {
    if (nodeItem.nodeName === '#text') return escapeText(nodeItem.value);
    if (!nodeItem.tagName) return '';
    const inner = (nodeItem.childNodes || []).map(write).join('');
    // ⌘B и ⌘I в редакторе дают <b>/<i>; на сайте приняты <strong>/<em>.
    const tag = { b: 'strong', i: 'em' }[nodeItem.tagName] || nodeItem.tagName;
    const allowed = ALLOWED_INLINE[tag];
    if (!allowed) return ['div', 'p', 'li'].includes(nodeItem.tagName) && inner ? ' ' + inner : inner;
    const attrs = nodeItem.attrs.filter(item => allowed.includes(item.name) && !/^\s*javascript:/i.test(item.value))
      .map(item => ` ${item.name}="${escapeAttr(item.value)}"`).join('');
    if (tag === 'br') return '<br />';
    if (tag === 'span' && !attrs) return inner;
    return `<${tag}${attrs}>${inner}</${tag}>`;
  }
  return fragment.childNodes.map(write).join('')
    // Артефакты contenteditable: двойные и концевые неразрывные пробелы.
    .replace(/(?:[ \t\n]| |&nbsp;){2,}/g, ' ')
    .replace(/^(?:\s| |&nbsp;)+|(?:\s| |&nbsp;)+$/g, '')
    .replace(/(?:<br \/>\s*)+$/, '');
}

/* ─── Описание страницы для админки ─────────────────────────────────── */

function annotate(model, inject) {
  const { source } = model;
  const edits = [];
  for (const element of model.nodes) {
    if (!located(element) || !closest(element, candidate => candidate.tagName === 'body') || element.tagName === 'body') continue;
    let marks = ` data-admin-id="${element.adminId}"`;
    if (isBlock(model, element)) marks += ' data-admin-block';
    if (isItem(model, element)) marks += ' data-admin-item';
    if (isText(model, element)) marks += ' data-admin-text';
    const at = tagEndInsert(source, element);
    edits.push({ start: at, end: at, text: marks });
  }
  const head = model.nodes.find(element => element.tagName === 'head')?.sourceCodeLocation?.endTag;
  const body = model.nodes.find(element => element.tagName === 'body')?.sourceCodeLocation?.endTag;
  if (head) edits.push({ start: head.startOffset, end: head.startOffset, text: inject.head });
  if (body) edits.push({ start: body.startOffset, end: body.startOffset, text: inject.body });
  else edits.push({ start: source.length, end: source.length, text: inject.body });
  return splice(source, edits);
}

function blockKind(element) {
  if (hasClass(element, 'cg-gallery')) return 'gallery';
  if (attr(element, 'id') === 'summary' || hasClass(element, 'case-cover')) return 'summary';
  return element.tagName === 'section' ? 'section' : 'other';
}

function tocLabels(model) {
  const labels = {};
  const panel = model.nodes.find(element => hasClass(element, 'work-toc__panel'));
  if (!panel) return null;
  for (const link of model.nodes.filter(element => element.tagName === 'a' && closest(element, candidate => candidate === panel))) {
    const href = attr(link, 'href') || '';
    if (href.startsWith('#')) labels[href.slice(1)] = cleanText(link);
  }
  return labels;
}

function outline(model) {
  if (!model.blocksRoot) return [];
  const labels = tocLabels(model) || {};
  return elements(model.blocksRoot).map(element => {
    const heading = model.nodes.find(candidate => /^h[1-3]$/.test(candidate.tagName) && closest(candidate, parent => parent === element));
    const htmlId = attr(element, 'id') || '';
    const kind = blockKind(element);
    return {
      id: element.adminId, htmlId, kind,
      label: heading ? cleanText(heading) : kind === 'gallery' ? 'Галерея' : element.tagName,
      tocLabel: htmlId ? labels[htmlId] || '' : ''
    };
  });
}

function pageInfo(model) {
  const title = model.nodes.find(element => element.tagName === 'title');
  const description = model.nodes.find(element => element.tagName === 'meta' && attr(element, 'name') === 'description');
  const style = model.nodes.find(element => element.tagName === 'style');
  const palette = {};
  const css = style ? model.source.slice(style.sourceCodeLocation.startTag.endOffset, style.sourceCodeLocation.endTag.startOffset) : '';
  for (const token of PALETTE) {
    const match = css.match(new RegExp(token.replace(/-/g, '\\-') + '\\s*:\\s*([^;]+);'));
    palette[token] = match ? match[1].trim() : '';
  }
  return {
    version: model.version,
    title: title ? cleanText(title) : '',
    description: description ? attr(description, 'content') || '' : '',
    palette,
    hasPalette: !!style,
    hasToc: !!tocLabels(model),
    isGrid: model.nodes.some(element => hasClass(element, 'case--grid')),
    canBlocks: !!model.blocksRoot,
    stubs: model.nodes.filter(element => hasClass(element, 'cg-stub')).length,
    outline: outline(model)
  };
}

function describe(model, id) {
  const element = node(model, id);
  const location = element.sourceCodeLocation;
  const chain = [];
  for (let current = element; current && current.tagName && current !== model.blocksRoot; current = current.parentNode) {
    if (!located(current)) continue;
    const kind = isBlock(model, current) ? 'block' : isItem(model, current) ? 'item' : isText(model, current) ? 'text' : '';
    if (kind || current === element) chain.push({ id: current.adminId, tag: current.tagName, classes: classes(current), kind, htmlId: attr(current, 'id') || '' });
  }
  const link = closest(element, candidate => candidate.tagName === 'a');
  const media = [];
  const holder = closest(element, candidate => candidate.tagName === 'picture' || candidate.tagName === 'video') || element;
  (function collect(current) {
    if (['img', 'source', 'video'].includes(current.tagName) && located(current)) {
      media.push({ id: current.adminId, tag: current.tagName, attrs: Object.fromEntries(current.attrs.map(item => [item.name, item.value])) });
    }
    (current.childNodes || []).forEach(collect);
  })(holder);
  return {
    id: element.adminId,
    tag: element.tagName,
    classes: classes(element),
    attrs: Object.fromEntries(element.attrs.map(item => [item.name, item.value])),
    inner: location.endTag ? model.source.slice(location.startTag.endOffset, location.endTag.startOffset) : null,
    text: cleanText(element),
    chain,
    link: link && located(link) ? { id: link.adminId, href: attr(link, 'href') || '', target: attr(link, 'target') || '', text: cleanText(link) } : null,
    media,
    stub: hasClass(element, 'cg-stub') ? { fill: attr(element, 'data-fill') || 'media', style: attr(element, 'style') || '', cover: attr(element, 'data-cover') !== undefined } : null
  };
}

/* ─── Операции ──────────────────────────────────────────────────────── */

function uniqueIds(model, text) {
  const taken = new Set(model.nodes.map(element => attr(element, 'id')).filter(Boolean));
  return text.replace(/\bid="([^"]+)"/g, (match, id) => {
    let index = 2;
    while (taken.has(`${id}-${index}`)) index++;
    taken.add(`${id}-${index}`);
    return `id="${id}-${index}"`;
  });
}

function slugify(value) {
  const map = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
  return String(value).toLowerCase().split('').map(char => map[char] ?? char).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}

// Новый id секции по заголовку, если в шаблоне стоит заготовка id="new-block".
function nameBlocks(model, text) {
  const taken = new Set(model.nodes.map(element => attr(element, 'id')).filter(Boolean));
  return text.replace(/\bid="new-block"/g, () => {
    const heading = (text.match(/<h2[^>]*>([^<]+)</) || [])[1] || 'block';
    let base = slugify(heading) || 'block', id = base, index = 2;
    while (taken.has(id)) id = `${base}-${index++}`;
    taken.add(id);
    return `id="${id}"`;
  });
}

function media(kind, file) {
  const size = file.width && file.height ? ` width="${file.width}" height="${file.height}"` : '';
  if (kind === 'video') return `<video src="${escapeAttr(file.url)}"${size} muted loop playsinline autoplay preload="metadata" aria-label="${escapeAttr(file.alt || '')}"></video>`;
  return `<img src="${escapeAttr(file.url)}"${size} alt="${escapeAttr(file.alt || '')}" loading="lazy" />`;
}

function fillStub(model, element, file) {
  const fill = attr(element, 'data-fill') || 'media';
  const extra = classes(element).filter(name => name !== 'cg-stub').join(' ');
  const kind = /\.(mp4|webm|mov)$/i.test(file.url) ? 'video' : 'image';
  let html = media(kind, file);
  if (fill === 'media') html = `<div class="case-cover__media case-cover__media--natural${extra ? ' ' + extra : ''}">${html}</div>`;
  else if (fill === 'photo') html = `<picture>${html}</picture>`;
  const location = element.sourceCodeLocation;
  return [{ start: location.startOffset, end: location.endOffset, text: html }];
}

function setInner(model, element, html) {
  const location = element.sourceCodeLocation;
  if (!location.endTag) throw Error('У элемента нет текста');
  return [{ start: location.startTag.endOffset, end: location.endTag.startOffset, text: html }];
}

function moveEdits(model, element, target, where) {
  const { source } = model;
  if (closest(target, candidate => candidate === element)) throw Error('Нельзя переместить блок внутрь себя');
  const removal = removalRange(source, element);
  const text = removal.range.lines ? source.slice(removal.range.start, removal.range.end) : source.slice(removal.range.core.start, removal.range.core.end);
  const insert = insertionEdit(source, target, where, text, separated(source, target.parentNode));
  if (insert.start > removal.start && insert.start < removal.end) throw Error('Нельзя переместить блок внутрь себя');
  return [{ start: removal.start, end: removal.end, text: '' }, insert];
}

function siblingOf(element, step) {
  const kids = elements(element.parentNode);
  return kids[kids.indexOf(element) + step] || null;
}

function apply(source, op) {
  const model = load(source);
  if (op.version && op.version !== model.version) {
    const error = Error('Файл изменился — страница обновится');
    error.status = 409;
    throw error;
  }
  const element = op.id === undefined || op.id === null ? null : node(model, op.id);
  let edits;
  let structural = false;
  let inserted = null;
  switch (op.type) {
    case 'setInner': {
      const clean = sanitizeInline(op.html);
      const next = splice(source, setInner(model, element, clean));
      return { source: renameSection(model, element, next, clean), changed: next !== source };
    }
    case 'setAttrs':
      edits = attrEdits(source, element, op.attrs);
      break;
    case 'setMedia': {
      const changes = { [op.attr]: op.url };
      const location = element.sourceCodeLocation.startTag.attrs || {};
      if (op.attr !== 'poster' && op.width && op.height && (location.width || ['img', 'video'].includes(element.tagName))) {
        changes.width = String(op.width);
        changes.height = String(op.height);
      }
      edits = attrEdits(source, element, changes);
      break;
    }
    case 'fillStub':
      edits = fillStub(model, element, op);
      break;
    case 'swapMedia': {
      // Картинка ↔ видео: новый элемент на том же месте, описание сохраняется.
      const kind = /\.(mp4|webm|mov)$/i.test(op.url) ? 'video' : 'image';
      const alt = attr(element, 'alt') || attr(element, 'aria-label') || '';
      const location = element.sourceCodeLocation;
      edits = [{ start: location.startOffset, end: location.endOffset, text: media(kind, { url: op.url, width: op.width, height: op.height, alt }) }];
      break;
    }
    case 'remove': {
      const removal = removalRange(source, element);
      edits = [{ start: removal.start, end: removal.end, text: '' }];
      structural = true;
      break;
    }
    case 'duplicate': {
      const range = outerRange(source, element);
      const text = uniqueIds(model, range.lines ? source.slice(range.start, range.end) : source.slice(range.core.start, range.core.end));
      edits = [insertionEdit(source, element, 'after', text, separated(source, element.parentNode))];
      structural = true;
      break;
    }
    case 'moveUp':
    case 'moveDown': {
      const target = siblingOf(element, op.type === 'moveUp' ? -1 : 1);
      if (!target) return { source, changed: false };
      edits = moveEdits(model, element, target, op.type === 'moveUp' ? 'before' : 'after');
      structural = true;
      break;
    }
    case 'move':
      edits = moveEdits(model, element, node(model, op.target), op.where === 'before' ? 'before' : 'after');
      structural = true;
      break;
    case 'insert': {
      const html = nameBlocks(model, String(op.html));
      inserted = (html.match(/^\s*<section\b[^>]*\bid="([^"]+)"/) || [])[1] || null;
      if (element) {
        edits = [['append', 'prepend'].includes(op.where) ? appendEdit(source, element, op.where, html)
          : insertionEdit(source, element, op.where === 'before' ? 'before' : 'after', html, separated(source, element.parentNode))];
      } else {
        if (!model.blocksRoot) throw Error('На странице нет места для блоков');
        edits = [appendEdit(source, model.blocksRoot, 'append', html)];
      }
      structural = true;
      break;
    }
    case 'setMeta':
      edits = metaEdits(model, op);
      break;
    case 'setPalette':
      return { source: setPalette(source, op.palette), changed: true };
    case 'setTocLabel':
      return { source: syncToc(source, { [op.htmlId]: op.label }), changed: true };
    default:
      throw Error('Неизвестная операция: ' + op.type);
  }
  let next = splice(source, edits);
  if (structural) next = syncToc(next);
  return { source: next, changed: next !== source, inserted };
}

// Заголовок раздела переименован, а id секции был сделан из прежнего
// заголовка (новый блок из библиотеки) — id и пункт оглавления идут за ним.
function renameSection(model, heading, source, html) {
  if (heading.tagName !== 'h2') return source;
  const section = closest(heading, candidate => isBlock(model, candidate));
  const id = section && attr(section, 'id');
  if (!id || slugify(cleanText(heading)) !== id) return source;
  const text = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  const base = slugify(text);
  if (!base || base === id) return source;
  const taken = new Set(model.nodes.map(element => attr(element, 'id')).filter(Boolean));
  let next = base;
  for (let index = 2; taken.has(next); index++) next = `${base}-${index}`;
  const labels = tocLabels(model) || {};
  const renamed = source.split(`id="${id}"`).join(`id="${next}"`)
    .split(`href="#${id}"`).join(`href="#${next}"`)
    .split(`data-toc-marker="${id}"`).join(`data-toc-marker="${next}"`);
  return labels[id] === undefined || labels[id] === cleanText(heading) ? syncToc(renamed, { [next]: text }) : renamed;
}

function metaEdits(model, op) {
  const edits = [];
  const title = model.nodes.find(element => element.tagName === 'title');
  if (op.title !== undefined && title) edits.push(...setInner(model, title, escapeText(op.title)));
  for (const element of model.nodes.filter(item => item.tagName === 'meta')) {
    const key = attr(element, 'name') || attr(element, 'property');
    const value = { description: op.description, 'og:title': op.title, 'og:description': op.description, 'twitter:title': op.title, 'twitter:description': op.description }[key];
    if (value !== undefined) edits.push(...attrEdits(model.source, element, { content: value }));
  }
  return edits;
}

function setPalette(source, palette) {
  const model = load(source);
  const style = model.nodes.find(element => element.tagName === 'style');
  if (!style) throw Error('На странице нет своего блока стилей');
  const location = style.sourceCodeLocation;
  let css = source.slice(location.startTag.endOffset, location.endTag.startOffset);
  let root = css.match(/:root\s*\{[^}]*\}/);
  if (!root) {
    css = css.replace(/\s*$/, '\n\n:root {\n}\n');
    root = css.match(/:root\s*\{[^}]*\}/);
  }
  let block = root[0];
  for (const [token, value] of Object.entries(palette)) {
    if (!PALETTE.includes(token)) continue;
    const line = new RegExp('\\n[ \\t]*' + token.replace(/-/g, '\\-') + '\\s*:[^;]*;');
    const clean = String(value || '').replace(/[;{}]/g, '').trim();
    if (line.test(block)) block = block.replace(line, clean ? match => match.replace(/:[^;]*;/, `: ${clean};`) : '');
    else if (clean) block = block.replace(/\n?\}$/, `\n  ${token}: ${clean};\n}`);
  }
  css = css.replace(root[0], block);
  return source.slice(0, location.startTag.endOffset) + css + source.slice(location.endTag.startOffset);
}

/* Оглавление кейса (components/case-toc) повторяет порядок секций с id:
   маркеры на кнопке и ссылки в панели. Подписи существующих пунктов
   сохраняются, у новых секций берутся из заголовка. */
function syncToc(source, overrides = {}) {
  const model = load(source);
  const bars = model.nodes.find(element => hasClass(element, 'work-toc__bars'));
  const panel = model.nodes.find(element => hasClass(element, 'work-toc__panel'));
  const nav = panel && model.nodes.find(element => element.tagName === 'nav' && closest(element, candidate => candidate === panel));
  if (!bars || !nav || !model.blocksRoot) return source;
  const labels = tocLabels(model);
  const sections = elements(model.blocksRoot).filter(element => element.tagName === 'section' && attr(element, 'id'));
  const links = elements(nav);
  const linkClass = links[0] ? attr(links[0], 'class') : 'btn btn--fill-toc';
  const navRange = outerRange(source, nav);
  const indent = links[0] ? outerRange(source, links[0]).indent || navRange.indent + '  ' : navRange.indent + '  ';
  const label = section => {
    const id = attr(section, 'id');
    if (overrides[id] !== undefined) return overrides[id];
    if (labels[id]) return labels[id];
    const heading = model.nodes.find(candidate => /^h[1-3]$/.test(candidate.tagName) && closest(candidate, parent => parent === section));
    return heading ? cleanText(heading) : id;
  };
  const barsHtml = sections.map(section => `<span data-toc-marker="${attr(section, 'id')}"></span>`).join('');
  const navHtml = '\n' + sections.map(section => `${indent}<a class="${linkClass}" href="#${attr(section, 'id')}"><span>${escapeText(label(section))}</span></a>`).join('\n') + '\n' + navRange.indent;
  const barsLocation = bars.sourceCodeLocation;
  const navLocation = nav.sourceCodeLocation;
  return splice(source, [
    { start: barsLocation.startTag.endOffset, end: barsLocation.endTag.startOffset, text: barsHtml },
    { start: navLocation.startTag.endOffset, end: navLocation.endTag.startOffset, text: navHtml }
  ]);
}

/* Новая страница кейса: шапка, подвал, стили и скрипты берутся из
   существующего кейса на сетке, содержимое — одна секция «Саммари». */
function scaffoldCase(templateSource, templateFile, { title, description, summary }) {
  const dir = path.posix.dirname(templateFile);
  // Относительные пути шаблона → от корня, чтобы страница работала на любой глубине.
  let source = templateSource.replace(/\b(src|href)="((?:\.\.\/)+[^"]*)"/g, (match, name, value) => `${name}="/${path.posix.normalize(path.posix.join(dir, value))}"`);
  const fresh = load(source);
  const inner = fresh.blocksRoot.sourceCodeLocation;
  source = source.slice(0, inner.startTag.endOffset) + '\n\n' + reindent(summary, outerRange(source, fresh.blocksRoot).indent + '  ') + '\n    ' + source.slice(inner.endTag.startOffset);
  source = setPalette(source, Object.fromEntries(PALETTE.map(token => [token, ''])));
  source = source.replace(/\n[ \t]*\/\*\s*Палитра кейса[\s\S]*?\*\/\s*?(?=\n)/, '')
    .replace(/(:root\s*\{[^}]*?)\n\s*\n(\s*\})/, '$1\n$2');
  source = splice(source, metaEdits(load(source), { title, description }));
  return syncToc(source);
}

module.exports = {
  load, annotate, apply, describe, outline, pageInfo, syncToc, sanitizeInline, scaffoldCase, slugify, version,
  attr, classes, hasClass, elements, cleanText, PALETTE
};
