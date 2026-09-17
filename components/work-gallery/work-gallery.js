(() => {
  'use strict';
  const gallery = document.querySelector('.work-gallery');
  if (!gallery) return;
  const viewport = gallery.querySelector('.work-gallery__viewport');
  const track = gallery.querySelector('.work-gallery__track');
  const status = gallery.querySelector('.work-gallery__status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const all = window.portfolioGroups || [];
  if (!all.length) return;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let projects = all, index = 0;
  let slides = [], offsets = [], physical = 0, settleTimer;
  let drag = null, touch = null, suppressClick = false, pendingTarget = null;
  const modulo = value => (value % projects.length + projects.length) % projects.length;
  function nearest() {
    return offsets.reduce((best, offset, i) => Math.abs(offset - viewport.scrollLeft) < Math.abs(offsets[best] - viewport.scrollLeft) ? i : best, 0);
  }
  function update() {
    physical = nearest();
    index = modulo(physical);
    gallery.dataset.activeProject = projects[index].id;
    const label = `${projects[index].title}, ${index + 1} из ${projects.length}`;
    if (status.textContent !== label) status.textContent = label;
    slides.forEach((slide, i) => {
      const active = i === physical;
      slide.setAttribute('aria-current', String(active));
      // Every copy of a project shares its visual state, so the invisible
      // loop handoff cannot restart the scale/opacity animation.
      slide.dataset.focused = String(modulo(i) === index);
      // Repeated cycles are visual neighbours, not duplicate focus stops.
      slide.setAttribute('aria-hidden', String(!active));
      const link = slide.querySelector('a');
      if (link) link.tabIndex = active ? 0 : -1;
    });
  }
  let fitFrame = 0;
  function fitCaptions() {
    slides.forEach(slide => {
      const image = slide.querySelector('img');
      if (!image.naturalWidth) return;
      const presentation = slide.querySelector('.work-gallery__presentation');
      const caption = slide.querySelector('.work-gallery__caption');
      const ratio = image.naturalWidth / image.naturalHeight;
      const gap = parseFloat(getComputedStyle(presentation).gap) || 20;
      // Caption wrapping depends on the artwork width. Fit both together,
      // starting afresh on resize so a previously narrow card can grow again.
      let width = slide.clientWidth;
      for (let pass = 0; pass < 12; pass++) {
        slide.style.setProperty('--cover-width', `${width}px`);
        const availableHeight = Math.max(96, presentation.clientHeight - caption.offsetHeight - gap);
        const next = Math.min(width, availableHeight * ratio);
        if (width - next < .5) break;
        width = next;
      }
      slide.style.setProperty('--cover-ratio', ratio);
      slide.style.setProperty('--cover-width', `${width}px`);
      slide.style.setProperty('--cover-height', `${width / ratio}px`);
    });
    const areas = slides.map(slide => {
      const link = slide.querySelector('a');
      if (!link) return null;
      return { link, rect: slide.getBoundingClientRect(), button: link.getBoundingClientRect() };
    });
    areas.forEach(area => {
      if (!area) return;
      const { link, rect, button } = area;
      const scale = button.width / link.offsetWidth || 1;
      link.style.setProperty('--hit-left', `${(rect.left - button.left) / scale}px`);
      link.style.setProperty('--hit-top', `${(rect.top - button.top) / scale}px`);
      link.style.setProperty('--hit-width', `${rect.width / scale}px`);
      link.style.setProperty('--hit-height', `${rect.height / scale}px`);
    });
  }
  function scheduleFit() {
    if (!fitFrame) fitFrame = requestAnimationFrame(() => { fitFrame = 0; fitCaptions(); });
  }
  function measure() {
    fitCaptions();
    track.style.setProperty('--gallery-start', `${(viewport.clientWidth - slides[0].offsetWidth) / 2}px`);
    track.style.setProperty('--gallery-end', `${(viewport.clientWidth - slides.at(-1).offsetWidth) / 2}px`);
    const left = viewport.getBoundingClientRect().left;
    offsets = slides.map(slide => slide.getBoundingClientRect().left - left + viewport.scrollLeft - (viewport.clientWidth - slide.offsetWidth) / 2);
  }
  // Three identical cycles keep neighbours on both sides, including at startup.
  // Moving by one exact cycle preserves every visible pixel and variable width.
  function loopPosition(left) {
    const start = offsets[projects.length];
    const period = offsets[projects.length * 2] - start;
    return start + ((left - start) % period + period) % period;
  }
  function recenter() {
    if (drag || touch) return;
    if (pendingTarget !== null && Math.abs(viewport.scrollLeft - offsets[pendingTarget]) > 2) return;
    pendingTarget = null;
    const left = loopPosition(viewport.scrollLeft);
    if (Math.abs(left - viewport.scrollLeft) > 1) viewport.scrollTo({ left, behavior: 'instant' });
    update();
  }
  function centerAt(target) {
    target = Math.max(0, Math.min(slides.length - 1, target));
    pendingTarget = target;
    viewport.scrollTo({ left: offsets[target], behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  function goTo(value) {
    if (pendingTarget === null) recenter();
    let from = pendingTarget ?? physical;
    const middle = projects.length + modulo(from);
    if (middle !== from) {
      viewport.scrollTo({ left: viewport.scrollLeft + offsets[middle] - offsets[from], behavior: 'instant' });
      from = middle;
    }
    centerAt(from + value);
  }
  // Button, wheel and touch share one navigation animation and landing.
  function showGallery() {
    window.siteNavigation.scrollTo(() => scrollY + gallery.getBoundingClientRect().top);
  }
  function showHero() { window.siteNavigation.scrollTo(0); }
  function render() {
    clearTimeout(settleTimer);
    touch = null; drag = null; pendingTarget = null;
    const repeated = [...projects, ...projects, ...projects];
    track.innerHTML = repeated.map((p, i) => `<article class="work-gallery__work" data-format="${escape(p.format)}" data-project-id="${escape(p.id)}" data-action-hover aria-roledescription="слайд" aria-label="${i % projects.length + 1} из ${projects.length}: ${escape(p.title)}">
      <div class="work-gallery__presentation">
        <div class="work-gallery__media">
          <img class="work-gallery__image" src="${escape(p.image)}" alt="${escape(p.title)}" loading="${Math.abs(i - projects.length) <= 1 ? 'eager' : 'lazy'}" decoding="async" draggable="false">
          ${p.tag ? `<p class="work-gallery__tag text-body">${escape(p.tag)}</p>` : ''}
          <a class="work-gallery__action btn btn--fill-pink btn--icon-only btn--hit-area btn--icon-diagonal-motion" href="${escape(p.href)}" aria-label="Открыть: ${escape(p.title)}" draggable="false"><span class="icon icon--arrow-diagonal" aria-hidden="true"></span></a>
        </div>
        <div class="work-gallery__caption"><h2 class="text-h2">${escape(p.title)}</h2><p class="text-body">${escape(p.description)}</p></div>
      </div>
    </article>`).join('');
    slides = [...track.children];
    slides.forEach(slide => {
      slide.querySelector('img').addEventListener('load', scheduleFit, { once: true });
      slide.querySelector('.work-gallery__presentation').addEventListener('transitionend', scheduleFit);
    });
    measure();
    viewport.scrollTo({ left: offsets[projects.length], behavior: 'instant' });
    update();
  }
  render();
  document.fonts.ready.then(() => { fitCaptions(); measure(); });
  new ResizeObserver(() => {
    const active = pendingTarget === null ? index : modulo(pendingTarget);
    pendingTarget = null;
    measure();
    viewport.scrollTo({ left: offsets[projects.length + active], behavior: 'instant' });
    update();
  }).observe(viewport);
  viewport.addEventListener('scroll', () => {
    update();
    clearTimeout(settleTimer);
    // Wait for native touch momentum / keyboard smooth scrolling to finish.
    settleTimer = setTimeout(recenter, 180);
  }, { passive: true });
  gallery.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('button, a')) return;
    if (['Escape', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); showHero(); return; }
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, Home: -index, End: projects.length - 1 - index };
    if (!(e.key in keys)) return;
    e.preventDefault(); goTo(keys[e.key]);
  });

  // A partial landing, browser toolbar or rounding must not disable input.
  const visible = () => {
    const rect = gallery.getBoundingClientRect();
    return rect.top < innerHeight * .3 && rect.bottom > innerHeight * .65;
  };
  const locked = () => document.documentElement.classList.contains('contact-scroll-lock');
  // One wheel burst includes its momentum tail. A page transition consumes the
  // complete burst, so entering the gallery never also advances the first work.
  let wheel = null;
  window.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey || locked() || e.target.closest('[role="dialog"], input, textarea, select')) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewport.clientWidth : 1;
    const dx = (e.shiftKey ? e.deltaX || e.deltaY : e.deltaX) * unit;
    const dy = (e.shiftKey ? 0 : e.deltaY) * unit;
    if (!dx && !dy) return;
    if (e.cancelable) e.preventDefault();
    const now = performance.now();
    // A stream includes finger movement and browser-generated inertia. Keep
    // observing non-cancelable events too: some browsers only allow canceling
    // the first wheel event. They still carry gesture timing and direction.
    // Same-direction acceleration remains part of the consumed gesture.
    // A sustained horizontal reversal can start a new gesture before silence.
    if (wheel && now - wheel.lastAt > 400) wheel = null;
    if (!wheel) wheel = { x: 0, y: 0, kind: null, lastAt: now };
    wheel.lastAt = now;
    // A deliberate swipe back must not wait for the previous momentum tail.
    // Require several horizontal samples: one opposite pulse is often bounce.
    if (wheel.kind === 'work') {
      const reverse = Math.abs(dx) > Math.abs(dy) * 1.5 &&
        Math.abs(dx) >= 2 && Math.sign(dx) !== wheel.direction;
      if (reverse) {
        if (!wheel.reverse || now - wheel.reverse.lastAt > 160) {
          wheel.reverse = { count: 0, distance: 0, startedAt: now };
        }
        wheel.reverse.count++;
        wheel.reverse.distance += Math.abs(dx);
        wheel.reverse.lastAt = now;
        if (wheel.reverse.count >= 3 && wheel.reverse.distance >= 24 &&
            now - wheel.reverse.startedAt >= 24) {
          wheel.direction = Math.sign(dx);
          wheel.axis = 'x';
          wheel.reverse = null;
          wheel.upward = 0;
          goTo(wheel.direction);
          return;
        }
      } else wheel.reverse = null;
    }
    // Returning to the hero is a separate action: an upward gesture over a
    // card may interrupt the consumed project swipe without advancing again.
    if (wheel.kind === 'work' && e.target.closest('.work-gallery__work')) {
      wheel.upward = dy < 0 && Math.abs(dy) > Math.abs(dx) * 1.5
        ? (wheel.upward || 0) - dy : 0;
      if (wheel.upward >= 18) {
        wheel.kind = 'page';
        showHero();
        return;
      }
    }
    if (wheel.kind) return;
    wheel.x += dx; wheel.y += dy;
    // Establish the intended axis before reacting to tiny vertical trackpad noise.
    if (Math.abs(wheel.x) < 4 && Math.abs(wheel.y) < 6) return;
    wheel.axis = Math.abs(wheel.x) >= Math.abs(wheel.y) * .8 ? 'x' : 'y';
    const delta = wheel.axis === 'x' ? wheel.x : wheel.y;
    wheel.direction = Math.sign(delta);
    if (wheel.axis === 'y' && delta < 0) { wheel.kind = 'page'; showHero(); return; }
    if (!visible()) {
      if (delta > 0) { wheel.kind = 'page'; showGallery(); }
      return;
    }
    wheel.kind = 'work';
    goTo(wheel.direction);
  }, { passive: false, capture: true });

  function beginGesture(x, y) {
    recenter();
    const start = pendingTarget ?? nearest();
    pendingTarget = null;
    viewport.scrollTo({ left: offsets[start], behavior: 'instant' });
    return { x, y, start, axis: null, delta: 0, page: false };
  }
  function previewGesture(gesture, x, y) {
    const dx = gesture.x - x, dy = gesture.y - y;
    if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 5) {
      gesture.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      gesture.page = gesture.axis === 'y' && dy < 0;
    }
    if (!gesture.axis) return false;
    gesture.delta = gesture.axis === 'x' ? dx : dy;
    if (!gesture.page) {
      const direction = Math.sign(gesture.delta);
      const distance = Math.abs(offsets[gesture.start + direction] - offsets[gesture.start]);
      const amount = Math.min(Math.abs(gesture.delta), distance * .85);
      viewport.scrollTo({ left: offsets[gesture.start] + direction * amount, behavior: 'instant' });
    }
    return true;
  }
  function finishGesture(gesture, cancelled = false) {
    if (!gesture) return;
    const step = !cancelled && Math.abs(gesture.delta) > 28 ? Math.sign(gesture.delta) : 0;
    if (gesture.page) { if (step) showHero(); return; }
    centerAt(gesture.start + step);
  }
  gallery.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || !visible() || locked()) { touch = null; return; }
    touch = beginGesture(e.touches[0].clientX, e.touches[0].clientY);
    suppressClick = false;
  }, { passive: true });
  gallery.addEventListener('touchmove', e => {
    if (!touch || e.touches.length !== 1) return;
    if (previewGesture(touch, e.touches[0].clientX, e.touches[0].clientY) && e.cancelable) {
      e.preventDefault(); suppressClick = true;
    }
  }, { passive: false });
  function finishTouch(e) {
    const gesture = touch; touch = null;
    finishGesture(gesture, e.type === 'touchcancel');
  }
  gallery.addEventListener('touchend', finishTouch);
  gallery.addEventListener('touchcancel', finishTouch);

  const hero = document.querySelector('.mood-hero');
  let heroTouch;
  hero.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || locked()) { heroTouch = null; return; }
    heroTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY, delta: 0 };
  }, { passive: true });
  hero.addEventListener('touchmove', e => {
    if (!heroTouch || e.touches.length !== 1) return;
    const dx = heroTouch.x - e.touches[0].clientX, dy = heroTouch.y - e.touches[0].clientY;
    if (dy > 5 && Math.abs(dy) > Math.abs(dx) && e.cancelable) { e.preventDefault(); heroTouch.delta = dy; }
  }, { passive: false });
  hero.addEventListener('touchend', () => { if (heroTouch?.delta > 28) showGallery(); heroTouch = null; });
  hero.addEventListener('touchcancel', () => { heroTouch = null; });

  viewport.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button, a:not(.btn--hit-area)')) return;
    drag = { ...beginGesture(e.clientX, e.clientY), id: e.pointerId };
    suppressClick = false;
  });
  viewport.addEventListener('pointermove', e => {
    if (!drag || !previewGesture(drag, e.clientX, e.clientY)) return;
    if (!viewport.hasPointerCapture(drag.id)) viewport.setPointerCapture(drag.id);
    suppressClick = true;
    viewport.classList.add('is-dragging');
  });
  function finishDrag(e) {
    if (!drag) return;
    const gesture = drag; drag = null;
    if (viewport.hasPointerCapture(gesture.id)) viewport.releasePointerCapture(gesture.id);
    viewport.classList.remove('is-dragging');
    finishGesture(gesture, e.type === 'pointercancel');
  }
  window.addEventListener('pointerup', finishDrag);
  viewport.addEventListener('pointercancel', finishDrag);
  viewport.addEventListener('lostpointercapture', finishDrag);
  viewport.addEventListener('click', e => { if (suppressClick) { e.preventDefault(); suppressClick = false; } }, true);

})();
