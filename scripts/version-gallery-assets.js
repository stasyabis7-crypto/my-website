// Content-address the gallery assets: the hosting CDN ignores query versions.
// Run only in the deployment checkout, after source checks have passed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
// Dependencies precede their importers, so a token change also versions its CSS.
const assets = [
  'styles/card-tokens.css',
  'styles/works-grid.css',
  'styles/project-groups.css',
  'components/work-gallery/work-gallery.css',
  'components/work-gallery/work-gallery.js',
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
