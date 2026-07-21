/*
  Typography — неразрывный пробel после предлогов, союзов и других
  коротких служебных слов, которые по правилам редактуры нельзя оставлять
  последними на строке ("висячие предлоги"). Применяется автоматически ко
  всему тексту сайта, включая контент, который компоненты подгружают
  позже через fetch()/innerHTML (см. index.html) — для этого вместо
  разового прохода используется MutationObserver.
*/

const HANGING_WORDS = [
  // предлоги
  "а", "без", "близ", "в", "во", "вместо", "вне", "внутри", "вокруг",
  "для", "до", "за", "из", "из-за", "из-под", "к", "ко", "кроме",
  "меж", "между", "на", "над", "надо", "о", "об", "обо", "от", "ото",
  "перед", "передо", "по", "под", "подо", "пред", "предо", "при",
  "про", "ради", "с", "со", "сквозь", "среди", "у", "через", "чрез",

  // союзы
  "будто", "да", "едва", "если", "и", "или", "как", "когда", "ли",
  "либо", "лишь", "но", "пока", "покуда", "притом", "причём", "причем",
  "пусть", "словно", "так", "также", "тоже", "точно", "хотя", "чтоб",
  "чтобы", "что", "чуть", "якобы",

  // частицы и другие односложные слова, которые по тем же правилам
  // редактуры не остаются одни в конце строки
  "б", "бы", "же", "ль", "не", "ни", "то", "уж", "вот", "я",
];

// Длинные варианты — раньше в списке альтернатив (без этого альтернация
// иногда матчит более короткий вариант первым, хотя это не влияет на
// корректность из-за проверки пробела после слова, но так безопаснее).
const ALTERNATION = [...new Set(HANGING_WORDS)]
  .sort((a, b) => b.length - a.length)
  .join("|");

// Слово считается "висячим", если перед ним начало строки/текста или
// пробельный/кавычечный/скобочный символ, а сразу после — обычный пробел
// (не неразрывный — иначе уже исправлено раньше).
const HANGING_WORDS_RE = new RegExp(
  `(^|[\\s"'«(—–-])(${ALTERNATION})[ \\t]+`,
  "gi"
);

function fixHangingWords(text) {
  return text.replace(HANGING_WORDS_RE, (_match, prefix, word) => `${prefix}${word} `);
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);

function shouldSkip(textNode) {
  let el = textNode.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable) return true;
    if (el.dataset && "noTypography" in el.dataset) return true;
    el = el.parentElement;
  }
  return false;
}

function processTextNode(node) {
  if (!node.nodeValue || node.nodeValue.indexOf(" ") === -1) return;
  if (shouldSkip(node)) return;
  const fixed = fixHangingWords(node.nodeValue);
  if (fixed !== node.nodeValue) node.nodeValue = fixed;
}

function processSubtree(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node = walker.nextNode();
  while (node) {
    processTextNode(node);
    node = walker.nextNode();
  }
}

// root — обычно document.body. Возвращает MutationObserver, который
// продолжает следить за деревом (карточки, About, Popular и т.д.
// монтируются в DOM уже после первого прохода).
export function initTypography(root = document.body) {
  processSubtree(root);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((added) => {
        if (added.nodeType === Node.TEXT_NODE) {
          processTextNode(added);
        } else if (added.nodeType === Node.ELEMENT_NODE) {
          processSubtree(added);
        }
      });
    }
  });

  observer.observe(root, { childList: true, subtree: true });
  return observer;
}
