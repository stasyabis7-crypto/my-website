#!/usr/bin/env node
/*
  Проверка ДС — кнопки и шрифты.

  Жёсткое правило (см. CLAUDE.md/AGENTS.md/styles/buttons.css/
  styles/typography.css): новая кнопка = класс .btn (+ модификаторы),
  новый текст = роль .text-* с токенами шрифта из typography.css, а не
  свой font-family в CSS.

  Что реально проверяем (осознанно узкий периметр — эвристика на
  a[href] слишком часто ловит обычные текстовые ссылки как "не
  кнопку", ложные срабатывания хуже отсутствия проверки):
    1) Любой <button ...> или элемент с role="button" в HTML должен
       либо носить класс .btn, либо входить в список уже существующих
       эталонных компонентов (BUTTON_LEGACY_PREFIXES) — тех самых,
       с которых типы в styles/buttons.css были сняты.
    2) Любое CSS-объявление font-family вне списка исключений
       (FONT_EXEMPT_FILES — файлы, где шрифт ЗАДАЁТСЯ как токен/эталон:
       fonts.css, typography.css, hero-garden.css, унаследованные
       hero.css/masonry.css) должно ссылаться на var(--font-family-*),
       а не на литерал вроде "IBM Plex Mono".

  Что НЕ проверяем: <a href> без role="button" (обычная ссылка —
  большинство ссылок сайта, отличить "ссылка-кнопка" от "просто
  ссылка" по разметке без ложных срабатываний нельзя).

  Запуск: node scripts/check-design-system.js
  Код выхода 0 — чисто, 1 — есть нарушения (сборка/деплой должны
  падать на этом, см. .github/workflows/deploy-hostinger.yml).
*/

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".github",
  ".claude",
  "storybook",
  "scripts",
  "grid-test-assets",
]);

const EXCLUDED_FILES = new Set(["grid-test.html"]);

// Уже существующие эталонные кнопки Главной/шапки/футера — типы в
// styles/buttons.css сняты именно с них, сами они на .btn не переводятся
// (см. комментарий в styles/buttons.css). Проверяем по префиксу класса,
// чтобы покрыть модификаторы (garden__cta--primary и т.п.).
const BUTTON_LEGACY_PREFIXES = [
  "site-header__cta",
  "site-footer__telegram",
  "garden__cta",
  "garden__help",
  "site-footer__link",
  "site-footer__menu-btn",
  "site-footer__top-btn",
  "footer-menu-panel__link",
  "site-socials__toggle",
  "site-socials__link",
  "case-toc-btn",
  "case-back",
  "case-socials__link",
  "case-socials-toggle",
  "case-social-row",
];

// Файлы, где литеральный font-family — источник токена (fonts.css/
// typography.css) или уже задокументированное эталонное/устаревшее
// исключение, тронутое не в этой задаче.
const FONT_EXEMPT_FILES = new Set([
  "styles/fonts.css",
  "styles/typography.css",
  "styles/hero-garden.css",
  "styles/hero.css",
  "styles/masonry.css",
]);

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    const rel = path.relative(ROOT, path.join(dir, entry.name));
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
    } else {
      if (EXCLUDED_FILES.has(entry.name)) continue;
      files.push(rel);
    }
  }
  return files;
}

const allFiles = walk(ROOT, []);
const htmlFiles = allFiles.filter((f) => f.endsWith(".html"));
const cssFiles = allFiles.filter((f) => f.endsWith(".css"));

const violations = [];

// ---------- 1) Кнопки ----------

function hasClassToken(classAttr, predicate) {
  return classAttr.split(/\s+/).some(predicate);
}

function checkButtonsInHtml(relFile) {
  const src = fs.readFileSync(path.join(ROOT, relFile), "utf8");
  const tagRe = /<(button|a|[a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  let m;
  let line = 1;
  let lastIndex = 0;
  while ((m = tagRe.exec(src))) {
    line += countNewlines(src, lastIndex, m.index);
    lastIndex = m.index;
    const [, tag, attrs] = m;
    const isRoleButton = /role\s*=\s*"button"/.test(attrs);
    if (tag !== "button" && !isRoleButton) continue;

    const classMatch = attrs.match(/class\s*=\s*"([^"]*)"/);
    const classAttr = classMatch ? classMatch[1] : "";

    const hasBtn = hasClassToken(classAttr, (c) => c === "btn" || c.startsWith("btn--"));
    const isLegacy = hasClassToken(classAttr, (c) =>
      BUTTON_LEGACY_PREFIXES.some((p) => c === p || c.startsWith(p + "--") || c.startsWith(p + "-"))
    );

    if (!hasBtn && !isLegacy) {
      violations.push({
        type: "button",
        file: relFile,
        line,
        detail: `<${tag}${isRoleButton ? " role=\"button\"" : ""}> без класса .btn и вне списка эталонных кнопок: class="${classAttr}"`,
      });
    }
  }
}

function countNewlines(src, from, to) {
  let n = 0;
  for (let i = from; i < to; i++) if (src[i] === "\n") n++;
  return n;
}

for (const f of htmlFiles) checkButtonsInHtml(f);

// ---------- 2) Шрифты ----------

function checkFontFamily(relFile, cssText) {
  const declRe = /font-family\s*:\s*([^;]+);/g;
  let m;
  let line = 1;
  let lastIndex = 0;
  while ((m = declRe.exec(cssText))) {
    line += countNewlines(cssText, lastIndex, m.index);
    lastIndex = m.index;
    const value = m[1].trim();
    if (value === "inherit" || value === "initial" || value === "unset" || value.startsWith("var(")) continue;
    violations.push({
      type: "font",
      file: relFile,
      line,
      detail: `font-family задан литералом вместо var(--font-family-*): "${value}"`,
    });
  }
}

for (const f of cssFiles) {
  if (FONT_EXEMPT_FILES.has(f)) continue;
  checkFontFamily(f, fs.readFileSync(path.join(ROOT, f), "utf8"));
}

for (const f of htmlFiles) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let sm;
  while ((sm = styleRe.exec(src))) {
    checkFontFamily(f, sm[1]);
  }
}

// ---------- Отчёт ----------

if (violations.length === 0) {
  console.log("ДС: кнопки и шрифты — нарушений не найдено.");
  process.exit(0);
}

console.error(`ДС: найдено нарушений — ${violations.length}\n`);
for (const v of violations) {
  console.error(`[${v.type}] ${v.file}:${v.line} — ${v.detail}`);
}
console.error(
  "\nИсправление: кнопки — добавить .btn (+модификатор) из styles/buttons.css; " +
    "шрифты — использовать var(--font-family-*)/роль .text-* из styles/typography.css. " +
    "См. CLAUDE.md / AGENTS.md."
);
process.exit(1);
