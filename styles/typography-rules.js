/* Неразрывные связи для русских предлогов, союзов и частиц. */
(function () {
  var SKIP = 'script, style, pre, code, textarea, input, select, option, [contenteditable]:not([contenteditable="false"])';
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

  function fixSubtree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      fixTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    var doc = root.ownerDocument || root;
    var walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) fixTextNode(node);
  }

  function watchDocument(doc) {
    if (!doc || !doc.body || doc.__hangingPrepositionsReady) return;
    doc.__hangingPrepositionsReady = true;
    fixSubtree(doc.body);
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'characterData') fixTextNode(mutation.target);
        else mutation.addedNodes.forEach(fixSubtree);
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
