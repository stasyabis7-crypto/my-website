(function () {
  'use strict';
  document.querySelectorAll('[data-case-slideshow]').forEach(function (root) {
    var slides = Array.from(root.querySelectorAll('.case-slideshow__slide'));
    var counter = root.querySelector('.case-slideshow__counter');
    var index = 0;
    var start = null;
    var suppressClickUntil = 0;
    var wheelDistance = 0;
    var wheelLastTime = 0;
    var wheelHandled = false;
    var animations = [];

    function clearTransition() {
      animations.forEach(function (animation) { animation.cancel(); });
      animations = [];
      slides.forEach(function (slide) { slide.classList.remove('is-leaving'); });
    }

    function show(next) {
      var target = (next + slides.length) % slides.length;
      if (target === index) return;
      var previous = slides[index];
      var incoming = slides[target];
      var direction = next > index ? 1 : -1;
      // Finish the prior gesture before starting another, so rapid navigation
      // never leaves an old frame visible or an animation transform attached.
      clearTransition();
      index = target;
      slides.forEach(function (slide, i) {
        slide.classList.toggle('is-current', i === index);
        slide.setAttribute('aria-hidden', String(i !== index));
      });
      counter.textContent = (index + 1) + ' из ' + slides.length;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !incoming.animate) return;
      previous.classList.add('is-leaving');
      var timing = { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' };
      var transition = [
        previous.animate([
          { transform: 'translateX(0)' },
          { transform: 'translateX(' + (-direction * 100) + '%)' }
        ], timing),
        incoming.animate([
          { transform: 'translateX(' + (direction * 100) + '%)' },
          { transform: 'translateX(0)' }
        ], timing)
      ];
      animations = transition;
      Promise.all(transition.map(function (animation) { return animation.finished; })).then(function () {
        if (animations === transition) clearTransition();
      }).catch(function () { /* A newer gesture cancelled this transition. */ });
    }
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', clearTransition);
    root.querySelector('.case-slideshow__prev').addEventListener('click', function () { show(index - 1); });
    root.querySelector('.case-slideshow__next').addEventListener('click', function () { show(index + 1); });
    root.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    });
    root.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse') return;
      start = { x: event.clientX, y: event.clientY };
      event.target.setPointerCapture(event.pointerId);
    });
    root.addEventListener('pointerup', function (event) {
      if (!start) return;
      var dx = event.clientX - start.x;
      var dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        suppressClickUntil = performance.now() + 400;
        show(index + (dx < 0 ? 1 : -1));
      }
    });
    root.addEventListener('click', function (event) {
      if (performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    root.addEventListener('pointercancel', function () { start = null; });
    // One slide per horizontal trackpad gesture, including its inertia tail.
    root.addEventListener('wheel', function (event) {
      if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      var now = performance.now();
      if (now - wheelLastTime > 200) {
        wheelDistance = 0;
        wheelHandled = false;
      }
      wheelLastTime = now;
      if (wheelHandled) return;
      var delta = event.deltaX * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? root.clientWidth : 1);
      wheelDistance += delta;
      if (Math.abs(wheelDistance) >= 50) {
        show(index + (wheelDistance > 0 ? 1 : -1));
        wheelHandled = true;
      }
    }, { passive: false });
  });
})();
