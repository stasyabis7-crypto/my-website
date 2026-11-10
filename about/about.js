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
