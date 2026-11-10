/* Общая типографика: неразрывные связи и пунктуация подзаголовков. */
(function () {
  var sentences = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ru', { granularity: 'sentence' }) : null;
  function subtitlePeriod(text) {
    var last = /\.(?=[»”"')\]]*\s*$)/.exec(text);
    if (!last || last.index === 0 || /[.!?…]/.test(text[last.index - 1])) return -1;
    // These dots belong to an abbreviation or initials, not sentence punctuation.
    if (/(?:\b(?:etc|vs)|(?:^|\s)(?:т\.?\s*[дпе]|др|г|ул|им|мин))\.[»”"')\]]*\s*$/iu.test(text) || /(?:^|\s)[А-ЯЁA-Z]\.[»”"')\]]*\s*$/u.test(text)) return -1;
    var segmented = text
      .replace(/\b(?:e\.g\.|i\.e\.)/gi, word => word.replace(/\./g, '\u2024'))
      .replace(/(?:^|\s)(?:т\.\s*[дпе]\.|г\.|ул\.|им\.|мин\.|др\.)/giu, word => word.replace(/\./g, '\u2024'))
      .replace(/(?:^|\s)[А-ЯЁA-Z]\.(?=\s*[А-ЯЁA-Z])/gu, word => word.replace('.', '\u2024'));
    var count = sentences ? [...sentences.segment(segmented)].filter(part => part.segment.trim()).length
      : (segmented.slice(0, last.index).match(/[.!?…](?:[»”"')\]]*\s+|(?=[А-ЯЁA-Z]))/gu) || []).length + 1;
    return count === 1 ? last.index : -1;
  }
  var SKIP = 'script, style, noscript, pre, code, textarea, input, select, option, svg, [contenteditable]:not([contenteditable="false"])';
  var SUBTITLES = '[data-subtitle], .text-subtitle, [class*="subtitle"], .collection__heading > .text-body, .project-card__caption > .text-body, .project-card__copy > .text-body, .project-slider__tooltip > .text-body, .activity-article__description';
  var PREPOSITIONS = ['без', 'безо', 'в', 'во', 'для', 'до', 'за', 'из', 'изо', 'из-за', 'из-под', 'к', 'ко', 'меж', 'между', 'на', 'над', 'надо', 'о', 'об', 'обо', 'от', 'ото', 'перед', 'передо', 'по', 'под', 'подо', 'при', 'про', 'с', 'со', 'у', 'через'];
  var CONJUNCTIONS = ['а', 'и', 'но', 'да', 'или', 'либо', 'что', 'чтоб', 'чтобы', 'если', 'хотя', 'как', 'чем', 'пока', 'будто'];
  var FORWARD_PARTICLES = ['не', 'ни', 'вот', 'вон', 'ведь', 'даже', 'лишь', 'только', 'пусть', 'пускай', 'разве', 'неужели', 'уж'];
  // Не поглощаем границу перед словом: цепочки «и в», «но не» тоже склеятся.
  // Переносы в исходном HTML — обычные пробелы; BR отделяется при обходе DOM.
  var ENGLISH_WORDS = ['a', 'an', 'the', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'to', 'with', 'as', 'and', 'or', 'but', 'nor', 'if', 'so', 'yet', 'not', 'no'];
  var HANGING_WORDS = new RegExp('(?<![\\p{L}\\p{N}_-])(' + PREPOSITIONS.concat(CONJUNCTIONS, FORWARD_PARTICLES, ENGLISH_WORDS).join('|') + ')([ \\t\\r\\n\\u00a0\\u202f]+)(?=\\S)', 'giu');
  // Постпозитивные частицы относятся к предыдущему слову: «сделать бы», «так же».
  var BACKWARD_PARTICLES = /(?<=[\p{L}\p{N}»”")])([ \t\r\n\u00a0\u202f]+)(бы|б|же|ж|ли|ль)(?![\p{L}\p{N}_-])/giu;

  function boundCharacters(text) {
    // Retain original offsets when mapping edits across inline tags. Collapsed
    // source indentation must become one NBSP, rather than a row of NBSPs.
    var characters = text.split('');
    function glue(start, length) {
      characters[start] = '\u00a0';
      for (var i = start + 1; i < start + length; i++) characters[i] = '';
    }
    text.replace(HANGING_WORDS, function (_, word, spaces, offset) { glue(offset + word.length, spaces.length); return _; });
    text.replace(BACKWARD_PARTICLES, function (_, spaces, word, offset) { glue(offset, spaces.length); return _; });
    return characters;
  }
  function keepWordsTogether(text) { return boundCharacters(text).join(''); }
  if (typeof module !== 'undefined' && module.exports) module.exports = { subtitlePeriod, keepWordsTogether };
  if (typeof window !== 'undefined') window.siteTypography = { keepWordsTogether };
  if (typeof document === 'undefined') return;

  var BOUNDARIES = 'address, article, aside, blockquote, body, button, caption, dd, details, dialog, div, dl, dt, fieldset, figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, header, hr, iframe, legend, li, main, nav, ol, p, section, summary, table, tbody, td, th, thead, tr, ul';
  function fixBindings(root) {
    var nodes = [];
    function flush() {
      var text = nodes.map(node => node.nodeValue).join('');
      var fixed = boundCharacters(text), offset = 0;
      nodes.forEach(function (node) {
        var next = fixed.slice(offset, offset + node.nodeValue.length).join('');
        offset += node.nodeValue.length;
        if (next !== node.nodeValue) node.nodeValue = next;
      });
      nodes = [];
    }
    function visit(node) {
      if (node.nodeType === Node.TEXT_NODE) { nodes.push(node); return; }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.matches(SKIP)) { flush(); return; }
      var boundary = node.matches(BOUNDARIES) || node.tagName === 'BR';
      if (boundary) flush();
      Array.from(node.childNodes).forEach(visit);
      if (boundary) flush();
    }
    visit(root);
    flush();
  }

  function fixSubtitle(element) {
    if (element.closest(SKIP)) return;
    var walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var text = '', nodes = [], node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') text += '\n';
      else if (node.nodeType === Node.TEXT_NODE && !node.parentElement.closest(SKIP)) {
        nodes.push({ node: node, start: text.length });
        text += node.nodeValue;
      }
    }
    var index = subtitlePeriod(text);
    if (index < 0) return;
    var part = nodes.find(part => index >= part.start && index < part.start + part.node.nodeValue.length);
    if (!part) return;
    var offset = index - part.start;
    part.node.nodeValue = part.node.nodeValue.slice(0, offset) + part.node.nodeValue.slice(offset + 1);
  }

  function fixSubtitles(root) {
    var element = root.nodeType === Node.TEXT_NODE ? root.parentElement : root;
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    var parent = element.closest(SUBTITLES);
    if (parent) fixSubtitle(parent);
    element.querySelectorAll(SUBTITLES).forEach(fixSubtitle);
  }

  function fixSubtree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) root = root.parentElement;
    if (root && root.nodeType === Node.DOCUMENT_NODE) root = root.body;
    if (!root || root.closest(SKIP)) return;
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    fixBindings(root);
    fixSubtitles(root);
  }

  function watchDocument(doc) {
    if (!doc || !doc.body || doc.__hangingPrepositionsReady) return;
    doc.__hangingPrepositionsReady = true;
    fixSubtree(doc.body);
    new MutationObserver(function (mutations) {
      var roots = new Set();
      mutations.forEach(function (mutation) {
        var element = mutation.target.nodeType === Node.TEXT_NODE ? mutation.target.parentElement : mutation.target;
        if (element && !element.closest(SKIP)) roots.add(element.closest(BOUNDARIES) || element);
      });
      roots.forEach(fixSubtree);
    }).observe(doc.body, { childList: true, characterData: true, subtree: true });
  }

  function watchFrame(frame) {
    function connect() {
      try {
        watchDocument(frame.contentDocument);
      } catch (error) {
        /* Внешние iframe недоступны по same-origin policy. */
      }
    }
    frame.addEventListener('load', connect);
    connect();
  }

  watchDocument(document);
  document.querySelectorAll('iframe').forEach(watchFrame);
})();
