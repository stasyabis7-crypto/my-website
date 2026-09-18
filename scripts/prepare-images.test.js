const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prepareImages, assertStaticPng } = require('./prepare-images');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'webp-import-'));
// Two RGBA pixels, one semi-transparent. No third-party fixture dependencies.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAD0lEQVR4nGP4z8DwHwgbABB5A359Y87XAAAAAElFTkSuQmCC', 'base64');
try {
  fs.mkdirSync(root + '/assets');
  fs.mkdirSync(root + '/pages');
  fs.writeFileSync(root + '/assets/my image.PNG', png);
  fs.writeFileSync(root + '/index.html', '<img src="/assets/my%20image.PNG?v=1" srcset="assets/my%20image.PNG 2w"><img src="https://other.example/assets/my%20image.PNG">');
  fs.writeFileSync(root + '/pages/demo.css', '.cover { background: url("../assets/my image.png"); }');
  fs.writeFileSync(root + '/pages/data.js', 'const cover = "/assets/my image.PNG";');
  prepareImages(root);
  assert.ok(!fs.existsSync(root + '/assets/my image.PNG'));
  const webp = fs.readFileSync(root + '/assets/my image.webp');
  assert.equal(webp.toString('ascii', 8, 12), 'WEBP');
  assert.equal(fs.readFileSync(root + '/index.html', 'utf8'), '<img src="/assets/my%20image.webp?v=1" srcset="assets/my%20image.webp 2w"><img src="https://other.example/assets/my%20image.PNG">');
  assert.ok(fs.readFileSync(root + '/pages/demo.css', 'utf8').includes('../assets/my image.webp'));
  assert.ok(fs.readFileSync(root + '/pages/data.js', 'utf8').includes('/assets/my image.webp'));
  assert.deepEqual(prepareImages(root), [], 'Idempotent preparation');
  fs.writeFileSync(root + '/pages/later.html', '<img src="../assets/my%20image.png">');
  prepareImages(root);
  assert.ok(fs.readFileSync(root + '/pages/later.html', 'utf8').includes('my%20image.webp'), 'References added after conversion');
  fs.writeFileSync(root + '/assets/my image.PNG', png);
  prepareImages(root); // Re-importing an identical PNG is safe.
  const other = Buffer.from(webp); other[other.length - 1] ^= 1;
  fs.writeFileSync(root + '/assets/my image.webp', other);
  fs.writeFileSync(root + '/assets/my image.PNG', png);
  assert.throws(() => prepareImages(root), /другая картинка/);
  assert.deepEqual(fs.readFileSync(root + '/assets/my image.webp'), other, 'Never overwrite a different image');
  assert.deepEqual(fs.readFileSync(root + '/assets/my image.PNG'), png, 'Keep original on failure');
  fs.unlinkSync(root + '/assets/my image.PNG');
  fs.writeFileSync(root + '/assets/broken.png', 'incomplete upload');
  assert.throws(() => prepareImages(root), /Повреждён PNG/);
  assert.ok(fs.existsSync(root + '/assets/broken.png'));
  const animationChunk = Buffer.alloc(12); animationChunk.write('acTL', 4);
  assert.throws(() => assertStaticPng(Buffer.concat([png.subarray(0, 8), animationChunk]), 'animation.png'), /Анимированный PNG/);
  console.log('WebP: импорт, ссылки, повторная загрузка, конфликты и повреждённые файлы проверены.');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
