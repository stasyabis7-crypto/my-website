(function () {
  class TapIndicator extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      this.attachShadow({ mode: 'open' }).innerHTML = `<style>
        :host{position:absolute;z-index:55;left:0;top:0;width:62px;height:62px;display:block;pointer-events:none;opacity:0;transform:translate(-50%,-50%) scale(1);will-change:left,top,transform,opacity}
        .circle{width:100%;height:100%;border:1px solid rgba(255,255,255,.8);border-radius:50%;background:radial-gradient(circle at 34% 28%,rgba(255,255,255,.78),rgba(255,255,255,.18) 58%,rgba(255,255,255,.08));box-shadow:0 9px 24px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.8);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
        @media(prefers-reduced-motion:reduce){:host{display:none}}
      </style><span class="circle"></span>`;
    }
    press(x, y) {
      this.style.left = x + 'px';
      this.style.top = y + 'px';
      this.getAnimations().forEach(function (animation) { animation.cancel(); });
      this.animate([
        { opacity: 0, transform: 'translate(-50%,-50%) scale(1)', offset: 0 },
        { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .22 },
        { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .42 },
        { opacity: 1, transform: 'translate(-50%,-50%) scale(.76)', offset: .62 },
        { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .82 },
        { opacity: 0, transform: 'translate(-50%,-50%) scale(1)', offset: 1 }
      ], { duration: 1100, easing: 'ease', fill: 'none' });
    }
  }
  if (!customElements.get('tap-indicator')) customElements.define('tap-indicator', TapIndicator);
})();
