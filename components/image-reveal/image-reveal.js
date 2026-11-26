(() => {
  'use strict';
  const tracked = new WeakSet();
  const frames = new WeakMap();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  reduced.addEventListener('change', () => {
    if (reduced.matches) animations.forEach(animation => animation.cancel());
  });

  function loadingFrame(image) {
    // Keep the approved hero's own loading and entrance behaviour.
    if (image.closest('.mood-hero, .project-hero')) return () => {};
    const frame = image.closest('.case-cover__media, .case-card__media, .case-moodboard__media, .case-screens-frame, .case-role__col-art, .cg-photo, .cg-gallery__tile, .case-slideshow__slide, .case-lightbox__slide, .works-grid__item, .article-tile__media, .feed-card__frame, .about-intro__portrait, [data-image-frame]');
    if (!frame) return () => {};
    let state = frames.get(frame);
    if (!state) {
      const indicator = document.createElement('span');
      indicator.className = 'image-loading';
      indicator.setAttribute('aria-hidden', 'true');
      // Reuse the page loader's exact ring, including reduced-motion timing.
      const ring = document.createElement('span');
      ring.className = 'page-spinner__ring';
      indicator.appendChild(ring);
      frame.appendChild(indicator);
      frame.setAttribute('data-image-loading', '');
      state = { indicator, images: new Set() };
      frames.set(frame, state);
    }
    state.images.add(image);
    return () => {
      state.images.delete(image);
      if (state.images.size) return;
      state.indicator.remove();
      frame.removeAttribute('data-image-loading');
      frames.delete(frame);
    };
  }

  function watch(image) {
    if (tracked.has(image)) return;
    // Cached images never disappear or replay an entrance animation.
    if (image.complete) return;
    tracked.add(image);
    image.setAttribute('data-image-pending', '');
    const releaseFrame = loadingFrame(image);

    async function ready(event) {
      image.removeEventListener('load', ready);
      image.removeEventListener('error', ready);
      if (event.type === 'load' && image.decode) {
        try { await image.decode(); } catch (_) { /* Still release the image. */ }
      }
      tracked.delete(image);
      image.removeAttribute('data-image-pending');
      releaseFrame();
      // A source can change while decode() is pending (language or gallery).
      if (!image.complete) { watch(image); return; }
      // Hero entrance owns its reveal; avoid a competing image fade.
      if (image.matches('.project-hero__image')) return;
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
    records.forEach(record => {
      if (record.type === 'attributes') watch(record.target);
      else record.addedNodes.forEach(scan);
    });
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset'] });
})();
