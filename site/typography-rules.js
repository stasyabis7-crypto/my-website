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
  if (typeof module !== 'undefined' && module.exports) module.exports = { subtitlePeriod };
  if (typeof document === 'undefined') return;

  var SKIP = 'script, style, pre, code, textarea, input, select, option, [contenteditable]:not([contenteditable="false"])';
  var SUBTITLES = '[data-subtitle], .text-subtitle, [class*="subtitle"], .collection__heading > .text-body, .project-card__caption > .text-body, .project-card__copy > .text-body, .project-slider__tooltip > .text-body, .work-gallery__caption > .text-body, .activity-article__description';
  var PREPOSITIONS = ['без', 'безо', 'в', 'во', 'для', 'до', 'за', 'из', 'изо', 'из-за', 'из-под', 'к', 'ко', 'меж', 'между', 'на', 'над', 'надо', 'о', 'об', 'обо', 'от', 'ото', 'перед', 'передо', 'по', 'под', 'подо', 'при', 'про', 'с', 'со', 'у', 'через'];
  var CONJUNCTIONS = ['а', 'и', 'но', 'да', 'или', 'либо', 'что', 'чтоб', 'чтобы', 'если', 'хотя', 'как', 'чем', 'пока', 'будто'];
  var FORWARD_PARTICLES = ['не', 'ни', 'вот', 'вон', 'ведь', 'даже', 'лишь', 'только', 'пусть', 'пускай', 'разве', 'неужели', 'уж'];
  // Не поглощаем границу перед словом: цепочки «и в», «но не» тоже склеятся.
  // Горизонтальные пробелы сохраняют явные переводы строк.
  var HANGING_WORDS = new RegExp('(?<![\\p{L}\\p{N}_-])(' + PREPOSITIONS.concat(CONJUNCTIONS, FORWARD_PARTICLES).join('|') + ')[ \\t\\u00a0]+(?=\\S)', 'giu');
  // Постпозитивные частицы относятся к предыдущему слову: «сделать бы», «так же».
  var BACKWARD_PARTICLES = /(?<=[\p{L}\p{N}»”")])[ \t\u00a0]+(бы|б|же|ж|ли|ль)(?![\p{L}\p{N}_-])/giu;

  function fixTextNode(node) {
    if (!node.nodeValue || !node.parentElement || node.parentElement.closest(SKIP)) return;
    var fixed = node.nodeValue.replace(HANGING_WORDS, '$1\u00a0').replace(BACKWARD_PARTICLES, '\u00a0$1');
    if (fixed !== node.nodeValue) node.nodeValue = fixed;
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
    if (root.nodeType === Node.TEXT_NODE) {
      fixTextNode(root);
      fixSubtitles(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    var doc = root.ownerDocument || root;
    var walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) fixTextNode(node);
    fixSubtitles(root.nodeType === Node.DOCUMENT_NODE ? root.body : root);
  }

  function watchDocument(doc) {
    if (!doc || !doc.body || doc.__hangingPrepositionsReady) return;
    doc.__hangingPrepositionsReady = true;
    fixSubtree(doc.body);
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'characterData') { fixTextNode(mutation.target); fixSubtitles(mutation.target); }
        else { mutation.addedNodes.forEach(fixSubtree); fixSubtitles(mutation.target); }
      });
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
