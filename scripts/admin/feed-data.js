'use strict';
/*
  Чтение и запись данных ленты Главной (pages/home/data/projects.js).
  Переписывается только массив window.portfolioProjects — в том же формате,
  что и руками: шапка-комментарий, теги и платформы остаются как есть.
*/
const vm = require('node:vm');

function readFeed(source) {
  const context = { window: {} };
  vm.runInNewContext(source, context);
  const { window } = context;
  return {
    projects: JSON.parse(JSON.stringify(window.portfolioProjects || [])),
    tags: JSON.parse(JSON.stringify(window.portfolioTags || [])),
    platforms: JSON.parse(JSON.stringify(window.portfolioPlatforms || []))
  };
}

// Раскладка по умолчанию — из самого компонента ленты, чтобы не дублировать её.
function readPattern(componentSource) {
  const pattern = componentSource.match(/var PATTERN = (\[[\s\S]*?\]);/);
  const rows = componentSource.match(/var ROWS = (\d+);/);
  if (!pattern || !rows) throw Error('Не найдена раскладка PATTERN в project-feed.js');
  return { pattern: vm.runInNewContext(pattern[1]), rows: Number(rows[1]) };
}

const quote = value => "'" + String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const key = name => /^[A-Za-z_$][\w$]*$/.test(name) ? name : quote(name);

function format(value) {
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return '[' + value.map(format).join(', ') + ']';
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '');
    return '{ ' + entries.map(([name, item]) => `${key(name)}: ${format(item)}`).join(', ') + ' }';
  }
  return 'null';
}

function formatProject(project) {
  const entries = Object.entries(project).filter(([, item]) => item !== undefined && item !== null && item !== '' && item !== false &&
    !(Array.isArray(item) && !item.length));
  return '  {\n' + entries.map(([name, item]) => `    ${key(name)}: ${format(item)}`).join(',\n') + '\n  }';
}

function writeProjects(source, projects) {
  const start = source.indexOf('window.portfolioProjects = [');
  if (start < 0) throw Error('В projects.js нет window.portfolioProjects');
  const open = source.indexOf('[', start);
  const close = source.indexOf('\n];', open);
  return source.slice(0, open) + '[\n' + projects.map(formatProject).join(',\n') + source.slice(close);
}

// Обычные плитки занимают одну ячейку, крупные — 2×2. Проверка, что плитки
// не налезают друг на друга и не выходят за четыре колонки.
function validatePlaces(projects) {
  const taken = new Map();
  for (const project of projects) {
    const place = project.place;
    if (!place) continue;
    const size = place.big ? 2 : 1;
    if (place.c < 1 || place.c + size - 1 > 4 || place.r < 1) throw Error(`«${project.title}» выходит за сетку`);
    for (let c = place.c; c < place.c + size; c++) {
      for (let r = place.r; r < place.r + size; r++) {
        const cell = `${c}:${r}`;
        if (taken.has(cell)) throw Error(`«${project.title}» налезает на «${taken.get(cell)}»`);
        taken.set(cell, project.title);
      }
    }
  }
}

// Порядок в массиве — порядок на телефоне: слева направо, сверху вниз,
// как читается десктопная сетка.
function sortByPlace(projects) {
  return [...projects].sort((a, b) => (a.place && b.place) ? a.place.r - b.place.r || a.place.c - b.place.c : 0);
}

module.exports = { readFeed, readPattern, writeProjects, formatProject, validatePlaces, sortByPlace };
