(() => {
  'use strict';
  const gallery = document.querySelector('.work-gallery');
  if (!gallery) return;
  const viewport = gallery.querySelector('.work-gallery__viewport');
  const track = gallery.querySelector('.work-gallery__track');
  const count = gallery.querySelector('.work-gallery__count');
  const prev = gallery.querySelector('[data-gallery-prev]');
  const next = gallery.querySelector('[data-gallery-next]');
  const filter = document.getElementById('gallery-filter');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const all = Object.entries(window.projectCollections || {}).flatMap(([company, projects]) =>
    projects.map((project, i) => ({ ...project, company, id: `${company}-${i}` })));
  const names = { avito: 'Avito', ozon: 'Ozon' };
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let projects = all, index = 0, selected = 'all';
  let slides = [], offsets = [], scrollFrame = 0;
  function update() {
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')}`;
    prev.disabled = index === 0;
    next.disabled = index === projects.length - 1;
    slides.forEach((slide, i) => {
      slide.setAttribute('aria-current', String(i === index));
      const link = slide.querySelector('a');
      if (link) link.tabIndex = i === index ? 0 : -1;
    });
  }
  function measure() {
    track.style.setProperty('--gallery-start', `${(viewport.clientWidth - slides[0].offsetWidth) / 2}px`);
    track.style.setProperty('--gallery-end', `${(viewport.clientWidth - slides.at(-1).offsetWidth) / 2}px`);
    const left = viewport.getBoundingClientRect().left;
    offsets = slides.map(slide => slide.getBoundingClientRect().left - left + viewport.scrollLeft - (viewport.clientWidth - slide.offsetWidth) / 2);
  }
  function goTo(value, instant = false) {
    index = Math.max(0, Math.min(projects.length - 1, value));
    viewport.scrollTo({ left: offsets[index], behavior: instant || reduced.matches ? 'instant' : 'smooth' });
    update();
  }
  function render() {
    track.innerHTML = projects.map((p, i) => `<article class="work-gallery__work" data-format="${escape(p.format)}" aria-roledescription="слайд" aria-label="${i + 1} из ${projects.length}: ${escape(p.title)}">
      <img class="work-gallery__image" src="${escape(p.image)}" srcset="${escape(p.srcset)}" sizes="(max-width: 999px) 80vw, 58vw" alt="${escape(p.title)}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async" draggable="false">
      <div class="work-gallery__caption"><div class="work-gallery__copy">
        <p class="work-gallery__company text-body">${names[p.company]}</p>
        <h3 class="text-h2">${escape(p.title)}</h3>
        <p class="text-body">${escape(p.description)}</p>
      </div>${p.href ? `<a class="btn btn--fill-pink btn--icon-only" href="${escape(p.href)}" ${p.href.startsWith('https:') ? 'target="_blank" rel="noopener noreferrer"' : ''} aria-label="Открыть: ${escape(p.title)}"><span class="icon icon--arrow-diagonal" aria-hidden="true"></span></a>` : ''}</div>
    </article>`).join('');
    slides = [...track.children];
    measure();
    goTo(0, true);
  }
  render();
  new ResizeObserver(() => { measure(); goTo(index, true); }).observe(viewport);
  viewport.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const nearest = offsets.reduce((best, offset, i) => Math.abs(offset - viewport.scrollLeft) < Math.abs(offsets[best] - viewport.scrollLeft) ? i : best, 0);
      if (nearest !== index) { index = nearest; update(); }
    });
  }, { passive: true });
  prev.addEventListener('click', () => goTo(index - 1));
  next.addEventListener('click', () => goTo(index + 1));
  gallery.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('button, a')) return;
    const keys = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: projects.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault(); goTo(keys[e.key]);
  });

  // Only consume a vertical gesture once the exhibition fills the screen.
  // At either end, scrolling returns to the normal document flow.
  const aligned = () => Math.abs(gallery.getBoundingClientRect().top) < 3;
  const canMove = delta => delta > 0 ? index < projects.length - 1 : index > 0;
  let wheelAt = 0, wheelTotal = 0, wheelDirection = 0, lastWheel = 0;
  gallery.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey || !aligned() || document.documentElement.classList.contains('contact-scroll-lock')) return;
    const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    if (!delta) return;
    const now = performance.now();
    const direction = Math.sign(delta);
    const continuing = now - lastWheel < 180 && direction === wheelDirection;
    lastWheel = now;
    if (!canMove(delta) && !(continuing && now - wheelAt < 850)) return;
    e.preventDefault();
    if (!continuing) wheelTotal = 0;
    wheelDirection = direction;
    if (now - wheelAt < 650) return;
    wheelTotal += delta;
    if (Math.abs(wheelTotal) < 32) return;
    goTo(index + direction); wheelAt = now; wheelTotal = 0;
  }, { passive: false });

  // Horizontal touch remains native; a vertical swipe selects a neighbouring work.
  // Explicitly hand a backward swipe at the first work to the page: browsers
  // can latch it to the nested horizontal scroll surface even at its boundary.
  let touch;
  viewport.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { touch = null; return; }
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, delta: 0, vertical: false };
  }, { passive: true });
  viewport.addEventListener('touchmove', e => {
    if (!touch || e.touches.length !== 1 || !aligned()) return;
    const dx = touch.x - e.touches[0].clientX;
    const dy = touch.y - e.touches[0].clientY;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8 && (canMove(dy) || dy < 0 && index === 0)) {
      if (e.cancelable) e.preventDefault();
      touch.delta = dy; touch.vertical = true;
      touch.returnToPage = dy < 0 && index === 0;
    }
  }, { passive: false });
  viewport.addEventListener('touchend', () => {
    if (touch?.vertical && Math.abs(touch.delta) > 32) {
      if (touch.returnToPage) window.scrollBy({ top: touch.delta, behavior: reduced.matches ? 'instant' : 'smooth' });
      else goTo(index + Math.sign(touch.delta));
    }
    touch = null;
  });
  viewport.addEventListener('touchcancel', () => { touch = null; });

  let drag, suppressClick = false;
  viewport.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a, button')) return;
    drag = { x: e.clientX, left: viewport.scrollLeft, id: e.pointerId };
    suppressClick = false;
  });
  viewport.addEventListener('pointermove', e => {
    if (!drag) return;
    const delta = e.clientX - drag.x;
    if (Math.abs(delta) > 5) {
      suppressClick = true;
      viewport.setPointerCapture(drag.id);
      viewport.classList.add('is-dragging');
      viewport.scrollLeft = drag.left - delta;
    }
  });
  function finishDrag() {
    if (!drag) return;
    const nearest = offsets.reduce((best, offset, i) => Math.abs(offset - viewport.scrollLeft) < Math.abs(offsets[best] - viewport.scrollLeft) ? i : best, 0);
    if (viewport.hasPointerCapture(drag.id)) viewport.releasePointerCapture(drag.id);
    drag = null;
    viewport.classList.remove('is-dragging');
    goTo(nearest);
  }
  window.addEventListener('pointerup', finishDrag);
  viewport.addEventListener('pointercancel', finishDrag);
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
