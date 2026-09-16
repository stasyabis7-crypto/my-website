(() => {
  'use strict';
  const gallery = document.querySelector('.work-gallery');
  if (!gallery) return;
  const viewport = gallery.querySelector('.work-gallery__viewport');
  const track = gallery.querySelector('.work-gallery__track');
  const status = gallery.querySelector('.work-gallery__status');
  const filter = document.getElementById('gallery-filter');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const all = Object.entries(window.projectCollections || {}).flatMap(([company, projects]) =>
    projects.map((project, i) => ({ ...project, company, id: `${company}-${i}` })));
  const names = { avito: 'Avito', ozon: 'Ozon' };
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let projects = all, index = 0, selected = 'all';
  let slides = [], offsets = [], physical = 0, settleTimer;
  let drag = null, touch = null, suppressClick = false;
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
      // Repeated cycles are visual neighbours, not duplicate focus stops.
      slide.setAttribute('aria-hidden', String(!active));
      const link = slide.querySelector('a');
      if (link) link.tabIndex = active ? 0 : -1;
    });
  }
  let fitFrame = 0;
  function fitCaptions() {
    const widths = slides.map(slide => {
      const image = slide.querySelector('img');
      if (!image.naturalWidth) return null;
      const rect = image.getBoundingClientRect();
      return Math.min(rect.width, rect.height * image.naturalWidth / image.naturalHeight);
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
      link.style.setProperty('--hit-left', `${rect.left - button.left}px`);
      link.style.setProperty('--hit-top', `${rect.top - button.top}px`);
      link.style.setProperty('--hit-width', `${rect.width}px`);
      link.style.setProperty('--hit-height', `${rect.height}px`);
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
    const left = loopPosition(viewport.scrollLeft);
    if (Math.abs(left - viewport.scrollLeft) > 1) viewport.scrollTo({ left, behavior: 'instant' });
    update();
  }
  function moveBy(delta) {
    viewport.scrollTo({ left: loopPosition(viewport.scrollLeft + delta), behavior: 'instant' });
    update();
  }
  function goTo(value) {
    recenter();
    const target = Math.max(0, Math.min(slides.length - 1, physical + value));
    viewport.scrollTo({ left: offsets[target], behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  function render() {
    clearTimeout(settleTimer);
    touch = null; drag = null;
    const repeated = [...projects, ...projects, ...projects];
    track.innerHTML = repeated.map((p, i) => `<article class="work-gallery__work" data-format="${escape(p.format)}" data-project-id="${escape(p.id)}" aria-roledescription="слайд" aria-label="${i % projects.length + 1} из ${projects.length}: ${escape(p.title)}">
      <img class="work-gallery__image" src="${escape(p.image)}" srcset="${escape(p.srcset)}" sizes="(max-width: 999px) 80vw, 58vw" alt="${escape(p.title)}" loading="${Math.abs(i - projects.length) <= 1 ? 'eager' : 'lazy'}" decoding="async" draggable="false">
      <div class="work-gallery__caption"><div class="work-gallery__title-row">
        <h3 class="text-h2">${escape(p.title)}</h3>
        ${p.href ? `<a class="btn btn--fill-pink btn--icon-only btn--size-heading btn--hit-area" href="${escape(p.href)}" ${p.href.startsWith('https:') ? 'target="_blank" rel="noopener noreferrer"' : ''} aria-label="Открыть: ${escape(p.title)}" draggable="false"><span class="icon icon--arrow-diagonal" aria-hidden="true"></span></a>` : ''}
      </div><p class="text-body">${escape(p.description)}</p></div>
    </article>`).join('');
    slides = [...track.children];
    slides.forEach(slide => slide.querySelector('img').addEventListener('load', scheduleFit, { once: true }));
    measure();
    viewport.scrollTo({ left: offsets[projects.length], behavior: 'instant' });
    update();
  }
  render();
  document.fonts.ready.then(() => { fitCaptions(); measure(); });
  new ResizeObserver(() => {
    const active = index;
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
    if (['Escape', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduced.matches ? 'instant' : 'smooth' }); return; }
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
  gallery.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey || !e.cancelable || !visible() || locked()) return;
    const horizontal = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const delta = (horizontal ? e.deltaX || e.deltaY : e.deltaY) * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewport.clientWidth : 1);
    if (!delta) return;
    e.preventDefault();
    if (!horizontal && delta < 0) { window.scrollBy({ top: delta, behavior: 'instant' }); return; }
    // Continuous displacement: no threshold, cooldown or snap swallowing small
    // trackpad deltas, and no competing page-motion animation on this surface.
    moveBy(delta);
  }, { passive: false });

  // Horizontal swipes use native scrolling. Vertical swipes move the same
  // horizontal surface directly; a backward vertical gesture returns to the page.
  viewport.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || !visible() || locked()) { touch = null; return; }
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null, last: e.touches[0].clientY };
  }, { passive: true });
  viewport.addEventListener('touchmove', e => {
    if (!touch || e.touches.length !== 1) return;
    const dx = touch.x - e.touches[0].clientX;
    const dy = touch.y - e.touches[0].clientY;
    if (!touch.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 5) touch.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
    if (touch.axis === 'y' && e.cancelable) {
      e.preventDefault();
      const delta = touch.last - e.touches[0].clientY;
      if (touch.page === undefined) touch.page = dy < 0;
      if (touch.page) window.scrollBy({ top: delta, behavior: 'instant' });
      else moveBy(delta);
      touch.last = e.touches[0].clientY;
    }
  }, { passive: false });
  function finishTouch() { touch = null; clearTimeout(settleTimer); settleTimer = setTimeout(recenter, 180); }
  viewport.addEventListener('touchend', finishTouch);
  viewport.addEventListener('touchcancel', finishTouch);

  viewport.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button, a:not(.btn--hit-area)')) return;
    drag = { x: e.clientX, y: e.clientY, last: 0, axis: null, id: e.pointerId };
    suppressClick = false;
  });
  viewport.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = drag.x - e.clientX, dy = drag.y - e.clientY;
    if (!drag.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 5) drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    if (!drag.axis) return;
    if (!viewport.hasPointerCapture(drag.id)) viewport.setPointerCapture(drag.id);
    suppressClick = true;
    viewport.classList.add('is-dragging');
    const delta = drag.axis === 'x' ? dx : dy;
    if (drag.axis === 'y' && drag.page === undefined) drag.page = dy < 0;
    if (drag.page) window.scrollBy({ top: delta - drag.last, behavior: 'instant' });
    else moveBy(delta - drag.last);
    drag.last = delta;
  });
  function finishDrag() {
    if (!drag) return;
    const id = drag.id;
    drag = null;
    if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
    viewport.classList.remove('is-dragging');
    recenter();
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
    filter.querySelector('[data-filter-label]').textContent = names[selected] || 'Все компании';
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
