(function () {
  const styleId = 'shared-tap-indicator-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      tap-indicator{position:absolute;z-index:55;left:0;top:0;width:62px;height:62px;display:block;pointer-events:none;opacity:0;transform:translate(-50%,-50%) scale(1);transition:opacity .22s ease,transform .18s ease;will-change:left,top,transform,opacity}
      tap-indicator .tap-indicator__circle{display:block;width:100%;height:100%;border:1px solid rgba(255,255,255,.8);border-radius:50%;background:radial-gradient(circle at 34% 28%,rgba(255,255,255,.78),rgba(255,255,255,.18) 58%,rgba(255,255,255,.08));box-shadow:0 9px 24px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.8);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
      @media(prefers-reduced-motion:reduce){tap-indicator{display:none}}
    `;
    document.head.appendChild(style);
  }

  function playTap(element, x, y) {
    element.style.left = x + 'px';
    element.style.top = y + 'px';
    (element._tapTimers || []).forEach(clearTimeout);
    element.style.transition = 'none';
    element.style.opacity = '0';
    element.style.transform = 'translate(-50%,-50%) scale(1)';
    void element.offsetWidth;
    element.style.transition = 'opacity .22s ease, transform .18s ease';
    element.style.opacity = '1';
    element._tapTimers = [
      setTimeout(() => { element.style.transform = 'translate(-50%,-50%) scale(.76)'; }, 320),
      setTimeout(() => { element.style.transform = 'translate(-50%,-50%) scale(1)'; }, 500),
      setTimeout(() => { element.style.opacity = '0'; }, 760)
    ];
  }

  window.playMobileTap = playTap;
  class TapIndicator extends HTMLElement {
    connectedCallback() {
      if (!this.querySelector('.tap-indicator__circle')) this.innerHTML = '<span class="tap-indicator__circle"></span>';
    }
    press(x, y) { playTap(this, x, y); }
  }
  if (!customElements.get('tap-indicator')) customElements.define('tap-indicator', TapIndicator);
})();
