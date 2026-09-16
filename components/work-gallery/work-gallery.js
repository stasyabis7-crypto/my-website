(() => {
  'use strict';
  const gallery = document.querySelector('.work-gallery');
  if (!gallery) return;
  const viewport = gallery.querySelector('.work-gallery__viewport');
  const track = gallery.querySelector('.work-gallery__track');
  const status = gallery.querySelector('.work-gallery__status');
  const filter = document.getElementById('gallery-filter');
  const filterDock = document.querySelector('.gallery-filter-dock');
  const header = document.querySelector('.site-header');
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--gallery-header-width', `${header.getBoundingClientRect().width}px`);
  }).observe(header);
  new IntersectionObserver(entries => {
    filterDock.hidden = !entries[0].isIntersecting;
  }, { threshold: 0, rootMargin: '0px 0px -25% 0px' }).observe(gallery);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const all = Object.entries(window.projectCollections || {}).flatMap(([company, projects]) =>
    projects.map((project, i) => ({ ...project, company, id: `${company}-${i}` })));
  const names = { avito: 'Avito', ozon: 'Ozon' };
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let projects = all, index = 0, selected = 'all';
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
    slides.forEach(slide => slide.style.removeProperty('--cover-width'));
    const widths = slides.map(slide => {
      const image = slide.querySelector('img');
      if (!image.naturalWidth) return null;
      slide.style.setProperty('--cover-ratio', image.naturalWidth / image.naturalHeight);
      return innerWidth < 1000 ? image.clientWidth : Math.min(image.clientWidth, image.clientHeight * image.naturalWidth / image.naturalHeight);
    });
    slides.forEach((slide, i) => {
      if (widths[i] !== null) slide.style.setProperty('--cover-width', `${widths[i]}px`);
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
    track.innerHTML = repeated.map((p, i) => `<article class="work-gallery__work" data-format="${escape(p.format)}" data-project-id="${escape(p.id)}" ${p.href ? 'data-action-hover' : ''} aria-roledescription="слайд" aria-label="${i % projects.length + 1} из ${projects.length}: ${escape(p.title)}">
      <div class="work-gallery__presentation"><div class="work-gallery__media"><img class="work-gallery__image" src="${escape(p.image)}" srcset="${escape(p.srcset)}" sizes="(max-width: 999px) 80vw, 58vw" alt="${escape(p.title)}" loading="${Math.abs(i - projects.length) <= 1 ? 'eager' : 'lazy'}" decoding="async" draggable="false"></div>
      <div class="work-gallery__caption"><div class="work-gallery__title-row">
        <h3 class="text-h2">${escape(p.title)}</h3>
        ${p.href ? `<a class="btn btn--fill-pink btn--icon-only btn--size-heading btn--hit-area btn--icon-diagonal-motion" href="${escape(p.href)}" ${p.href.startsWith('https:') ? 'target="_blank" rel="noopener noreferrer"' : ''} aria-label="Открыть: ${escape(p.title)}" draggable="false"><span class="icon icon--arrow-diagonal" aria-hidden="true"></span></a>` : ''}
      </div><p class="text-body">${escape(p.description)}</p></div></div>
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
    if (e.ctrlKey || e.metaKey || !e.cancelable || locked() || e.target.closest('[role="dialog"], input, textarea, select')) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewport.clientWidth : 1;
    const dx = (e.shiftKey ? e.deltaX || e.deltaY : e.deltaX) * unit;
    const dy = (e.shiftKey ? 0 : e.deltaY) * unit;
    if (!dx && !dy) return;
    e.preventDefault();
    const now = performance.now();
    const gap = wheel ? now - wheel.lastAt : Infinity;
    if (wheel && gap > 160) wheel = null;
    if (wheel?.kind) {
      const delta = wheel.axis === 'x' ? dx : dy;
      const amplitude = Math.abs(delta);
      const other = Math.abs(wheel.axis === 'x' ? dy : dx);
      const elapsed = now - wheel.started;
      // Apply the same release rules after page navigation and work navigation.
      // A page gesture used to swallow every new event until 160 ms of silence;
      // small new strokes also failed the old 12 px / 2.2x momentum threshold.
      const reversal = amplitude >= 4 && Math.sign(delta) !== wheel.direction;
      const renewed = elapsed > 100 && amplitude >= 4 && wheel.trough !== null &&
        amplitude >= wheel.trough + 2 && amplitude >= wheel.trough * 1.6;
      const freshAfterPause = gap >= 90 && amplitude >= 4 && amplitude >= wheel.lastAmplitude * .9;
      const newAxis = elapsed > 80 && other >= 6 && other > amplitude * 1.8;
      if (reversal || renewed || freshAfterPause || newAxis) wheel = null;
      else {
        if (amplitude < wheel.peak * .65) wheel.trough = Math.min(wheel.trough ?? amplitude, amplitude);
        wheel.lastAmplitude = amplitude;
        wheel.peak = Math.max(wheel.peak, amplitude);
      }
    }
    if (!wheel) wheel = { x: 0, y: 0, kind: null, started: now, lastAt: now, lastAmplitude: 0, peak: 0, trough: null };
    wheel.lastAt = now;
    if (wheel.kind) return;
    wheel.x += dx; wheel.y += dy;
    // Establish the intended axis before reacting to tiny vertical trackpad noise.
    if (Math.abs(wheel.x) < 4 && Math.abs(wheel.y) < 6) return;
    wheel.axis = Math.abs(wheel.x) >= Math.abs(wheel.y) * .8 ? 'x' : 'y';
    const delta = wheel.axis === 'x' ? wheel.x : wheel.y;
    wheel.direction = Math.sign(delta);
    wheel.lastAmplitude = wheel.peak = Math.abs(wheel.axis === 'x' ? dx : dy);
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

  // Reuse the contact surface, origin animation and design-system buttons.
  const dialog = document.createElement('div');
  dialog.id = 'gallery-filter-dialog';
  dialog.className = 'contact-dialog';
  dialog.hidden = true;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'gallery-filter-heading');
  dialog.innerHTML = `<div class="contact-dialog__backdrop" data-close></div>
    <div class="contact-dialog__panel"><div class="contact-dialog__body"><div class="contact-dialog__inner">
      <div class="contact-dialog__head"><h2 class="contact-dialog__title text-h2" id="gallery-filter-heading">Работы по компании</h2></div>
      <div data-rows>${[['all', 'Все компании'], ...Object.entries(names)].map(([key, label], i) => `<div class="contact-dialog__item" style="--item-index:${i}"><button class="contact-row btn btn--fill-white" type="button" data-company="${key}" aria-pressed="${key === selected}">${label} · ${key === 'all' ? all.length : all.filter(p => p.company === key).length}</button></div>`).join('')}</div>
    </div></div><div class="contact-dialog__footer"><div class="contact-dialog__close-wrap"><button class="btn btn--fill-white btn--icon-right" type="button" data-close><span>Закрыть</span><span class="icon icon--close" aria-hidden="true"></span></button></div></div></div>`;
  document.body.append(dialog);
  let inactive = [], closingTimer;
  const panel = dialog.querySelector('.contact-dialog__panel');
  function setOrigin() {
    const r = panel.getBoundingClientRect(), t = filter.getBoundingClientRect();
    const top = Math.max(0, Math.min(r.height, t.top - r.top));
    const left = Math.max(0, Math.min(r.width, t.left - r.left));
    const right = Math.max(0, Math.min(r.width - left, r.right - t.right));
    const bottom = Math.max(0, Math.min(r.height - top, r.bottom - t.bottom));
    panel.style.setProperty('--contact-origin', `inset(${top}px ${right}px ${bottom}px ${left}px round 32px)`);
  }
  function finishClose() {
    clearTimeout(closingTimer);
    dialog.hidden = true; dialog.classList.remove('is-closing');
    inactive.forEach(el => { el.inert = false; }); inactive = [];
    document.documentElement.classList.remove('contact-scroll-lock');
    filter.setAttribute('aria-expanded', 'false'); filter.focus({ preventScroll: true });
  }
  function close() {
    if (dialog.hidden || dialog.classList.contains('is-closing')) return;
    if (reduced.matches) { finishClose(); return; }
    dialog.classList.add('is-closing');
    closingTimer = setTimeout(finishClose, 750);
  }
  panel.addEventListener('animationend', e => { if (e.target === panel && e.animationName === 'contact-surface-out') finishClose(); });
  filter.addEventListener('click', () => {
    dialog.hidden = false; setOrigin();
    inactive = [...document.body.children].filter(el => el !== dialog && !el.inert);
    inactive.forEach(el => { el.inert = true; });
    document.documentElement.classList.add('contact-scroll-lock');
    filter.setAttribute('aria-expanded', 'true');
    dialog.querySelector(`[data-company="${selected}"]`).focus({ preventScroll: true });
  });
  dialog.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  dialog.querySelectorAll('[data-company]').forEach(button => button.addEventListener('click', () => {
    selected = button.dataset.company;
    projects = selected === 'all' ? all : all.filter(p => p.company === selected);
    dialog.querySelectorAll('[data-company]').forEach(el => {
      const active = el.dataset.company === selected;
      el.setAttribute('aria-pressed', String(active));
      el.classList.toggle('btn--fill-pink', active);
      el.classList.toggle('btn--fill-white', !active);
    });
    const filterLabel = `Фильтр работ: ${names[selected] || 'все компании'}`;
    filter.setAttribute('aria-label', filterLabel);
    filter.title = filterLabel;
    render(); close();
  }));
  dialog.querySelector('[data-company="all"]').classList.replace('btn--fill-white', 'btn--fill-pink');
  dialog.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button')];
    const first = controls[0], last = controls[controls.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  window.addEventListener('resize', () => { if (!dialog.hidden) setOrigin(); });
})();
