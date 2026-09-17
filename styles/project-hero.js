(() => {
  const image = document.querySelector('.project-hero__image');
  if (!image) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let animation;
  const art = image.parentElement;
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
    if (!reduced.matches) art.style.visibility = 'hidden';
    try { await Promise.all([image.decode(), pageVisible()]); }
    catch (_) { art.style.visibility = ''; return; }
    art.style.visibility = '';
    if (reduced.matches || !image.animate) return;
    animation = art.animate([
      { transform: 'translateY(100%)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 }
    ], { duration: 1100, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
  }
  reveal();
  reduced.addEventListener('change', () => {
    if (reduced.matches) animation?.cancel();
  });
})();
