// Regression checks for the guard itself; fixtures never touch site sources.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'website-ds-'));
try {
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.mkdirSync(path.join(root, 'styles'));
  fs.copyFileSync(__dirname + '/check-design-system.js', root + '/scripts/check-design-system.js');
  fs.writeFileSync(root + '/styles/buttons.css', '.btn--fill-white {}');
  const cases = [
    ['valid button', '<button class="btn btn--fill-white">OK</button>', true],
    ['modifier without base', '<button class="btn--fill-white">OK</button>', false],
    ['single quotes', "<div role='button'>OK</div>", false],
    ['unquoted role', '<div role=button>OK</div>', false],
    ['unknown fill', '<a href="/" class="btn btn--fill-custom">OK</a>', false],
    ['missing fill', '<button class="btn">OK</button>', false],
    ['badge is not a button', '<span class="btn btn--fill-white">Soon</span>', false],
    ['comment is not markup', '<!-- <button>Example</button> -->', true],
    ['ordinary link', '<a href="/">Home</a>', true],
    ['token family', '<style>p {font-family:var(--font-family-body);}</style>', true],
    ['unrelated variable', '<style>p {font-family:var(--custom-font);}</style>', false],
  ];
  for (const [name, html, valid] of cases) {
    fs.writeFileSync(root + '/index.html', html);
    const result = spawnSync(process.execPath, [root + '/scripts/check-design-system.js'], { encoding: 'utf8' });
    assert.equal(result.status, valid ? 0 : 1, `${name}: ${result.stdout}${result.stderr}`);
  }
  fs.writeFileSync(root + '/index.html', '');
  fs.writeFileSync(root + '/styles/control.js', 'host.innerHTML = `<button>Close</button>`;');
  assert.equal(spawnSync(process.execPath, [root + '/scripts/check-design-system.js']).status, 1, 'JS template button');
  console.log('ДС: 12 регрессионных сценариев проверки пройдено.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
