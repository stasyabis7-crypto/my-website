/* Stable hero height across mobile browser toolbar changes. */
(function () {
  'use strict';
  const root = document.documentElement;
  // In-app browsers (Telegram) resize the viewport as their bars show and hide, and
  // svh/dvh follow it. Freeze the hero's viewport height; refresh only when the width
  // changes on touch devices. Desktop also follows height-only resizes. --hero-vh is the visible height (home hero);
  // --hero-vh-full also counts the area under the bars (flush-bottom project heroes).
  let heroWidth = innerWidth;
  const desktop = matchMedia('(hover: hover) and (pointer: fine)');
  const unitHeight = unit => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100' + unit + ';visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    const height = probe.offsetHeight;
    probe.remove();
    return height;
  };
  const freezeHeroHeight = () => {
    const visible = Math.max(innerHeight, unitHeight('svh'));
    root.style.setProperty('--hero-vh', visible + 'px');
    root.style.setProperty('--hero-vh-full', Math.max(visible, unitHeight('lvh')) + 'px');
    root.toggleAttribute('data-hero-short', visible <= 700);
    root.toggleAttribute('data-hero-short-landscape', visible <= 550);
  };
  freezeHeroHeight();
  addEventListener('resize', () => {
    if (desktop.matches || innerWidth !== heroWidth) { heroWidth = innerWidth; freezeHeroHeight(); }
  }, { passive: true });
})();
