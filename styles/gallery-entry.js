/* Resolve the incoming anchor after the shared sticky-section layout settles. */
(() => {
  if (location.hash !== '#works-gallery') return;
  const gallery = document.getElementById('works-gallery');
  if (!gallery) return;
  let interacted = false;
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(type => {
    window.addEventListener(type, () => { interacted = true; }, { once: true, passive: true });
  });
  function align() {
    if (!interacted && location.hash === '#works-gallery') {
      gallery.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }
  requestAnimationFrame(() => requestAnimationFrame(align));
  document.fonts.ready.then(align);
  window.addEventListener('load', align, { once: true });
  window.addEventListener('pageshow', event => {
    // Restored history retains the visitor's position; new navigation uses the anchor.
    if (event.persisted) interacted = true;
  });
})();
