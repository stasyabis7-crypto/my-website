(function () {
  class InteractionCursor extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: 'open' });
      const src = this.getAttribute('src') || '';
      root.innerHTML = `<style>
        :host{position:absolute;z-index:55;left:0;top:0;width:30px;height:30px;display:block;pointer-events:none;opacity:0;transform:translate(-50%,-15%) scale(1);will-change:left,top,transform,opacity}
        img{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 2px 2px rgba(0,0,0,.18))}
        :host(.pressing){animation:shared-pointer-press .62s cubic-bezier(.2,.8,.2,1)}
        @keyframes shared-pointer-press{0%{opacity:0;transform:translate(-50%,-15%) scale(.92)}18%{opacity:1;transform:translate(-50%,-15%) scale(1)}48%{opacity:1;transform:translate(-50%,-15%) scale(.78)}72%{opacity:1;transform:translate(-50%,-15%) scale(1)}100%{opacity:0;transform:translate(-50%,-15%) scale(1)}}
        @media(prefers-reduced-motion:reduce){:host{display:none}}
      </style><img src="${src}" alt="">`;
    }
    press(x, y) {
      this.style.left = x + 'px';
      this.style.top = y + 'px';
      this.classList.remove('pressing');
      void this.offsetWidth;
      this.classList.add('pressing');
    }
  }
  if (!customElements.get('interaction-cursor')) customElements.define('interaction-cursor', InteractionCursor);
})();
