/* Stretch the existing DS button hit area across the summary, keeping one
   keyboard focus stop and leaving the expanded description outside it. */
function measureExperienceSummary(summary) {
  var button = summary.querySelector('[data-experience-toggle]');
  var row = summary.getBoundingClientRect();
  var action = button.getBoundingClientRect();
  if (!row.width) return;
  button.style.setProperty('--hit-left', (row.left - action.left) + 'px');
  button.style.setProperty('--hit-top', (row.top - action.top) + 'px');
  button.style.setProperty('--hit-width', row.width + 'px');
  button.style.setProperty('--hit-height', row.height + 'px');
}

var experienceSummaries = document.querySelectorAll('.about-job__summary');
var experienceObserver = new ResizeObserver(function (entries) {
  entries.forEach(function (entry) { measureExperienceSummary(entry.target); });
});
experienceSummaries.forEach(function (summary) {
  measureExperienceSummary(summary);
  experienceObserver.observe(summary);
});
document.fonts.ready.then(function () {
  experienceSummaries.forEach(measureExperienceSummary);
});

/* Each role opens independently and remains usable with keyboard navigation. */
document.querySelectorAll('[data-experience-toggle]').forEach(function (button) {
  var panel = document.getElementById(button.getAttribute('aria-controls'));
  button.addEventListener('click', function () {
    var expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    panel.hidden = !expanded;
    button.querySelector('.icon').className = 'icon icon--' + (expanded ? 'minus' : 'plus');
  });
});
