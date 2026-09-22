(() => {
  const image = document.querySelector('.project-hero__image');
  if (!image) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let animation;
  const art = image.parentElement;
  const hero = image.closest('.project-hero');
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
  // The entrance starts once the image is decoded.
  window.projectHeroReady = image.decode().catch(() => {
    animation?.cancel();
    animation = null;
  });
  async function reveal() {
    await window.projectHeroReady;
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
