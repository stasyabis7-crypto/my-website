(() => {
  const image = document.querySelector('.project-hero__image');
  if (!image) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let animation;
  const art = image.parentElement;
  const hero = image.closest('.project-hero');
  const title = hero.querySelector('.mood-title');
  const measure = document.createElement('canvas').getContext('2d');
  function fitTitle() {
    title.style.removeProperty('--project-hero-title-size');
    if (innerWidth >= 1000 || !measure) return;
    const style = getComputedStyle(title);
    const size = parseFloat(style.fontSize);
    measure.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
    const words = title.textContent.trim().split(/[\s\u00ad]+/);
    const widest = Math.max(...words.map(word => measure.measureText(word).width));
    if (widest > title.clientWidth && title.clientWidth > 0) {
      title.style.setProperty('--project-hero-title-size', `${size * title.clientWidth / (widest + 1)}px`);
    }
  }
  new ResizeObserver(fitTitle).observe(title);
  document.fonts.ready.then(fitTitle);
  function entranceFrames() {
    // Follow the actual layout, including a short tablet in landscape mode.
    const columns = getComputedStyle(hero.querySelector('.mood-stage')).gridTemplateColumns;
    const sideways = hero.classList.contains('project-hero--landscape') ||
      columns.trim().split(/\s+/).length > 1;
    return [
      { transform: sideways ? 'translateX(100%)' : 'translateY(100%)', opacity: 0 },
      { transform: 'translate(0, 0)', opacity: 1 }
    ];
  }
  // Hold the first frame before the curtain opens. Never expose the final
  // image position and then jump backwards to start the entrance.
  if (!reduced.matches && art.animate) {
    animation = art.animate(entranceFrames(), { duration: 1100, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
    animation.pause();
    animation.currentTime = 0;
  }
  // The transition waits for this preparation, not for the animation to end.
  window.projectHeroReady = image.decode().catch(() => {
    animation?.cancel();
    animation = null;
  });
  // Start after the shared entrance ribbons, so the rise remains visible.
  function pageVisible() {
    const root = document.documentElement;
    const transitioning = () => root.matches('.is-transition-pending, .is-transition-boot, .is-transition-covering, .is-transition-revealing');
    if (!transitioning()) return Promise.resolve();
    return new Promise(resolve => {
      const observer = new MutationObserver(() => {
        if (!transitioning()) { observer.disconnect(); resolve(); }
      });
      observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    });
  }
  async function reveal() {
    await Promise.all([window.projectHeroReady, pageVisible()]);
    if (!reduced.matches && animation) {
      animation.effect.setKeyframes(entranceFrames());
      animation.play();
      animation.finished.then(() => animation.cancel()).catch(() => {});
    }
  }
  reveal();
  reduced.addEventListener('change', () => {
    if (reduced.matches) animation?.cancel();
  });
})();
