(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var active = new Set();
  var pending = new Set();
  var observer;

  function animate(el, frames, duration) {
    if (reduced.matches || !el.animate) return;
    var animation = el.animate(frames, {
      duration: duration,
      easing: 'cubic-bezier(.22,.61,.36,1)'
    });
    active.add(animation);
    animation.finished.then(function () { active.delete(animation); }, function () { active.delete(animation); });
  }
  function reveal(el, motion) {
    if (!pending.has(el)) return;
    pending.delete(el);
    observer.unobserve(el);
    el.classList.remove('content-reveal-pending');
    if (motion) animate(el, [
      { opacity: 0, translate: '0 20px' },
      { opacity: 1, translate: '0 0' }
    ], 650);
  }

  if ('IntersectionObserver' in window && !reduced.matches) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) reveal(entry.target, true);
      });
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    // Animate individual pieces, not whole long sections or the pinned gallery.
    document.querySelectorAll('.case-block > *, .project-slider__heading, .project-card').forEach(function (el) {
      if (el.getBoundingClientRect().top < innerHeight || el.matches('[data-reveal]')) return;
      pending.add(el);
      el.classList.add('content-reveal-pending');
      observer.observe(el);
    });
    document.addEventListener('focusin', function (event) {
      pending.forEach(function (el) {
        if (el === event.target || el.contains(event.target) || event.target.contains(el)) reveal(el, false);
      });
    });
    window.addEventListener('beforeprint', function () {
      pending.forEach(function (el) { reveal(el, false); });
    });
  }

  // Cached images stay visible. Slow images fade only after load and decoding;
  // error restores the browser's fallback rather than leaving an invisible slot.
  document.querySelectorAll('main.case img, .project-card__image').forEach(function (img) {
    if (img.complete) return;
    img.classList.add('image-reveal-pending');
    var settled = false;
    function finish(success) {
      if (settled) return;
      settled = true;
      img.removeEventListener('load', loaded);
      img.removeEventListener('error', failed);
      img.classList.remove('image-reveal-pending');
      if (success) animate(img, [{ opacity: 0 }, { opacity: 1 }], 550);
    }
    function loaded() {
      var decoded = img.decode ? img.decode() : Promise.resolve();
      decoded.then(function () { finish(true); }, function () { finish(img.naturalWidth > 0); });
    }
    function failed() { finish(false); }
    img.addEventListener('load', loaded);
    img.addEventListener('error', failed);
    if (img.complete) { if (img.naturalWidth) loaded(); else failed(); }
  });

  reduced.addEventListener('change', function () {
    if (!reduced.matches) return;
    pending.forEach(function (el) { reveal(el, false); });
    active.forEach(function (animation) { animation.cancel(); });
  });
})();
