/*
  Висячие предлоги и союзы — короткое служебное слово ("и", "в", "на",
  "с", "к", "но", "по"...) не должно оставаться одно в конце строки.
  Чистым CSS это не решить (нужно видеть текст), поэтому здесь — обычная
  подстановка неразрывного пробела (U+00A0) после таких слов прямо в
  текстовых узлах DOM. Браузер после этого физически не может перенести
  строку между предлогом и следующим словом.

  hangPrepositions(root) — разовый проход по поддереву. initTypography(root)
  — то же самое плюс MutationObserver: подхватывает текст, который
  появляется позже (компоненты, подгружающие фрагменты через fetch, как в
  остальном проекте) без повторного ручного вызова.
*/

const HANGING_WORDS = [
  // союзы и частицы
  "а", "и", "о", "у", "я", "но", "же", "ли", "бы", "то", "или", "если",
  "не", "ни", "чтобы", "как", "что",
  // предлоги
  "в", "к", "с", "на", "по", "до", "из", "за", "от", "об", "во", "со",
  "ко", "обо", "изо", "ото", "под", "над", "для", "при", "это",
];

const HANGING_PATTERN = new RegExp(
  "(^|[\\s ])(" + HANGING_WORDS.join("|") + ")[ \\t]+(?=\\S)",
  "gi"
);

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE", "NOSCRIPT",
]);

function replaceInTextNode(node) {
  const value = node.nodeValue;
  if (!value || value.indexOf(" ") === -1) return;
  HANGING_PATTERN.lastIndex = 0;
  if (!HANGING_PATTERN.test(value)) return;
  HANGING_PATTERN.lastIndex = 0;
  node.nodeValue = value.replace(HANGING_PATTERN, "$1$2 ");
}

function acceptNode(node) {
  const parent = node.parentElement;
  if (!parent) return NodeFilter.FILTER_REJECT;
  if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
  if (parent.closest("[data-no-typography]")) return NodeFilter.FILTER_REJECT;
  return NodeFilter.FILTER_ACCEPT;
}

export function hangPrepositions(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode,
  });
  let node;
  while ((node = walker.nextNode())) {
    replaceInTextNode(node);
  }
}

export function initTypography(root = document.body) {
  hangPrepositions(root);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        replaceInTextNode(mutation.target);
        continue;
      }
      mutation.addedNodes.forEach((added) => {
        if (added.nodeType === Node.TEXT_NODE) {
          replaceInTextNode(added);
        } else if (added.nodeType === Node.ELEMENT_NODE) {
          hangPrepositions(added);
        }
      });
    }
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return observer;
}
