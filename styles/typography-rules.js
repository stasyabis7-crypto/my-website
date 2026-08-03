/* Не оставляем короткие русские предлоги и союзы в конце строки. */
(function () {
  var SKIP = 'script, style, pre, code, textarea, input, select, option';
  var HANGING_WORDS = /(^|[\s([{"«„])((?:а|без|в|во|для|до|за|и|из|к|ко|на|над|не|ни|но|о|об|обо|от|по|под|при|про|с|со|у|через))\s+(?=\S)/giu;

  function fixTextNode(node) {
    if (!node.nodeValue || !node.parentElement || node.parentElement.closest(SKIP)) return;
    var fixed = node.nodeValue.replace(HANGING_WORDS, '$1$2\u00a0');
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
    if (!doc || doc.__hangingPrepositionsReady) return;
    doc.__hangingPrepositionsReady = true;
    fixSubtree(doc.body);
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(fixSubtree);
      });
    }).observe(doc.body, { childList: true, subtree: true });
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
