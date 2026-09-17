(() => {
  'use strict';
  const tracked = new WeakSet();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  reduced.addEventListener('change', () => {
    if (reduced.matches) animations.forEach(animation => animation.cancel());
  });

  function watch(image) {
    if (tracked.has(image)) return;
    tracked.add(image);
    // Cached images never disappear or replay an entrance animation.
    if (image.complete) return;
    image.setAttribute('data-image-pending', '');

    async function ready(event) {
      image.removeEventListener('load', ready);
      image.removeEventListener('error', ready);
      if (event.type === 'load' && image.decode) {
        try { await image.decode(); } catch (_) { /* Still release the image. */ }
      }
      image.removeAttribute('data-image-pending');
      if (!image.isConnected || !image.naturalWidth || reduced.matches || !image.animate) return;
      const rect = image.getBoundingClientRect();
      const style = getComputedStyle(image);
      if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight ||
          rect.right <= 0 || rect.left >= innerWidth || style.visibility === 'hidden') return;
      // Only late, currently visible images fade. Do not move or resize content.
      const animation = image.animate([{ opacity: 0 }, { opacity: style.opacity }], {
        duration: 400,
        easing: 'ease-out'
      });
      animations.add(animation);
      animation.finished.catch(() => {}).finally(() => animations.delete(animation));
    }

    image.addEventListener('load', ready);
    image.addEventListener('error', ready);
  }

  function scan(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.matches('img')) watch(node);
    node.querySelectorAll('img').forEach(watch);
  }

  scan(document.documentElement);
  // Gallery filtering/rebuilding inserts fresh images after page initialization.
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(scan));
  }).observe(document.body, { childList: true, subtree: true });
})();
