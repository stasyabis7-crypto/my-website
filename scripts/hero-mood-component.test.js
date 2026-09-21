const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hero-contract-'));
const source = path.resolve(__dirname, '..');
try {
  const files = ['scripts/hero-mood-component.js', 'scripts/hero-mood-content.js',
    'components/hero-mood/template.html', 'components/hero-mood/baseline.json',
    'components/hero-mood/hero-spheres.js', 'components/hero-mood/hero-layout.css', 'components/hero-mood/hero-viewport.js', 'index.html'];
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(path.join(source, file), path.join(root, file));
  }
  const run = (...args) => spawnSync(process.execPath, [root + '/scripts/hero-mood-component.js', ...args], { encoding: 'utf8' });
  const index = fs.readFileSync(root + '/index.html', 'utf8');
  const changed = index.replace(/(<h1 class="mood-title[^>]*>)[\s\S]*?(<\/h1>)/, '$1Другой заголовок$2')
    .replace(/(<p class="mood-subtitle[^>]*>)[^<]+/, '$1Другой текст страницы')
    .replace(/(<a href=")#works-gallery(" class="mood-primary)/, '$1https://example.com/$2')
    .replace('Смотреть работы</span>', 'Смотреть на проде</span>')
    .replace('class="icon icon--down"', 'class="icon icon--arrow-diagonal"');
  fs.writeFileSync(root + '/index.html', changed);
  assert.equal(run().status, 0, 'Page copy and action may differ from template');
  assert.equal(run('--sync').status, 0);
  assert.equal(fs.readFileSync(root + '/index.html', 'utf8'), changed, 'Sync preserves current copy/action');
  fs.writeFileSync(root + '/index.html', changed.replace('class="mood-stage"', 'class="custom-stage"'));
  assert.equal(run().status, 1, 'Layout changes remain protected');
  fs.writeFileSync(root + '/index.html', changed);
  const template = fs.readFileSync(root + '/components/hero-mood/template.html', 'utf8');
  fs.writeFileSync(root + '/components/hero-mood/template.html', template.replace('Sr Product Designer', 'Новый текст шаблона'));
  assert.equal(run().status, 0, 'Template text is not frozen');
  fs.appendFileSync(root + '/components/hero-mood/hero-viewport.js', '\n// changed behavior source\n');
  assert.equal(run().status, 1, 'Behavior source still uses exact approved hash');
  console.log('Баннер: независимость контента, сохранение при sync и защита структуры/JS проверены.');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
