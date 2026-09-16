(() => {
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function card(project, index, count, variant = 'cover') {
    const title = escape(project.title);
    const isInterface = !/ТГ/i.test(project.title);
    const sizes = project.format === 'phone'
      ? '(max-width: 599px) 66vw, 33vw'
      : '(max-width: 599px) 100vw, 50vw';
    const panel = variant === 'panel';
    const copy = `<div class="project-card__copy"><h3 class="project-card__text text-h2">${title}</h3><p class="project-card__text text-body">${escape(project.description)}</p></div>`;
    const linkTarget = /^https:\/\/t\.me\//i.test(project.href || '') ? ' target="_blank" rel="noopener noreferrer"' : '';
    const link = project.href ? `<a class="project-card__link" href="${escape(project.href)}"${linkTarget} aria-label="Открыть проект: ${title}" tabindex="-1"></a><a class="project-card__open btn ${panel ? 'btn--fill-pink' : 'btn--fill-white'} btn--icon-only btn--icon-diagonal-motion" href="${escape(project.href)}"${linkTarget} aria-label="Открыть проект: ${title}"><span class="icon icon--arrow-diagonal" aria-hidden="true"></span></a>` : '';
    return `<article class="project-card project-card--${escape(project.format)}${isInterface ? ' project-card--interface' : ''}${panel ? ' project-card--panel' : ''}${project.href ? ' project-card--linked' : ''}" ${panel && project.href ? 'data-action-hover' : ''} data-index="${index}" role="listitem" aria-label="${index + 1} из ${count}: ${title}">
      ${panel ? copy : ''}
      <div class="project-card__media" ${project.href ? 'data-action-hover' : ''}>
        <div class="project-card__cover" style="--cover-color:${escape(project.color)}">
          <img class="project-card__image" src="${escape(project.image)}" srcset="${escape(project.srcset)}" sizes="${sizes}" alt="${title}" loading="lazy" decoding="async" draggable="false">
          ${project.href || panel ? '' : '<span class="project-card__badge text-body">В работе</span>'}
        </div>
        ${panel ? '' : link}
      </div>
      ${panel ? link : copy}
    </article>`;
  }
  document.querySelectorAll('[data-projects]').forEach(root => {
    const projects = window.projectCollections?.[root.dataset.projects];
    if (!projects?.length) return;
    const count = projects.length;
    const viewport = root.querySelector('.project-slider__viewport');
    const track = root.querySelector('.project-slider__track');
    track.innerHTML = projects.map((p, i) => card(p, i, count, root.dataset.cardVariant)).join('');
    track.setAttribute('role', 'list');
    const cards = [...track.children];
    const tooltip = document.createElement('div');
    tooltip.className = 'project-slider__tooltip'; tooltip.role = 'tooltip'; tooltip.hidden = true;
    tooltip.id = `project-tooltip-${root.dataset.projects}`;
    document.body.append(tooltip);
    let tooltipOwner;
    function hideTooltip() { tooltip.hidden = true; tooltipOwner?.removeAttribute('aria-describedby'); tooltipOwner = null; }
    // Compare layout heights, not scrollHeight: glyphs may overflow the tight
    // heading line box by a few pixels even when no text is clamped.
    function isTruncated(el) {
      const clampedHeight = el.getBoundingClientRect().height;
      const previousClamp = el.style.webkitLineClamp;
      el.style.webkitLineClamp = 'unset';
      const fullHeight = el.getBoundingClientRect().height;
      el.style.webkitLineClamp = previousClamp;
      return fullHeight > clampedHeight + 0.5;
    }
    function showTooltip(el) {
      if (!isTruncated(el)) { hideTooltip(); return; }
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
      const w = cards[0].getBoundingClientRect().width;
      cards.forEach(el => {
        if (el.hidden) return;
        if (el.querySelector('.project-card__open') && !el.classList.contains('project-card--panel')) {
          // Follow the button circle with a 12px gap and tangent transitions
          // into the cover edges, without the former horizontal shelf.
          const buttonSize = el.querySelector('.project-card__open').getBoundingClientRect().width;
          const center = w - buttonSize / 2;
          const radius = buttonSize / 2 + 12;
          const edge = center - radius;
          el.querySelector('.project-card__cover').style.clipPath = `path("M 32 0 H ${w-32} Q ${w} 0 ${w} 32 V ${edge-24} C ${w} ${edge-8} ${center+18} ${edge} ${center} ${edge} A ${radius} ${radius} 0 0 0 ${edge} ${center} C ${edge} ${center+18} ${edge-8} ${w} ${edge-24} ${w} H 32 Q 0 ${w} 0 ${w-32} V 32 Q 0 0 32 0 Z")`;
        }
        el.querySelectorAll('.project-card__text').forEach(text => {
          const truncated = isTruncated(text);
          text.toggleAttribute('data-truncated', truncated);
          if (truncated) text.tabIndex = 0; else text.removeAttribute('tabindex');
        });
      });
      hideTooltip();
    }
    let measuredWidth = viewport.clientWidth;
    new ResizeObserver(() => {
      if (viewport.clientWidth === measuredWidth) return;
      measuredWidth = viewport.clientWidth; resize();
    }).observe(viewport);
    document.fonts.ready.then(resize);
    resize();
  });
})();
