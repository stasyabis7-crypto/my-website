#!/usr/bin/env node
/**
 * Собирает ассеты сада из assets/garden/flowers new/*.png:
 *  1) жмёт каждый PNG в webp (длинная сторона 900px) → assets/garden/flowers/{key}.webp
 *  2) пишет flowers-catalog.json — единый каталог (его читают и фронт, и api/).
 *
 * Новая модель (2026-08-29): 6 фиксированных цветов, по одному варианту,
 * без выбора вида/наклона гостем. Позицию, размер и наклон каждого цветка
 * на баннере задаёт styles/garden-zones.json (снят из Figma-макета
 * fiU8aoZnEJyEc9puYc9J8X, фреймы zones-xl/lg/sm/xs), ключ → своё место.
 *
 * Требует cwebp в PATH (brew install webp). Запуск: node scripts/build-garden.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets/garden/flowers new');
const OUT = path.join(ROOT, 'assets/garden/flowers');
const CATALOG = path.join(ROOT, 'flowers-catalog.json');
const LONG_EDGE = 900;
const QUALITY = 84;

// имя файла в «flowers new» → ключ + русское имя + значение в формате
// «для тех, кто …» (черновик, правится вручную).
const FLOWERS = {
  'iris':            ['iris',      'Ирис',      'Для тех, кто верит в идею и решается её сделать.'],
  'dragon':          ['protea',    'Протея',    'Для тех, кто держит характер там, где трудно.'],
  'tulip':           ['tulip',     'Тюльпан',   'Для тех, кто наконец на своём месте.'],
  'pionee':          ['peony',     'Пион',      'Для тех, у кого всё сложилось и хочется поделиться.'],
  'hydrangea':       ['hydrangea', 'Гортензия', 'Для тех, кто собирает целое из маленьких решений.'],
  'Flower non bg 3': ['amaryllis', 'Амариллис', 'Для тех, кто не боится быть заметным.'],
};

/** width/height из IHDR PNG без зависимостей */
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 1, 4) !== 'PNG') throw new Error('not a png: ' + file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

fs.mkdirSync(OUT, { recursive: true });

const flowers = [];
for (const base of Object.keys(FLOWERS)) {
  const srcFile = path.join(SRC, base + '.png');
  if (!fs.existsSync(srcFile)) {
    console.warn('! нет файла', srcFile);
    continue;
  }
  const [key, name, meaning] = FLOWERS[base];
  const { w, h } = pngSize(srcFile);
  const outName = `${key}.webp`;
  const outFile = path.join(OUT, outName);
  const resize = w >= h ? [LONG_EDGE, 0] : [0, LONG_EDGE];
  execFileSync('cwebp', [
    '-quiet', '-q', String(QUALITY), '-resize', String(resize[0]), String(resize[1]),
    srcFile, '-o', outFile,
  ]);
  // один вариант с id "1" — форма каталога сохранена, чтобы api/_db.php
  // (garden_flower_exists) не переписывать.
  flowers.push({ key, name, meaning, variants: [{ id: '1', img: `assets/garden/flowers/${outName}`, w, h }] });
}

fs.writeFileSync(CATALOG, JSON.stringify({ slots: flowers.length, flowers }, null, 2) + '\n');

console.log(`✓ ${flowers.length} цветов → assets/garden/flowers/`);
console.log(`✓ ${path.relative(ROOT, CATALOG)}`);
