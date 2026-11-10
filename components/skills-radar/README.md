# Skills radar

Skills profile on the About page between the portrait and work experience. Native SVG with a periodic cubic spline, five reference rings, eight skills and no numeric score claims. The silhouette follows the supplied reference; it is an illustrative profile, not an independently measured assessment.

- All labels and points are native DS buttons, including keyboard focus and shared height.
- Desktop: click a label or point for a black native popover. Use the close icon, click outside, or press Escape to dismiss. Opacity and a 4px shift ease in and out over 320–360ms; discrete display/overlay transitions preserve the exit in the top layer.
- Below 700px: crop SVG margins to retain a large square plot; numbered nodes map to a two-column list (one column below 360px). Plot and list markers share a shared DS control size and black numerals; selected markers use a solid blue fill, white numerals and no border. Both open a native modal bottom sheet, with focus trapping, Escape, close button, backdrop dismissal and downward header swipe.
- Regression checks: `node scripts/skills-radar.test.js` (also in `npm run check`).
- Reveal runs once on intersection. The line animates through a scaling SVG mask; after reveal the mask is removed so the non-scaling contour stays continuous at every size. Reduced motion and no-JS fallbacks keep content readable.
- Skills and explanations: `skills-radar.js`; static labels/geometry: `about/index.html`. Update both when changing skills. Button visuals belong in `styles/buttons.css`.
- Component CSS/JS are linked directly from the About page; `scripts/version-gallery-assets.js` includes both component files for CDN versioning.

Russian source labels and explanations are translated by `site/language.js` using `site/languages/english-copy.js`. Update both languages together.
