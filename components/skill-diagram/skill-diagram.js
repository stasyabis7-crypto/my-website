(function () {
  'use strict';

  var root = document.querySelector('[data-skill-diagram]');
  if (!root) return;
  var plot = root.querySelector('[data-skill-plot]');
  var buttons = Array.prototype.slice.call(root.querySelectorAll('.skill-diagram__skill'));
  var tip = document.getElementById('skill-detail');
  var sheet = document.getElementById('skill-sheet');
  var sheetTitle = document.getElementById('skill-sheet-title');
  var sheetCopy = sheet.querySelector('.skill-diagram__sheet-copy');
  var tipTitle = tip.querySelector('.skill-diagram__tip-title');
  var tipCopy = tip.querySelector('.skill-diagram__tip-copy');
  var closeBtn = sheet.querySelector('[data-skill-close]');
  var mobile = matchMedia('(max-width: 699px)');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var html = document.documentElement;
  var openButton = null;
  var sheetTimer = 0;

  var levels = 5;
  var radius = 38;
  var center = 50;

  function mix(a, b, t) {
    return a.map(function (channel, index) { return Math.round(channel + (b[index] - channel) * t); });
  }
  function hex(rgb) {
    return '#' + rgb.map(function (channel) { return channel.toString(16).padStart(2, '0'); }).join('');
  }
  function pixelColor(distance) {
    var stops = [
      [0, [255, 61, 31]],
      [0.28, [255, 90, 70]],
      [0.52, [255, 126, 150]],
      [0.76, [247, 196, 206]],
      [1, [253, 236, 240]]
    ];
    var t = Math.max(0, Math.min(1, distance));
    for (var i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        var span = stops[i][0] - stops[i - 1][0];
        return hex(mix(stops[i - 1][1], stops[i][1], span ? (t - stops[i - 1][0]) / span : 0));
      }
    }
    return hex(stops[stops.length - 1][1]);
  }
  function point(angle, score) {
    var rad = angle * Math.PI / 180;
    var r = (score / levels) * radius;
    return [center + Math.cos(rad) * r, center + Math.sin(rad) * r];
  }
  function smooth(points) {
    var n = points.length;
    var d = '';
    for (var i = 0; i < n; i++) {
      var p0 = points[(i - 1 + n) % n];
      var p1 = points[i];
      var p2 = points[(i + 1) % n];
      var p3 = points[(i + 2) % n];
      if (i === 0) d += 'M' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2);
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(2) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(2) +
        ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(2) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(2) +
        ' ' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2);
    }
    return d + 'Z';
  }

  var skills = buttons.map(function (button) {
    return {
      button: button,
      angle: Number(button.getAttribute('data-angle')),
      score: Number(button.getAttribute('data-score'))
    };
  });
  var samples = skills.map(function (skill) { return point(skill.angle, skill.score); });
  var path = smooth(samples);
  var cols = 10;
  var cell = 100 / cols;
  var pixels = '';
  for (var y = 0; y < cols; y++) {
    for (var x = 0; x < cols; x++) {
      var dx = (x + 0.5) / cols - 0.5;
      var dy = (y + 0.5) / cols - 0.5;
      pixels += '<rect x="' + (x * cell).toFixed(2) + '" y="' + (y * cell).toFixed(2) +
        '" width="' + (cell + 0.08).toFixed(2) + '" height="' + (cell + 0.08).toFixed(2) +
        '" fill="' + pixelColor(Math.min(1, Math.hypot(dx, dy) / 0.4)) + '"/>';
    }
  }
  var rings = '';
  for (var level = 1; level <= levels; level++) {
    rings += '<circle cx="' + center + '" cy="' + center + '" r="' + (radius * level / levels).toFixed(2) + '"/>';
  }
  var spokes = skills.map(function (skill) {
    var end = point(skill.angle, levels);
    return '<line x1="' + center + '" y1="' + center + '" x2="' + end[0].toFixed(2) + '" y2="' + end[1].toFixed(2) + '"/>';
  }).join('');
  var dots = skills.map(function (skill, index) {
    var dot = samples[index];
    return '<g class="skill-diagram__vertex" data-index="' + index + '">' +
      '<circle class="skill-diagram__dot-hit" cx="' + dot[0].toFixed(2) + '" cy="' + dot[1].toFixed(2) + '" r="4.2"/>' +
      '<circle class="skill-diagram__dot" cx="' + dot[0].toFixed(2) + '" cy="' + dot[1].toFixed(2) + '" r="1.15"/>' +
      '</g>';
  }).join('');

  plot.innerHTML = '<svg viewBox="0 0 100 100" role="img" aria-labelledby="skill-diagram-heading">' +
    '<defs><pattern id="skill-pixels" patternUnits="userSpaceOnUse" width="100" height="100">' + pixels + '</pattern></defs>' +
    '<g class="skill-diagram__shape"><path class="skill-diagram__shape-fill" d="' + path + '" fill="url(#skill-pixels)"/>' +
    '<path class="skill-diagram__shape-line" data-skill-line d="' + path + '"/></g>' +
    '<g class="skill-diagram__grid">' + rings + spokes + '</g>' + dots + '</svg>';

  var line = plot.querySelector('[data-skill-line]');
  if (!reduced.matches && line.getTotalLength) {
    var length = line.getTotalLength();
    line.style.strokeDasharray = String(length);
    line.style.strokeDashoffset = String(length);
    line.getBoundingClientRect();
    line.style.transition = 'stroke-dashoffset 1.05s cubic-bezier(.22,1,.36,1)';
    line.style.strokeDashoffset = '0';
  }

  function labelOf(button) { return button.querySelector('span').textContent; }
  function setExpanded(button) {
    buttons.forEach(function (item) {
      item.setAttribute('aria-expanded', item === button ? 'true' : 'false');
    });
    plot.querySelectorAll('.skill-diagram__dot').forEach(function (dot, index) {
      dot.classList.toggle('is-active', skills[index].button === button);
    });
  }
  function finishSheetClose() {
    clearTimeout(sheetTimer);
    sheet.hidden = true;
    sheet.classList.remove('is-open');
  }
  function closeSheet(restore) {
    if (sheet.hidden) return;
    html.classList.remove('skill-scroll-lock');
    sheet.classList.remove('is-open');
    if (reduced.matches) finishSheetClose();
    else sheetTimer = setTimeout(finishSheetClose, 520);
    if (restore && openButton) openButton.focus();
  }
  function closeTip() {
    tip.classList.remove('is-open');
    tip.hidden = true;
  }
  function closeAll(restore) {
    closeTip();
    closeSheet(restore);
    openButton = null;
    setExpanded(null);
  }
  function placeTip() {
    var chart = root.getBoundingClientRect();
    var anchor = openButton.getBoundingClientRect();
    tip.hidden = false;
    var box = tip.getBoundingClientRect();
    var ax = anchor.left + anchor.width / 2 - chart.left;
    var ay = anchor.top + anchor.height / 2 - chart.top;
    var dx = ax - chart.width / 2;
    var dy = ay - chart.height / 2;
    var len = Math.hypot(dx, dy) || 1;
    var left = ax + (dx / len) * (anchor.width / 2 + 10) - (dx > 0 ? 0 : box.width);
    var top = ay + (dy / len) * (anchor.height / 2 + 8) - box.height / 2;
    if (Math.abs(dx) <= Math.abs(dy)) {
      left = ax - box.width / 2;
      top = ay + (dy > 0 ? anchor.height / 2 + 8 : -anchor.height / 2 - 8 - box.height);
    }
    left = Math.max(8, Math.min(left, chart.width - box.width - 8));
    top = Math.max(8, Math.min(top, chart.height - box.height - 8));
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function showTip(button) {
    closeSheet(false);
    tipTitle.textContent = labelOf(button);
    tipCopy.textContent = button.getAttribute('data-detail');
    placeTip();
    if (reduced.matches) tip.classList.add('is-open');
    else requestAnimationFrame(function () { tip.classList.add('is-open'); });
  }
  function showSheet(button) {
    closeTip();
    clearTimeout(sheetTimer);
    sheetTitle.textContent = labelOf(button);
    sheetCopy.textContent = button.getAttribute('data-detail');
    var wasOpen = !sheet.hidden && sheet.classList.contains('is-open');
    sheet.hidden = false;
    html.classList.add('skill-scroll-lock');
    if (wasOpen || reduced.matches) sheet.classList.add('is-open');
    else requestAnimationFrame(function () { sheet.classList.add('is-open'); });
    closeBtn.focus();
  }
  function toggle(button) {
    if (openButton === button) { closeAll(false); return; }
    openButton = button;
    setExpanded(button);
    if (mobile.matches) showSheet(button);
    else showTip(button);
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () { toggle(button); });
  });
  plot.querySelectorAll('.skill-diagram__vertex').forEach(function (vertex) {
    vertex.addEventListener('click', function () { toggle(skills[Number(vertex.getAttribute('data-index'))].button); });
  });
  sheet.querySelector('[data-skill-dismiss]').addEventListener('click', function () { closeAll(true); });
  closeBtn.addEventListener('click', function () { closeAll(true); });
  document.addEventListener('click', function (event) {
    if (!openButton) return;
    if (event.target.closest('.skill-diagram__skill, .skill-diagram__vertex, .skill-diagram__tip, .skill-diagram__sheet')) return;
    closeAll(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && openButton) closeAll(true);
    if (event.key === 'Tab' && sheet.classList.contains('is-open')) {
      event.preventDefault();
      closeBtn.focus();
    }
  });
  window.addEventListener('resize', function () {
    if (!openButton) return;
    if (mobile.matches) { closeTip(); showSheet(openButton); }
    else { closeSheet(false); showTip(openButton); }
  });
})();
