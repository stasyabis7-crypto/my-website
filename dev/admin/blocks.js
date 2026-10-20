/*
  Библиотека блоков страницы кейса для админки. Разметка — те же раскладки
  components/case-grid/case-grid.css, что уже стоят в кейсах. Серые поля
  .cg-stub — места под картинки: размер подписан внутри, файл подставляется
  кликом в редакторе. Знак ✎ отмечает текст-заготовку: перед публикацией
  админка напомнит, если он остался.
*/
(function () {
  function stub(ratio, label, extra, fill) {
    return '<div class="cg-stub' + (extra ? ' ' + extra : '') + '" data-fill="' + (fill || 'media') + '" style="--stub-ratio: ' + ratio + '"><p class="text-body">' + label + '</p></div>';
  }
  function intro(title, text, modifier) {
    return '  <div class="cg-intro' + (modifier ? ' ' + modifier : '') + '">\n' +
      '    <h2 class="text-h1">' + title + '</h2>\n' +
      (text ? '    <div class="cg-intro__text">\n      <p class="text-body-lg">' + text + '</p>\n    </div>\n' : '') +
      '  </div>\n';
  }
  function section(body) {
    return '<section class="case-block cg" id="new-block" tabindex="-1">\n' + body + '</section>\n';
  }
  function item(n, cls, num, text) {
    return '  <div class="cg-item' + cls + '">\n' +
      '    <p class="cg-item__num ' + num + '"' + (num === 'text-display-lg' ? ' aria-hidden="true"' : '') + '>' + n + '</p>\n' +
      '    <p class="cg-item__text text-body">' + text + '</p>\n' +
      '  </div>\n';
  }
  function figure(side, caption) {
    return '  <figure class="cg-figure ' + side + '">\n' +
      '    ' + stub('9 / 5', '2880 × 1600') + '\n' +
      '    <figcaption class="text-body">' + caption + '</figcaption>\n' +
      '  </figure>\n';
  }

  // Схема — сетка 12 колонок: прямоугольники [x, y, ширина, высота, вид].
  // вид: t — текст, h — заголовок, m — медиа.
  window.adminBlocks = [
    {
      id: 'text', name: 'Заголовок и текст', scope: 'page',
      hint: 'Заголовок слева, текст справа. Одна мысль — один абзац.',
      needs: 'Только текст.',
      scheme: [[0, 0, 5, 2, 'h'], [6, 0, 6, 4, 't']],
      html: section(intro('✎ Заголовок раздела', '✎ Короткий текст: что здесь происходило и почему.'))
    },
    {
      id: 'bleed', name: 'Кадр на всю ширину', scope: 'page',
      hint: 'Заголовок с текстом и большой кадр до краёв экрана. Для картинки со своим фоном.',
      needs: '1 картинка или видео: ширина от 2880 px, пропорции любые (берутся из файла).',
      scheme: [[0, 0, 5, 2, 'h'], [6, 0, 6, 2, 't'], [0, 3, 12, 6, 'm']],
      html: section(intro('✎ Заголовок раздела', '✎ Что показывает кадр.') + '\n  ' + stub('16 / 10', '2880 × 1800 · на всю ширину', 'cg-bleed') + '\n')
    },
    {
      id: 'before-after', name: 'До / После', scope: 'page',
      hint: 'Два равных кадра рядом с подписями. На телефоне — друг под другом.',
      needs: '2 картинки одного размера, ширина каждой от 1440 px (лучше 2880 × 1600).',
      scheme: [[0, 0, 5, 2, 'h'], [6, 0, 6, 2, 't'], [0, 3, 6, 4, 'm'], [6, 3, 6, 4, 'm']],
      html: section(intro('✎ Заголовок раздела', '✎ Что изменилось.') + '\n' + figure('cg-l', 'До') + figure('cg-r', 'После'))
    },
    {
      id: 'text-media', name: 'Текст и кадр справа', scope: 'page',
      hint: 'Несколько абзацев и кадр в правой половине — для пояснения детали.',
      needs: '1 картинка: ширина от 1440 px, лучше квадрат 1600 × 1600.',
      scheme: [[0, 0, 5, 2, 'h'], [6, 0, 6, 2, 't'], [6, 3, 6, 2, 't'], [6, 6, 6, 5, 'm']],
      html: section(intro('✎ Заголовок раздела', '✎ О чём раздел.') + '\n' +
        '  <div class="cg-text cg-r">\n    <p class="text-body-lg">✎ Первый абзац.</p>\n    <p class="text-body-lg">✎ Второй абзац.</p>\n  </div>\n\n' +
        '  ' + stub('1 / 1', '1600 × 1600', 'cg-r') + '\n')
    },
    {
      id: 'points', name: 'Три пункта с номерами', scope: 'page',
      hint: 'Проблемы, шаги, выводы: три равных пункта в трёх колонках.',
      needs: 'Только текст. Нужно четыре — продублируйте пункт и поменяйте колонки.',
      scheme: [[0, 0, 4, 2, 'h'], [4, 0, 8, 1, 't'], [0, 3, 4, 3, 't'], [4, 3, 4, 3, 't'], [8, 3, 4, 3, 't']],
      html: section(intro('✎ Заголовок раздела', '✎ Подводка в одну строку', 'cg-intro--thirds cg-intro--base') + '\n' +
        item('01', ' cg-t1', 'text-display-lg', '✎ Первый пункт') +
        item('02', ' cg-t2', 'text-display-lg', '✎ Второй пункт') +
        item('03', ' cg-t3', 'text-display-lg', '✎ Третий пункт'))
    },
    {
      id: 'stats', name: 'Три метрики', scope: 'page',
      hint: 'Результаты: крупное число и подпись под ним.',
      needs: 'Только текст.',
      scheme: [[0, 0, 4, 2, 'h'], [4, 0, 8, 1, 't'], [0, 3, 4, 3, 'h'], [4, 3, 4, 3, 'h'], [8, 3, 4, 3, 'h']],
      html: section(intro('Результаты', '✎ Как измеряли', 'cg-intro--thirds cg-intro--base') + '\n' +
        item('✎ 0K', ' cg-item--stat cg-t1', 'text-display', '✎ Что это за число') +
        item('✎ 0%', ' cg-item--stat cg-t2', 'text-display', '✎ Что это за число') +
        item('✎ 0', ' cg-item--stat cg-t3', 'text-display', '✎ Что это за число'))
    },
    {
      id: 'photo', name: 'Кадр с фразой поверх', scope: 'page',
      hint: 'Большой кадр на всю ширину, крупная фраза стоит на его светлом поле слева внизу.',
      needs: '2 файла: десктоп 3840 × 1680 (21:9) со свободным светлым полем слева внизу; телефон 1200 × 1500 (4:5) со свободным полем внизу — добавляется после первого.',
      scheme: [[0, 0, 5, 2, 'h'], [6, 0, 6, 2, 't'], [0, 3, 12, 5, 'm'], [1, 6, 5, 1, 'h']],
      html: section(intro('✎ Заголовок раздела', '✎ Подводка.') + '\n' +
        '  <figure class="cg-photo">\n    ' + stub('16 / 7', '3840 × 1680 · светлое поле слева внизу под фразу', '', 'photo') + '\n' +
        '    <figcaption class="cg-photo__text text-h2">✎ Крупная фраза — главный вывод раздела</figcaption>\n  </figure>\n')
    },
    {
      id: 'stage', name: 'Скриншот на серой сцене', scope: 'page',
      hint: 'Скриншот без своего фона стоит по центру серой сцены.',
      needs: '1 скриншот без фона (PNG с прозрачностью или на белом), ширина от 1920 px.',
      scheme: [[0, 0, 5, 2, 'h'], [6, 0, 6, 2, 't'], [0, 3, 12, 6, 's'], [2, 4, 8, 4, 'm']],
      html: section(intro('✎ Заголовок раздела', '✎ Что на скриншоте.') + '\n' +
        '  <div class="cg-stage">\n    ' + stub('16 / 10', '1920 × 1200 · без фона') + '\n  </div>\n')
    },
    {
      id: 'gallery', name: 'Галерея интерфейса', scope: 'page',
      hint: 'Декор между разделами, как лента Главной: крупная плитка и две поменьше. Без подписей.',
      needs: '3 картинки: крупная 1400 × 1680 (5:6), справа сверху 1400 × 864, справа снизу во всю ширину правой половины 1792 × 864.',
      scheme: [[0, 0, 6, 8, 'm'], [6, 0, 3, 3, 'm'], [6, 5, 6, 3, 'm']],
      html: '<div class="case-block cg-gallery" aria-hidden="true">\n' +
        '  <div class="cg-gallery__tile cg-gallery__tile--big" style="--g-col: 1">' + stub('5 / 6', '1400 × 1680', '', 'img') + '</div>\n' +
        '  <div class="cg-gallery__tile" style="--g-col: 3; --g-row: 1">' + stub('1400 / 864', '1400 × 864', '', 'img') + '</div>\n' +
        '  <div class="cg-gallery__tile cg-gallery__tile--end" style="--g-col: 3; --g-row: 2; --g-span: 2">' + stub('1792 / 864', '1792 × 864', '', 'img') + '</div>\n' +
        '</div>\n'
    },

    /* ─── Вставка внутрь выбранного раздела ─── */
    {
      id: 'p-right', name: 'Абзац справа', scope: 'section',
      hint: 'Текст в правой половине, на одной вертикали с текстом шапки.',
      needs: 'Только текст.',
      scheme: [[6, 0, 6, 3, 't']],
      html: '<p class="text-body-lg cg-r">✎ Текст абзаца.</p>\n'
    },
    {
      id: 'media-full', name: 'Кадр на всю ширину', scope: 'section',
      hint: 'Кадр до краёв экрана.',
      needs: '1 картинка или видео: ширина от 2880 px.',
      scheme: [[0, 0, 12, 5, 'm']],
      html: stub('16 / 10', '2880 × 1800 · на всю ширину', 'cg-bleed') + '\n'
    },
    {
      id: 'media-right', name: 'Кадр справа', scope: 'section',
      hint: 'Кадр в правой половине.',
      needs: '1 картинка: ширина от 1440 px.',
      scheme: [[6, 0, 6, 5, 'm']],
      html: stub('1 / 1', '1600 × 1600', 'cg-r') + '\n'
    },
    {
      id: 'pair', name: 'Пара кадров', scope: 'section',
      hint: 'Два равных кадра рядом с подписями.',
      needs: '2 картинки одного размера, ширина от 1440 px.',
      scheme: [[0, 0, 6, 4, 'm'], [6, 0, 6, 4, 'm']],
      html: figure('cg-l', '✎ Подпись') + figure('cg-r', '✎ Подпись')
    },
    {
      id: 'button', name: 'Кнопка-ссылка', scope: 'section',
      hint: 'Розовая кнопка из дизайн-системы со стрелкой — ссылка на прод или материалы.',
      needs: 'Текст кнопки и адрес — меняются после вставки.',
      scheme: [[6, 0, 3, 1, 'b']],
      html: '<div class="cg-r">\n  <a class="btn btn--fill-pink btn--icon-right" href="https://" target="_blank" rel="noopener noreferrer">\n    <span>✎ Открыть проект</span>\n    <span class="icon icon--arrow-diagonal" aria-hidden="true"></span>\n  </a>\n</div>\n'
    }
  ];
})();
