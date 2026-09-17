(() => {
  'use strict';
  const tracked = new WeakSet();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  const pendingSurfaces = new WeakMap();

  function skeletonSurface(image) {
    let surface = image.parentElement;
    if (surface?.tagName === 'PICTURE') surface = surface.parentElement;
    // Do not animate text, controls or entire sections around inline images.
    if (!surface || !surface.matches('[class*="__media"], [class*="__cover"], .project-hero__art, .case-metric__art') &&
        (surface.children.length !== 1 || surface.textContent.trim())) return null;
    if (surface.matches('body, main, section, a, button')) return null;
    const count = pendingSurfaces.get(surface) || 0;
    pendingSurfaces.set(surface, count + 1);
    surface.setAttribute('data-image-skeleton', '');
    return surface;
  }

  reduced.addEventListener('change', () => {
    if (reduced.matches) animations.forEach(animation => animation.cancel());
  });

  function watch(image) {
    if (tracked.has(image)) return;
    tracked.add(image);
    // Cached images never disappear or replay an entrance animation.
    if (image.complete) return;
    image.setAttribute('data-image-pending', '');
    const surface = skeletonSurface(image);

    async function ready(event) {
      image.removeEventListener('load', ready);
      image.removeEventListener('error', ready);
      if (event.type === 'load' && image.decode) {
        try { await image.decode(); } catch (_) { /* Still release the image. */ }
      }
      image.removeAttribute('data-image-pending');
      if (surface) {
        const count = pendingSurfaces.get(surface) - 1;
        if (count > 0) pendingSurfaces.set(surface, count);
        else {
          pendingSurfaces.delete(surface);
          surface.removeAttribute('data-image-skeleton');
        }
      }
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
