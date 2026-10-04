/* Home video banner: poster first, clip fades in once it plays; page-entry copy reveal. */
(() => {
  'use strict';
  const hero = document.querySelector('.mood-hero--video');
  if (!hero) return;
  const title = hero.querySelector('.mood-title');
  // Preserve the heading's accessible name and spaces, including Cyrillic copy.
  const words = title.textContent.trim().split(/\s+/);
  title.setAttribute('aria-label', title.textContent.trim());
  title.replaceChildren(...words.flatMap((word, i) => {
    const span = document.createElement('span');
    span.className = 'hero-reveal-word';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = word;
    return i ? [document.createTextNode(' '), span] : [span];
  }));
  hero.classList.add('is-reveal-pending');
  const reveal = () => {
    // The copy never waits for the clip, fonts or the page loader.
    if (document.hidden) return;
    const lines = [];
    title.querySelectorAll('.hero-reveal-word').forEach(word => {
      if (!lines.includes(word.offsetTop)) lines.push(word.offsetTop);
      word.style.setProperty('--reveal-delay', `${lines.indexOf(word.offsetTop) * .08}s`);
    });
    hero.classList.remove('is-reveal-pending');
    hero.classList.add('is-revealing');
  };
  reveal();
  addEventListener('pageshow', event => {
    if (!event.persisted) return;
    hero.classList.remove('is-revealing');
    hero.classList.add('is-reveal-pending');
    void hero.offsetWidth;
    reveal();
  });

  const media = hero.querySelector('.hero-video');
  const clip = hero.querySelector('.hero-video__clip');
  if (!media || !clip) return;
  const portrait = matchMedia('(max-aspect-ratio: 4/5)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  let wanted = '';
  const clips = new Map();
  // The poster stays underneath, so a slow or failed clip never leaves a hole.
  clip.addEventListener('playing', () => clip.classList.add('is-playing'));
  // The whole clip is downloaded into memory before it starts: streaming it
  // made playback stall mid-way and at every loop on a slow connection.
  const download = source => {
    if (!clips.has(source)) {
      clips.set(source, fetch(source).then(response => {
        if (!response.ok) throw new Error(response.status);
        return response.blob();
      }).then(blob => URL.createObjectURL(blob)));
    }
    return clips.get(source);
  };
  const playback = () => {
    if (!clip.getAttribute('src')) return;
    if (visible && !document.hidden && !reduced.matches) clip.play().catch(() => {});
    else clip.pause();
  };
  const update = () => {
    if (reduced.matches || navigator.connection?.saveData) { clip.pause(); return; }
    const source = portrait.matches ? media.dataset.videoPortrait : media.dataset.videoLandscape;
    if (source === wanted) { playback(); return; }
    wanted = source;
    download(source).then(url => {
      if (wanted !== source) return;
      clip.classList.remove('is-playing');
      clip.muted = true;
      clip.src = url;
      playback();
    }).catch(() => {});
  };
  new IntersectionObserver(entries => {
    visible = entries[entries.length - 1].isIntersecting;
    playback();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (hero.classList.contains('is-reveal-pending')) reveal();
    playback();
  });
  portrait.addEventListener('change', update);
  reduced.addEventListener('change', update);
  // The clip is decoration: it starts downloading only after the page itself
  // has loaded, so it never competes with styles, fonts and project covers.
  if (document.readyState === 'complete') update();
  else addEventListener('load', update, { once: true });
})();
