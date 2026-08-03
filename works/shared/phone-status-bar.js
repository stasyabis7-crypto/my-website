(function () {
  class PhoneStatusBar extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: 'open' });
      const time = this.getAttribute('time') || '9:41';
      const levels = this.getAttribute('levels-src') || '';
      root.innerHTML = `
        <style>
          :host{position:absolute;z-index:30;inset:0 0 auto;display:block;height:48px;background:var(--phone-status-bg,#fff);color:var(--phone-status-color,#000);font-family:inherit;font-size:15px;font-weight:800;line-height:1}
          .time{position:absolute;left:52px;top:20px}
          .island{position:absolute;left:50%;top:12px;width:116px;height:34px;transform:translateX(-50%);border-radius:22px;background:#050505;box-shadow:inset 0 0 0 1px rgba(255,255,255,.03)}
          .camera{position:absolute;right:12px;top:11px;width:9px;height:9px;border-radius:50%;background:#111b35;box-shadow:inset 0 0 4px #3357a6}
          .levels{position:absolute;right:0;top:21px;display:block;width:124px;height:12px;object-fit:contain;object-position:left center}
        </style>
        <span class="time">${time}</span>
        <span class="island" aria-hidden="true"><i class="camera"></i></span>
        ${levels ? `<img class="levels" src="${levels}" alt="">` : ''}
      `;
    }
  }
  if (!customElements.get('phone-status-bar')) customElements.define('phone-status-bar', PhoneStatusBar);
})();
