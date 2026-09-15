(() => {
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function card(project, index, count) {
    const title = escape(project.title);
    return `<article class="project-card project-card--${escape(project.format)}" data-index="${index}" role="group" aria-roledescription="слайд" aria-label="${index + 1} из ${count}: ${title}">
      <div class="project-card__media" data-action-hover>
        <div class="project-card__cover" style="--cover-color:${escape(project.color)}">
          <img class="project-card__image" src="${escape(project.image)}" srcset="${escape(project.srcset)}" sizes="(max-width: 599px) 66vw, (max-width: 999px) 40vw, 28vw" alt="${title}" loading="lazy" decoding="async" draggable="false">
          ${project.href ? '' : '<span class="project-card__badge text-body">В работе</span>'}
        </div>
        ${project.href ? `<a class="project-card__link" href="${escape(project.href)}" aria-label="Открыть проект: ${title}" tabindex="-1"></a><a class="project-card__open btn btn--fill-white btn--icon-only btn--icon-diagonal-motion" href="${escape(project.href)}" aria-label="Открыть проект: ${title}"><span class="icon icon--arrow-diagonal" aria-hidden="true"></span></a>` : ''}
      </div>
      <div class="project-card__copy"><h3 class="project-card__text text-h2">${title}</h3><p class="project-card__text text-body">${escape(project.description)}</p></div>
    </article>`;
  }
  document.querySelectorAll('[data-projects]').forEach(root => {
    const projects = window.projectCollections?.[root.dataset.projects];
    if (!projects?.length) return;
    const count = projects.length;
    const viewport = root.querySelector('.project-slider__viewport');
    const track = root.querySelector('.project-slider__track');
    const status = root.querySelector('.project-slider__status');
    track.innerHTML = Array.from({length: 3}, () => projects.map((p, i) => card(p, i, count)).join('')).join('');
    const cards = [...track.children];
    let index = count, step = 0, busy = false, timer, pointer, dragged = false, pending = 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const tooltip = document.createElement('div');
    tooltip.className = 'project-slider__tooltip'; tooltip.role = 'tooltip'; tooltip.hidden = true;
    tooltip.id = `project-tooltip-${root.dataset.projects}`;
    document.body.append(tooltip);
    let tooltipOwner;
    function hideTooltip() { tooltip.hidden = true; tooltipOwner?.removeAttribute('aria-describedby'); tooltipOwner = null; }
    function accessibility() {
      const visible = Math.ceil(viewport.clientWidth / step);
      cards.forEach((el, i) => { el.inert = i < index || i >= index + visible; el.setAttribute('aria-hidden', String(el.inert)); });
    }
    function position(animate = false, offset = 0) {
      track.style.transition = animate && !reduced.matches ? 'transform 450ms cubic-bezier(.22,.7,.25,1)' : 'none';
      track.style.transform = `translate3d(${-index * step + offset}px,0,0)`;
    }
    function finish() {
      clearTimeout(timer);
      const focused = document.activeElement;
      const focusedCard = focused?.closest('.project-card');
      const focusIndex = focusedCard?.dataset.index;
      index = count + ((index % count) + count) % count;
      position(); busy = false; accessibility();
      if (focusedCard?.inert && focusIndex !== undefined) cards[index + ((Number(focusIndex) - index % count + count) % count)]?.querySelector('.project-card__open')?.focus({preventScroll:true});
      if (pending) { const direction = Math.sign(pending); pending -= direction; requestAnimationFrame(() => move(direction)); }
    }
    function move(direction) {
      if (busy) { pending = Math.max(-count, Math.min(count, pending + direction)); return; }
      hideTooltip(); root.dataset.moved = ''; busy = true; index += direction; position(true);
      const current = ((index % count) + count) % count;
      status.textContent = `${current + 1} из ${count}. ${projects[current].title}`;
      timer = setTimeout(finish, reduced.matches ? 0 : 470);
    }
    root.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => move(Number(button.dataset.direction))));
    viewport.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); }
      if (e.key === 'Escape') hideTooltip();
    });
    viewport.addEventListener('pointerdown', e => {
      if (e.button !== 0 || busy) return;
      pointer = {id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0}; dragged = false;
    });
    viewport.addEventListener('pointermove', e => {
      if (!pointer || pointer.id !== e.pointerId) return;
      const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
      if (!dragged && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { pointer = null; return; }
      if (Math.abs(dx) > 8) { dragged = true; viewport.setPointerCapture(e.pointerId); hideTooltip(); }
      if (dragged) { pointer.dx = dx; position(false, Math.max(-step, Math.min(step, dx))); }
    });
    function release(e) {
      if (!pointer || e.pointerId !== pointer.id) return;
      const dx = pointer.dx; pointer = null;
      if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
      if (e.type !== 'pointercancel' && Math.abs(dx) > 40) move(dx < 0 ? 1 : -1);
      else position(true);
      setTimeout(() => { dragged = false; }, 0);
    }
    viewport.addEventListener('pointerup', release); viewport.addEventListener('pointercancel', release);
    viewport.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    let wheelLocked = false, wheelTimer;
    viewport.addEventListener('wheel', e => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (!wheelLocked && Math.abs(e.deltaX) > 4) { move(Math.sign(e.deltaX)); wheelLocked = true; }
      clearTimeout(wheelTimer); wheelTimer = setTimeout(() => { wheelLocked = false; }, 180);
    }, {passive: false});
    function showTooltip(el) {
      if (!el.hasAttribute('data-truncated')) return;
      hideTooltip(); tooltipOwner = el; el.setAttribute('aria-describedby', tooltip.id);
      const project = projects[Number(el.closest('.project-card').dataset.index)];
      tooltip.innerHTML = `<div class="text-h2">${escape(project.title)}</div><p class="text-body">${escape(project.description)}</p>`;
      tooltip.hidden = false;
      const rect = el.getBoundingClientRect();
      tooltip.style.left = `${Math.max(16, Math.min(rect.left, innerWidth - tooltip.offsetWidth - 16))}px`;
      tooltip.style.top = `${Math.max(16, Math.min(rect.bottom + 8, innerHeight - tooltip.offsetHeight - 16))}px`;
    }
    root.querySelectorAll('.project-card__text').forEach(el => {
      el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') showTooltip(el); });
      el.addEventListener('pointerleave', hideTooltip);
      el.addEventListener('focus', () => showTooltip(el)); el.addEventListener('blur', hideTooltip);
      el.addEventListener('click', () => { if (tooltipOwner === el) hideTooltip(); else showTooltip(el); });
    });
    document.addEventListener('pointerdown', e => { if (!e.target.closest('.project-card__text')) hideTooltip(); });
    window.addEventListener('scroll', hideTooltip, {passive:true});
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTooltip(); });
    function resize() {
      clearTimeout(timer); busy = false; pending = 0;
      index = count + ((index % count) + count) % count;
      const w = cards[0].getBoundingClientRect().width; step = w + 16;
      cards.forEach(el => {
        if (el.querySelector('.project-card__open')) {
          const a = w - 80;
          el.querySelector('.project-card__cover').style.clipPath = `path("M 32 0 H ${w-32} Q ${w} 0 ${w} 32 V ${a-24} Q ${w} ${a} ${w-24} ${a} H ${a+24} Q ${a} ${a} ${a} ${a+24} V ${w-24} Q ${a} ${w} ${a-24} ${w} H 32 Q 0 ${w} 0 ${w-32} V 32 Q 0 0 32 0 Z")`;
        }
        el.querySelectorAll('.project-card__text').forEach(text => {
          const truncated = text.scrollHeight > text.clientHeight + 1;
          text.toggleAttribute('data-truncated', truncated);
          if (truncated) text.tabIndex = 0; else text.removeAttribute('tabindex');
        });
      });
      hideTooltip(); position(); accessibility();
    }
    new ResizeObserver(resize).observe(viewport);
    document.fonts.ready.then(resize);
    resize();
  });
})();
