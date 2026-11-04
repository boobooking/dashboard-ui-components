# Общая рамка поля — утилита `field-frame`

Дата: 2026-11-04

## 1. Цель и рамки

Рамку текстового поля — скругление, серую рамку, белый фон, тень — каждое поле
формы собирает из одних и тех же классов. Набор повторён в 14 местах, и чтобы
поменять вид рамки, пришлось бы править каждое. Цель: вид рамки поля задан в
одном месте, утилитой Tailwind `field-frame` в `src/styles/index.css`, как уже
заданы `focus-ring` и `choice-border`. Попутно выравниваются мелкие различия
между полями.

В рамках задачи:

- утилита `field-frame` и тест-сторож;
- перевод 14 мест на утилиту (раздел 3);
- выравнивание различий (раздел 4);
- README, браузерная проверка.

Вне рамок:

- кнопки: `ActionButton`, основная кнопка `DropdownButtonWithAction` — у них
  свой вид кнопки, хоть фон и рамка похожи;
- фильтры (`SelectSingleFilter`, `SelectDateFilter`, `AmountIntervalFilter` и
  другие) с рамками `gray-200`, панели (`DropdownButton`, `SelectDate`,
  `TextPopover`), карточки и галочки `SelectSingleCards` и
  `SelectMultipleList`;
- размеры, отступы, раскладка и шрифт полей: `text-sm`, `h-9.5`, `px-3 py-2`
  остаются у компонентов;
- кольцо фокуса: остаётся `focus-ring`.

Работа идёт на ветке `feat/form-textarea`, до подъёма версии: `0.25.0`
выходит с `FormTextarea` и общей рамкой (раздел 8).

## 2. Что показало исследование

Рамка поля в пакете одна по виду. Замер в Playground, окружение приложения:
у всех полей формы рамка 1px `gray-300`, скругление 6px (`rounded-md`), белый
фон, тень `shadow-xs`, высота 38px, шрифт 14px, строка 20px.

Классы в исходниках различаются:

| Место | Классы рамки сейчас | Отличие |
| --- | --- | --- |
| `FormInput.vue` — `<input>` | `rounded-md border border-gray-300 bg-white shadow-xs` + `text-sm leading-5` | `leading-5` |
| `FormTextarea.vue` — `<textarea>` | то же | `leading-5` |
| `AmountForm.vue` — сумма | то же + `[--bb-field-radius:0.375rem]` + `text-sm leading-5` | `leading-5` |
| `AmountForm.vue` — копейки | то же + `[--bb-field-radius:0.375rem]` + `text-sm` | — |
| `AmountIntervalForm.vue` — три части | то же + `[--bb-field-radius:0.375rem]` + `text-sm` | — |
| `SelectDateForm.vue` | то же + `[--bb-field-radius:0.375rem]` + `text-sm` | — |
| `SelectDateIntervalForm.vue` — две части | то же + `[--bb-field-radius:0.375rem]` + `text-sm` | — |
| `SelectSingleForm.vue`, `SelectMultipleForm.vue` | то же + `[--bb-field-radius:0.375rem]` + `text-sm` | — |
| `ListSearchField.vue` — поле поиска в панели | `rounded-md border border-gray-300 bg-white` + `text-sm` | нет тени, нет `--bb-field-radius` |

- `--bb-field-radius` — скругление рамки для частей внутри неё: по нему
  скругляют кольцо фокуса `DropdownButton`, `SelectDate`, `AmountInput`
  (`rounded-[var(--bb-field-radius,0)]`). У `FormInput`, `FormTextarea` и
  `ListSearchField` кольцо рисует само поле, переменная там ни на что не влияет.
- `leading-5` при `text-sm` лишний: `text-sm` в Tailwind 4 задаёт и размер
  14px, и высоту строки 20px. На экране его снятие ничего не меняет.
- Ресет пакета снимает `box-shadow` у `input:focus` и `textarea:focus` в слое
  `components`; утилиты стоят в слое `utilities` и сильнее, поэтому тень
  `shadow-xs` и кольцо `focus-ring` остаются, как сейчас.
- Образец — `@utility focus-ring` и `@utility choice-border`; у каждой свой
  тест: `tests/focusRing.test.js` (утилита и таблица носителей),
  `tests/choiceBorder.test.js` (вывод утилиты).

## 3. Решения и их источники

