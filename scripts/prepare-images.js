#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const ignored = new Set(['node_modules', '.git', '.github', '.claude']);

function inventory(root) {
  const files = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || ignored.has(entry.name)) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) files.push(file); // Do not follow external symlinks.
    }
  }
  visit(root);
  return files;
}

function assertStaticPng(bytes, file) {
  if (!bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) throw Error(`Повреждён PNG: ${file}`);
  if (bytes[24] > 8) throw Error(`PNG с глубиной 16 бит требует отдельной подготовки: ${file}`);
  // cwebp would silently flatten APNG to its first frame. Keep the original.
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    if (bytes.toString('ascii', offset + 4, offset + 8) === 'acTL') {
      throw Error(`Анимированный PNG требует отдельного конвертера: ${file}`);
    }
    offset += length + 12;
  }
}

const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function rewriteReferences(source, file, webps, root) {
  for (const webp of webps) {
    const relative = path.relative(path.dirname(file), webp).split(path.sep).join('/');
    const absolute = '/' + path.relative(root, webp).split(path.sep).join('/');
    for (const target of new Set([relative, './' + relative, absolute])) {
      const original = target.replace(/\.webp$/i, '.png');
      for (const [before, after] of [[original, target], [encodeURI(original), encodeURI(target)]]) {
        const pattern = new RegExp('(^|[\\s"\'`(=])(' + escape(before).replace(/png$/, '[pP][nN][gG]') + ')(?=[?#\\s"\'`),>]|$)', 'g');
        source = source.replace(pattern, (_, prefix) => prefix + after);
      }
    }
  }
  return source;
}

function prepareImages(root = ROOT) {
  const files = inventory(root);
  const pngs = files.filter(file => /\.png$/i.test(file));
  const prepared = [];
  const changed = [];
  let before = 0, after = 0;
  try {
    for (const input of pngs) {
      const bytes = fs.readFileSync(input);
      assertStaticPng(bytes, input);
      const output = input.replace(/\.png$/i, '.webp');
      if (prepared.some(item => item.output === output)) throw Error(`Одинаковое имя WebP для нескольких PNG: ${output}`);
      const temporary = path.join(path.dirname(input), `.${path.basename(output)}.${process.pid}.tmp`);
      prepared.push({ input, output, temporary, bytes });
      const result = spawnSync('cwebp', ['-quiet', '-lossless', '-m', '6', '-exact', '-metadata', 'icc', input, '-o', temporary], { encoding: 'utf8' });
      if (result.error?.code === 'ENOENT') throw Error('Нужен cwebp: brew install webp (macOS) / apt-get install webp (Linux).');
      if (result.error || result.status !== 0) throw Error(`Не удалось преобразовать ${input}: ${result.error?.message || result.stderr}`);
      const encoded = fs.readFileSync(temporary);
      if (encoded.toString('ascii', 0, 4) !== 'RIFF' || encoded.toString('ascii', 8, 12) !== 'WEBP') throw Error(`Некорректный WebP: ${output}`);
      if (fs.existsSync(output) && !fs.readFileSync(output).equals(encoded)) {
        throw Error(`Уже существует другая картинка ${output}. Переименуйте новый PNG; исходник сохранён.`);
      }
      before += bytes.length;
      after += encoded.length;
    }
    // Finish all conversions before changing references or removing originals.
    for (const item of prepared) {
      fs.renameSync(item.temporary, item.output);
      changed.push(item.output);
    }
    const webps = [...new Set([...files.filter(file => /\.webp$/i.test(file)), ...prepared.map(item => item.output)])];
    for (const file of files.filter(file => /\.(html|css|js|json)$/i.test(file) && !path.relative(root, file).startsWith('scripts' + path.sep))) {
      const source = fs.readFileSync(file, 'utf8');
      const output = rewriteReferences(source, file, webps, root);
      if (source !== output) { fs.writeFileSync(file, output); changed.push(file); }
    }
    for (const { input, bytes } of prepared) {
      if (!fs.readFileSync(input).equals(bytes)) throw Error(`PNG изменился во время конвертации, сохранён: ${input}`);
      fs.unlinkSync(input);
      changed.push(input);
    }
    if (prepared.length) console.log(`WebP: ${prepared.length} PNG, ${(before / 1048576).toFixed(2)} → ${(after / 1048576).toFixed(2)} МБ; без потерь и изменения размеров.`);
    else console.log('WebP: новых PNG нет.');
    return changed;
  } finally {
    for (const { temporary } of prepared) fs.rmSync(temporary, { force: true });
  }
}

function watchImages(root = ROOT) {
  const chokidar = require('chokidar');
  let timer;
  function prepare() {
    try { prepareImages(root); } catch (error) { console.error(error.message); }
  }
  const watcher = chokidar.watch(root, {
    ignored: /(^|[/\\])(?:\.[^/\\]+|node_modules)(?:[/\\]|$)/,
    ignoreInitial: true, followSymlinks: false,
    awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 }
  });
  watcher.on('ready', prepare);
  watcher.on('all', (event, file) => {
    if (!['add', 'change'].includes(event) || !/\.(png|html|css|js|json)$/i.test(file)) return;
    clearTimeout(timer);
    timer = setTimeout(prepare, 300);
  });
  watcher.on('error', error => console.error(error.message));
  console.log('WebP: автоматический импорт включён.');
  return watcher;
}

if (require.main === module) {
  if (process.argv.includes('--watch')) watchImages();
  else if (process.argv.includes('--check')) {
    const pngs = inventory(ROOT).filter(file => /\.png$/i.test(file));
    if (pngs.length) {
      console.error('PNG ещё не подготовлены. Запустите npm run images:prepare:\n' + pngs.map(file => path.relative(ROOT, file)).join('\n'));
      process.exitCode = 1;
    } else console.log('WebP: неподготовленных PNG нет.');
  }
  else {
    try { prepareImages(); } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
module.exports = { prepareImages, rewriteReferences, assertStaticPng, watchImages };
