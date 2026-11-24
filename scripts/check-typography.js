const assert = require('node:assert/strict');
const { subtitlePeriod, keepWordsTogether } = require('../site/typography-rules');
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

const bindings = [
  ['Редизайн — результат', 'Редизайн\u00a0— результат'],
  ['Design — results', 'Design\u00a0— results'],
  ['Design – results', 'Design\u00a0– results'],
  ['Редизайн\n    — результат', 'Редизайн\u00a0— результат'],
  ['Редизайн\u202f— результат', 'Редизайн\u00a0— результат'],
  ['enough—sellers', 'enough\u2060—\u2060sellers'],
  ['редизайн—результат', 'редизайн\u2060—\u2060результат'],
  ['2020–2026', '2020\u2060–\u20602026'],
  ['10:00–20:00', '10:00\u2060–\u206020:00'],
  ['— Привет', '—\u00a0Привет'],
  ['— Hello', '—\u00a0Hello'],
  ['Работа и в команде', 'Работа и\u00a0в\u00a0команде'],
  ['Design for the people', 'Design for\u00a0the\u00a0people'],
  ['Сделать бы лучше', 'Сделать\u00a0бы лучше'],
  ['6 лет / 6 years', '6\u00a0лет / 6\u00a0years'],
  ['за первые 3 месяца — 1 500 заданий и 40 000 бонусов', 'за\u00a0первые 3\u00a0месяца\u00a0— 1\u00a0500\u00a0заданий и\u00a040\u00a0000\u00a0бонусов'],
  ['20 интервью / 8 недель / 3 полных месяца', '20\u00a0интервью / 8\u00a0недель / 3\u00a0полных месяца'],
  ['55 subscriptions / 30,000 sellers / 3 months', '55\u00a0subscriptions / 30,000\u00a0sellers / 3\u00a0months'],
  ['1 500 / 57\u202f700 / 1\n  000\n  000', '1\u00a0500 / 57\u00a0700 / 1\u00a0000\u00a0000'],
  ['13 % / 2,71 % / 1 500 ₽', '13\u00a0% / 2,71\u00a0% / 1\u00a0500\u00a0₽'],
  ['дизайн-система / follow-up', 'дизайн-система / follow-up'],
];
for (const [input, expected] of bindings) {
  assert.equal(keepWordsTogether(input), expected, input);
  assert.equal(keepWordsTogether(expected), expected, 'Repeated processing: ' + input);
}
console.log(`Типографика: ${bindings.length} сценариев неразрывных связей RU/EN пройдено.`);