| Решение | Источник |
| --- | --- |
| Рамка поля — одна утилита, повторы из компонентов убрать | владелец |
| Перенос и выравнивание мелких различий | владелец |
| Имя `field-frame`, место — `src/styles/index.css` рядом с `focus-ring` | автор, показано владельцу |
| Состав: рамка 1px `gray-300`, `rounded-md`, белый фон, `shadow-xs`, `--bb-field-radius` | автор, показано владельцу |
| 14 мест, включая `ListSearchField`; кнопки и фильтры вне рамок | автор, показано владельцу |
| `ListSearchField` получает тень | автор, показано владельцу |
| `leading-5` снимается с рамок полей | автор, показано владельцу |
| Тест-сторож, как у `focus-ring` | автор, показано владельцу |
| Та же ветка, выпуск `0.25.0` вместе с `FormTextarea` | автор, показано владельцу |
| `text-sm` в утилиту не входит: это шрифт, а не рамка | автор |
| Раздела «Обновление с 0.24» нет: тень у поля поиска API не меняет | автор |

## 4. Утилита и выравнивание

### 4.1. `field-frame`

Утилита в `src/styles/index.css` с комментарием в духе соседних: что задаёт,
кто носитель, что компоненты оставляют себе. Даёт:

- рамку 1px цвета `gray-300` со всех сторон;
- скругление `rounded-md` (0.375rem);
- белый фон;
- тень `shadow-xs`;
- `--bb-field-radius` равным скруглению рамки, одним значением с ним: при
  смене скругления переменная меняется вместе.

### 4.2. Носители

| Файл | Узлов с `bb:field-frame` |
| --- | --- |
| `FormInput.vue` | 1 |
| `FormTextarea.vue` | 1 |
| `AmountForm.vue` | 2 |
| `AmountIntervalForm.vue` | 3 |
| `SelectDateForm.vue` | 1 |
| `SelectDateIntervalForm.vue` | 2 |
| `SelectSingleForm.vue` | 1 |
| `SelectMultipleForm.vue` | 1 |
| `ListSearchField.vue` | 1 |

На этих узлах больше нет `rounded-md`, `border`, `border-gray-300`,
`bg-white`, `shadow-xs` и `[--bb-field-radius:…]`; у рамок `FormInput`,
`FormTextarea` и суммы `AmountForm` нет `leading-5`. Остальные классы узлов
(размеры, отступы, раскладка, `text-sm`, `focus-ring`, `resize-y`) не
меняются.

### 4.3. Что меняется на экране

Только `ListSearchField`: у поля поиска в панели появляется тень `shadow-xs`.
Остальные поля выглядят как сейчас: рамка, скругление, фон, тень, высота,
шрифт и высота строки совпадают с замером раздела 2.

## 5. Тесты

**Vitest.**

- Вывод утилиты: `compiler.build(['bb:field-frame'])` содержит рамку 1px,
  цвет `gray-300`, скругление `rounded-md`, белый фон, тень `shadow-xs` и
  `--bb-field-radius` — по образцу `tests/choiceBorder.test.js`.
- Таблица носителей раздела 4.2: в файле ровно столько узлов с
  `bb:field-frame`, сколько в таблице.
- Сторож: ни один класс в `src/components` не задаёт рамку поля сам —
  нет узла, у которого одновременно `bb:border-gray-300` и `bb:shadow-xs`, и
  нет `bb:[--bb-field-radius:` вне утилиты. Кнопки, карточки и галочки
  сторож не задевает: у них нет такого сочетания.
- Существующие тесты, проверяющие классы рамок этих полей, переводятся на
  `bb:field-frame`.

**Playwright, обе страницы Playground, Chromium и WebKit.**

- Все рамки полей формы и поле поиска открытой панели (`SelectSingleForm`
  «с поиском»): рамка 1px `gray-300`, скругление 6px, белый фон, тень не
  `none`; у полей из нескольких частей `--bb-field-radius` — `0.375rem`.
- Существующие проверки высоты 38px, вида поля суммы, рамки `FormTextarea`
  против `FormInput`, кольца фокуса проходят без изменений.

## 6. README

- Рядом с абзацем о `focus-ring` («Фокус у всех компонентов…») — абзац: рамка
  у полей форм одна, задана утилитой `field-frame` в `src/styles/index.css`;
  перечень полей; поле поиска в панелях с тенью, как у полей.
- Раздел «Правила API пакета»: новое поле формы берёт рамку утилитой
  `field-frame`, а не классами.

## 7. Приёмка

В Chrome — исполнитель, в Safari — владелец, в Playground: поля форм
не изменились, поле поиска в панели с тенью. Одна выкладка Playground на
приёмку и `FormTextarea`, и рамки.

## 8. Выпуск

Ветка `feat/form-textarea`. Версия `0.25.0` — последний коммит ветки после
итогового ревью этой работы. Слияние и тег `v0.25.0` — по слову владельца.

## 9. Что остаётся за исполнителем

- Запись утилиты: `@apply` с префиксом, как у `focus-ring`, или свойства;
  способ связать `--bb-field-radius` со скруглением (тема Tailwind или одно
  значение), если раздел 4.1 выполнен.
- Устройство сторожа (разбор шаблонов, как в `tests/focusRing.test.js`, или
  поиск по строкам классов) и место тестов.
