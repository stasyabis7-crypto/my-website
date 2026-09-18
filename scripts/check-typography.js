const assert = require('node:assert/strict');
const { subtitlePeriod } = require('../site/typography-rules');
const cases = [
  ['Одно предложение.', 'Одно предложение'],
  ['Первое предложение. Второе предложение.', 'Первое предложение. Второе предложение.'],
  ['Первое.\nВторое.', 'Первое.\nВторое.'],
  ['Временная мин. цена.', 'Временная мин. цена'],
  ['Версия 2.5.', 'Версия 2.5'],
  ['Это я.', 'Это я'],
  ['«Короткое описание».  ', '«Короткое описание»  '],
  ['Описание.', 'Описание'],
  ['One sentence.', 'One sentence'],
  ['First sentence. Second sentence.', 'First sentence. Second sentence.'],
  ['Без точки', 'Без точки'],
  ['Что изменилось?', 'Что изменилось?'],
  ['Готово!', 'Готово!'],
  ['Продолжение...', 'Продолжение...'],
  ['Продолжение…', 'Продолжение…'],
  ['Карточки и т. д.', 'Карточки и т. д.'],
  ['Автор А.', 'Автор А.'],
  ['', ''],
];
for (const [input, expected] of cases) {
  const index = subtitlePeriod(input);
  const actual = index < 0 ? input : input.slice(0, index) + input.slice(index + 1);
  assert.equal(actual, expected, input);
}
console.log(`Типографика: ${cases.length} сценариев пунктуации подзаголовков пройдено.`);
