(() => {
  const image = document.querySelector('.project-hero__image');
  if (!image) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let animation;
  const art = image.parentElement;
  // Hold the first frame before the curtain opens. Never expose the final
  // image position and then jump backwards to start the entrance.
  if (!reduced.matches && art.animate) {
    animation = art.animate([
      { transform: 'translateY(100%)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 }
    ], { duration: 1100, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
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
      animation.play();
      animation.finished.then(() => animation.cancel()).catch(() => {});
    }
  }
  reveal();
  reduced.addEventListener('change', () => {
    if (reduced.matches) animation?.cancel();
  });
})();
