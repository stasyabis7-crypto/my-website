(function () {
  'use strict';
  document.querySelectorAll('[data-case-slideshow]').forEach(function (root) {
    var slides = Array.from(root.querySelectorAll('.case-slideshow__slide'));
    var counter = root.querySelector('.case-slideshow__counter');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var index = 0;
    var timer;
    var hovering = false;
    var focused = false;
    var visible = false;
    var start = null;
    var suppressClickUntil = 0;
    var wheelDistance = 0;
    var wheelLastTime = 0;
    var wheelHandled = false;

    function schedule() {
      clearTimeout(timer);
      if (!hovering && !focused && visible && !document.hidden && !root.closest('[inert]') && !reduced.matches && start === null) {
        timer = setTimeout(function () { show(index + 1); }, 5000);
      }
    }
    function show(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        slide.classList.toggle('is-current', i === index);
        slide.setAttribute('aria-hidden', String(i !== index));
      });
      counter.textContent = (index + 1) + ' из ' + slides.length;
      schedule();
    }
    root.querySelector('.case-slideshow__prev').addEventListener('click', function () { show(index - 1); });
    root.querySelector('.case-slideshow__next').addEventListener('click', function () { show(index + 1); });
    root.addEventListener('mouseenter', function () { hovering = true; schedule(); });
    root.addEventListener('mouseleave', function () { hovering = false; schedule(); });
    root.addEventListener('focusin', function () { focused = true; schedule(); });
    root.addEventListener('focusout', function (event) {
      focused = root.contains(event.relatedTarget);
      schedule();
    });
    root.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    });
    root.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse') return;
      start = { x: event.clientX, y: event.clientY };
      event.target.setPointerCapture(event.pointerId);
      schedule();
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
      else schedule();
    });
    root.addEventListener('click', function (event) {
      if (performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    root.addEventListener('pointercancel', function () { start = null; schedule(); });
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
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', schedule);
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      schedule();
    }, { threshold: 0.15 }).observe(root);
  });
})();
