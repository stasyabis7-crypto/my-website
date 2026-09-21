// Content-address the gallery assets: the hosting CDN ignores query versions.
// Run only in the deployment checkout, after source checks have passed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
// Dependencies precede their importers, so a token change also versions its CSS.
const assets = [
  'styles/fonts.css',
  'styles/typography.css',
  'site/typography-rules.js',
  'site/theme.js',
  'styles/buttons.css',
  'components/site-chrome/layout-chrome.js',
  'styles/card-tokens.css',
  'components/hero-mood/hero-layout.css',
  'components/hero-mood/hero-viewport.js',
  'components/hero-mood/hero-spheres.js',
  'components/work-gallery/gallery-entry.js',
  'styles/layout.css',
  'components/project-cards/project-cards.css',
  'components/page-hero/page-hero.css',
  'components/page-hero/page-hero.js',
  'components/page-spinner/page-spinner.js',
  'components/page-spinner/page-spinner.css',
  'components/page-motion/page-motion.js',
  'components/site-chrome/site-chrome.css',
  'components/site-chrome/site-chrome.js',
  'components/case-toc/case-toc.js',
  'components/image-reveal/image-reveal.css',
  'components/image-reveal/image-reveal.js',
  'pages/home/data/sections.js',
  'components/work-gallery/work-gallery.css',
  'components/work-gallery/work-gallery.js',
  // Everything else the pages link: the CDN caches a ?v= URL forever, so a
  // visit during a partial FTP upload would pin an old file under a new URL.
  'styles/scale.css',
  'styles/spacing.css',
  'styles/theme.css',
  'styles/button-hover.css',
  'components/icons/icons.css',
  'components/site-header/header.css',
  'components/site-footer/footer.css',
  'components/content-reveal/content-reveal.css',
  'components/content-reveal/content-reveal.js',
  'components/page-motion/page-motion.css',
  'components/page-loader/page-loader.css',
  'components/page-loader/page-loader.js',
  'components/case-blocks/case-blocks.css',
  'components/case-blocks/case-blocks.js',
  'components/case-cards/case-cards.css',
  'components/case-cards/case-cards.js',
  'components/case-lightbox/case-lightbox.css',
  'components/case-lightbox/case-lightbox.js',
  'components/case-toc/case-toc.css',
  'components/project-cards/project-cards.js',
  'projects/activities/page.css',
  'site/analytics-config.js',
  'site/analytics.js',
  'site/haptics.js',
];
const names = new Map();
function rewrite(source) {
  for (const [original, versioned] of names) {
    source = source.replaceAll(original, versioned);
  }
  return source;
}
for (const asset of assets) {
  const source = rewrite(fs.readFileSync(path.join(root, asset), 'utf8'));
  const ext = path.extname(asset);
  const original = path.basename(asset);
  const hash = crypto.createHash('sha256').update(source).digest('hex').slice(0, 12);
  const versioned = `${path.basename(asset, ext)}.${hash}${ext}`;
  fs.writeFileSync(path.join(root, path.dirname(asset), versioned), source);
  names.set(original, versioned);
}
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(filename);
    else if (entry.name.endsWith('.html')) {
      const source = fs.readFileSync(filename, 'utf8');
      const output = rewrite(source);
      if (source !== output) fs.writeFileSync(filename, output);
    }
  }
}
visit(root);
console.log(`Versioned ${names.size} gallery assets and their HTML references.`);
