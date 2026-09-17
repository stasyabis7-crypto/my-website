/* Contents popover on desktop; shared contact-dialog surface on mobile. */
(() => {
  const root = document.querySelector('.work-toc');
  if (!root) return;
  const toggle = root.querySelector('.work-toc__toggle');
  const panel = root.querySelector('.work-toc__panel');
  const desktopScroll = panel.querySelector('nav');
  const items = [...panel.querySelectorAll('a[href^="#"]')].map(link => ({
    link, section: document.getElementById(link.hash.slice(1)),
    marker: root.querySelector(`[data-toc-marker="${link.hash.slice(1)}"]`)
  })).filter(item => item.section);
  if (!items.length) return;
  const desktop = matchMedia('(min-width: 1101px)');
  const hover = matchMedia('(hover: hover)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, manualUntil = 0, scrollAnimation = 0, current;
  let inactive = [], closeTimer, afterClose;
  let popoverOpen = false, popoverAnimation;
  const sheet = document.createElement('div');
  sheet.className = 'contact-dialog contact-sheet work-toc-sheet';
  sheet.id = 'work-toc-sheet';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'work-toc-title');
  sheet.innerHTML = `<div class="contact-dialog__backdrop" data-close></div>
    <div class="contact-dialog__panel"><div class="contact-dialog__body"><div class="contact-dialog__inner">
      <div class="contact-dialog__head"><h2 class="text-h2" id="work-toc-title">Оглавление</h2></div>
      <nav data-rows aria-label="Оглавление проекта"></nav>
    </div></div><div class="contact-dialog__footer"><div class="contact-dialog__close-wrap">
      <button type="button" class="btn btn--fill-ink btn--icon-right" data-close aria-label="Закрыть оглавление">
        <span>Закрыть</span><span class="icon icon--close" aria-hidden="true"></span>
      </button></div></div></div>`;
  document.body.appendChild(sheet);
  const surface = sheet.querySelector('.contact-dialog__panel');
  const scrollBody = sheet.querySelector('.contact-dialog__body');
  function updateScrollFade() {
    [desktopScroll, scrollBody].forEach(scroller => {
      if (!scroller.clientHeight) return;
      const remaining = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
      scroller.style.setProperty('--toc-fade-top', `${Math.min(40, Math.max(0, scroller.scrollTop))}px`);
      scroller.style.setProperty('--toc-fade-bottom', `${Math.min(40, Math.max(0, remaining))}px`);
    });
  }
  scrollBody.addEventListener('scroll', updateScrollFade, { passive: true });
  desktopScroll.addEventListener('scroll', updateScrollFade, { passive: true });
  const fadeObserver = new ResizeObserver(updateScrollFade);
  fadeObserver.observe(scrollBody);
  fadeObserver.observe(desktopScroll);
  items.forEach(item => fadeObserver.observe(item.link));
  fadeObserver.observe(sheet.querySelector('.contact-dialog__inner'));
  const closeButton = sheet.querySelector('button[data-close]');
  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'contact-dialog__item';
    row.style.setProperty('--item-index', Math.min(index, 5));
    item.mobileLink = item.link.cloneNode(true);
    item.mobileLink.className = 'contact-row btn btn--fill-white';
    row.appendChild(item.mobileLink);
    sheet.querySelector('[data-rows]').appendChild(row);
  });
  const homeRow = document.createElement('div');
  homeRow.className = 'contact-dialog__item';
  homeRow.style.setProperty('--item-index', 5);
  const homeLink = document.createElement('a');
  homeLink.className = 'contact-row btn btn--fill-pink';
  homeLink.href = '../../index.html';
  homeLink.textContent = 'Вернуться на Главную';
  homeLink.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    closeSheet(() => window.location.assign(homeLink.href));
  });
  homeRow.appendChild(homeLink);
  sheet.querySelector('[data-rows]').appendChild(homeRow);
  function setActive(item) {
    if (current === item) return;
    current = item;
    items.forEach(entry => {
      [entry.link, entry.mobileLink].forEach(link => {
        if (entry === item) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      entry.marker.classList.toggle('is-current', entry === item);
    });
  }
  function sectionTop(section) {
    // A sticky section's visual rect moves; navigation uses its flow position.
    const anchor = section.classList.contains('overlap-sticky') ? section.parentElement : section;
    return anchor.getBoundingClientRect().top;
  }
  function update() {
    frame = 0;
    if (performance.now() < manualUntil) return;
    const offset = parseFloat(getComputedStyle(items[0].section).scrollMarginTop) + 24;
    let active = items[0];
    for (const item of items) if (sectionTop(item.section) <= offset) active = item;
    const last = items.at(-1);
    const lastRect = last.section.getBoundingClientRect();
    // A short final section can be fully readable before its heading reaches
    // the top threshold or the page reaches its trailing padding.
    const lastFullyVisible = lastRect.top >= offset && lastRect.bottom <= innerHeight;
    const atPageEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    if (window.scrollY > 0 && (lastFullyVisible || atPageEnd)) active = last;
    setActive(active);
  }
  function scheduleUpdate() { if (!frame) frame = requestAnimationFrame(update); }
  function setExpanded(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть оглавление' : 'Оглавление проекта');
  }
  function setPopover(open, restoreFocus = false) {
    if (restoreFocus) toggle.focus({ preventScroll: true });
    if (!desktop.matches && !open) {
      if (popoverAnimation) popoverAnimation.cancel();
      popoverAnimation = null;
      popoverOpen = false;
      panel.hidden = true;
      panel.inert = true;
      setExpanded(false);
      return;
    }
    if (open === popoverOpen) return;
    popoverOpen = open;
    const previous = popoverAnimation ? {
      clipPath: getComputedStyle(panel).clipPath,
      opacity: getComputedStyle(panel).opacity,
      transform: getComputedStyle(panel).transform
    } : null;
    if (popoverAnimation) popoverAnimation.cancel();
    popoverAnimation = null;
    setExpanded(open);
    panel.inert = !open;
    if (open) {
      panel.hidden = false;
      if (current) desktopScroll.scrollTop = Math.max(0, current.link.offsetTop - desktopScroll.clientHeight / 2);
      updateScrollFade();
    }
    if (reducedMotion.matches || !desktop.matches) { panel.hidden = !open; return; }
    panel.hidden = false;
    const bounds = panel.getBoundingClientRect(), trigger = toggle.getBoundingClientRect();
    const top = Math.max(0, Math.min(bounds.height - 64, trigger.top - bounds.top));
    const folded = {
      clipPath: `inset(${top}px 0px ${Math.max(0, bounds.height - top - 64)}px ${bounds.width - 12}px round 24px)`,
      opacity: 0, transform: 'translateX(12px) scale(.96)'
    };
    const expanded = { clipPath: 'inset(0px 0px 0px 0px round 24px)', opacity: 1, transform: 'translateX(0px) scale(1)' };
    const animation = panel.animate([previous || (open ? folded : expanded), open ? expanded : folded], {
      duration: open ? 650 : 400,
      easing: open ? 'cubic-bezier(.22,1,.36,1)' : 'cubic-bezier(.65,0,.35,1)',
      fill: 'both'
    });
    popoverAnimation = animation;
    animation.finished.then(() => {
      if (popoverAnimation !== animation) return;
      panel.hidden = !popoverOpen;
      animation.cancel();
      popoverAnimation = null;
    }).catch(() => {});
  }
  function setOrigin() {
    const r = surface.getBoundingClientRect(), t = toggle.getBoundingClientRect();
    const clamp = (v, max) => Math.max(0, Math.min(max, v));
    const top = clamp(t.top - r.top, r.height), left = clamp(t.left - r.left, r.width);
    surface.style.setProperty('--contact-origin', `inset(${top}px ${clamp(r.right - t.right, r.width - left)}px ${clamp(r.bottom - t.bottom, r.height - top)}px ${left}px round 32px)`);
  }
  function finishClose() {
    clearTimeout(closeTimer);
    sheet.hidden = true;
    sheet.classList.remove('is-closing');
    inactive.forEach(el => { el.inert = false; });
    inactive = [];
    document.documentElement.classList.remove('work-toc-scroll-lock');
    setExpanded(false);
    const done = afterClose;
    afterClose = null;
    if (done) done();
    else toggle.focus({ preventScroll: true });
  }
  function closeSheet(done) {
    if (sheet.hidden || sheet.classList.contains('is-closing')) return;
    afterClose = done;
    if (reducedMotion.matches) { finishClose(); return; }
    sheet.classList.add('is-closing');
    closeTimer = setTimeout(finishClose, 750);
  }
  surface.addEventListener('animationend', event => {
    if (event.target === surface && event.animationName === 'contact-surface-out') finishClose();
  });
  function openSheet() {
    if (!sheet.hidden) return;
    sheet.hidden = false;
    scrollBody.scrollTop = 0;
    updateScrollFade();
    setOrigin();
    inactive = [...document.body.children].filter(el => el !== sheet && !el.inert);
    inactive.forEach(el => { el.inert = true; });
    document.documentElement.classList.add('work-toc-scroll-lock');
    setExpanded(true);
    closeButton.focus({ preventScroll: true });
  }
  function syncMode() {
    if (!sheet.hidden) finishClose();
    setPopover(false);
    toggle.classList.toggle('btn--scroll-shadow', !desktop.matches);
    toggle.setAttribute('aria-controls', desktop.matches ? panel.id : sheet.id);
    if (desktop.matches) toggle.removeAttribute('aria-haspopup');
    else toggle.setAttribute('aria-haspopup', 'dialog');
  }
  toggle.addEventListener('click', () => desktop.matches ? setPopover(!popoverOpen) : openSheet());
  root.addEventListener('pointerenter', event => {
    if (desktop.matches && hover.matches && event.pointerType === 'mouse') setPopover(true);
  });
  root.addEventListener('pointerleave', () => {
    if (desktop.matches && !root.contains(document.activeElement)) setPopover(false);
  });
  root.addEventListener('focusout', event => {
    if (desktop.matches && !root.contains(event.relatedTarget)) setPopover(false);
  });
  document.addEventListener('pointerdown', event => {
    if (desktop.matches && !root.contains(event.target)) setPopover(false);
  });
  sheet.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => closeSheet()));
  document.addEventListener('keydown', event => {
    if (!sheet.hidden) {
      if (event.key === 'Escape') { event.preventDefault(); closeSheet(); }
      if (event.key === 'Tab') {
        const first = items[0].mobileLink, last = closeButton;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    } else if (event.key === 'Escape' && !panel.hidden) setPopover(false, true);
  });
  function navigate(item) {
    cancelAnimationFrame(scrollAnimation);
    scrollAnimation = 0;
    setActive(item);
    history.pushState(null, '', item.link.hash);
    item.section.focus({ preventScroll: true });
    const start = window.scrollY;
    const target = () => {
      const offset = parseFloat(getComputedStyle(item.section).scrollMarginTop) || 0;
      return Math.max(0, Math.min(
        sectionTop(item.section) + window.scrollY - offset,
        document.documentElement.scrollHeight - innerHeight
      ));
    };
    const distance = Math.abs(target() - start);
    if (reducedMotion.matches || distance < 1) {
      window.scrollTo({ top: target(), behavior: 'instant' });
      manualUntil = 0;
      scheduleUpdate();
      return;
    }
    const duration = Math.min(1500, Math.max(700, 650 + distance * .16));
    const started = performance.now();
    manualUntil = Infinity;
    function tick(now) {
      const progress = Math.min(1, (now - started) / duration);
      // Smooth acceleration and deceleration, including long jumps through the case.
      const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      window.scrollTo({ top: start + (target() - start) * eased, behavior: 'instant' });
      if (progress < 1) scrollAnimation = requestAnimationFrame(tick);
      else {
        scrollAnimation = 0;
        manualUntil = 0;
        scheduleUpdate();
      }
    }
    scrollAnimation = requestAnimationFrame(tick);
  }
  items.forEach(item => [item.link, item.mobileLink].forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (!sheet.hidden) closeSheet(() => navigate(item));
    else { setPopover(false); navigate(item); }
  })));
  function cancelManual() {
    cancelAnimationFrame(scrollAnimation);
    scrollAnimation = 0;
    manualUntil = 0;
    scheduleUpdate();
  }
  window.addEventListener('wheel', cancelManual, { passive: true });
  window.addEventListener('touchstart', cancelManual, { passive: true });
  window.addEventListener('pointerdown', cancelManual, { passive: true });
  window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(event.key)) cancelManual();
  });
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', () => { scheduleUpdate(); if (!sheet.hidden) setOrigin(); });
  window.addEventListener('hashchange', cancelManual);
  window.addEventListener('load', scheduleUpdate);
  desktop.addEventListener('change', syncMode);
  root.hidden = false;
  syncMode();
  update();
})();
