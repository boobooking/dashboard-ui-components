# Фильтры и поля формы: SelectSingle, SelectMultiple, SelectDateInterval

Дата: 2026-10-20

Макет (согласован с Тимом, приватная ссылка): https://claude.ai/artifact/3Low7yT26qN5cKj66r3ZL5.
Значки, отступы и шрифты в макете приблизительные, решает разметка пакета.

## 1. Цель и рамки

`SelectSingle`, `SelectMultiple` и `SelectDateInterval` пакета — фильтры для
панели фильтров: заголовок внутри белой рамки, под ним кнопка или два поля
даты. В формах они выглядят чужими рядом с `FormInput`: у поля формы подпись
над рамкой, рамка серая и скруглённая, высота 38px. Так вышло в payments:
поля Country, Kind и Period в формах стоят рядом с Name и отличаются от него.

Вторая проблема — у фильтров нет своей высоты и серой рамки. Каждый проект
передаёт их классом `h-18 border border-gray-200` на каждом фильтре: в
certificates 24 раза, в cashback 5. Без класса (так вышло в Calendar
payments) фильтр без пунктов ниже соседнего, а рамки нет.

Цель:

- поведение трёх компонентов — выбор, список, поиск, клавиатура, календари,
  ластики, тексты — живёт в закрытых ядрах, которые пакет не экспортирует;
- над каждым ядром две публичные обёртки, которые меняют только внешний вид:
  `…Filter` для панели фильтров и `…Form` для формы;
- у обёрток `…Filter` высота и серая рамка встроены;
- у обёрток `…Form` вид `FormInput`: подпись сверху, рамка, высота.

В рамках задачи:

- закрытые ядра `SelectSingle`, `SelectMultiple`, `SelectDateInterval`;
- шесть публичных обёрток: `SelectSingleFilter`, `SelectSingleForm`,
  `SelectMultipleFilter`, `SelectMultipleForm`, `SelectDateIntervalFilter`,
  `SelectDateIntervalForm`;
- старые публичные имена `SelectSingle`, `SelectMultiple`,
  `SelectDateInterval` больше не экспортируются;
- тесты, SSR-фикстуры, Playground, README с разделом «Обновление с 0.19»;
- выпуск `0.20.0`.

Вне рамок:

- перевод payments — задача календаря в payments, сразу после выпуска;
- перевод certificates и cashback и удаление лишних классов
  `h-18 border border-gray-200` — следующая задача, после выпуска;
- новые тексты, значки и поведение. Обёртки показывают ровно то, что
  показывают ядра: без «Не выбрано», без «Нет вариантов», без значка
  календаря (Тим);
- изменения поведения, клавиатуры и текстов ядер;
- поле одной даты как публичный компонент: `PickDay` остаётся внутренним.

## 2. Решения и их источники

| Вопрос | Решение | Кто |
| --- | --- | --- |
| Как получить вид формы | Не править поведение существующих компонентов. Ядро — внутренняя часть, две обёртки над ним: для фильтров и для форм | Тим |
| Имена | `SelectSingleFilter` / `SelectSingleForm`, `SelectMultipleFilter` / `SelectMultipleForm`, `SelectDateIntervalFilter` / `SelectDateIntervalForm` | Тим |
| Старые имена | Убрать из экспорта, чтобы их не импортировали напрямую; описать переход в README | Тим |
| Высота и рамка фильтров | Встроены в `…Filter`, как у `FormInput` встроены рамка и высота | Тим |
| Диапазон дат | Ядро `SelectDateInterval` собирается из двух полей одной даты (`PickDay`), обе обёртки — над ним | Тим |
| «от» и «до» в форме | Всегда одинаковой ширины | Тим |
| Новые тексты и значки | Нет | Тим |
| Перевод проектов | Сначала выпуск, затем перевод проектов отдельной задачей | Тим |
| Имена ядер | Файлы ядер остаются `SelectSingle.vue`, `SelectMultiple.vue`, `SelectDateInterval.vue` | Claude |
| Подпись поля формы | Проп `label`, как у `FormInput`; у фильтров остаётся `header` | Claude |
| `isLoading` у формы | Нет, как у `FormInput`; у фильтров остаётся | Claude |
| Раскладка дат по виду | Внутренний проп `look` ядра `SelectDateInterval` | Claude |
| Доступное имя поля формы | Подпись связана с кнопкой через `aria-labelledby` (внутренний проп ядра `labelledBy`), диапазон — подписанная группа; видимых изменений нет | Claude, по ревью Codex |

## 3. Ядра

Ядро — закрытый компонент пакета. `src/index.js` его не экспортирует, README
его не описывает, тест экспорта проверяет, что его нет.

### 3.1 `SelectSingle` и `SelectMultiple`

Ядро — сегодняшний компонент без заголовка и без белой рамки: кнопка
`DropdownButton` со списком, а у `SelectMultiple` — ещё поиск. Всё поведение
и все тесты поведения остаются за ядром без изменений.

Из ядра уходят:

- `ElementHeader` и внутренняя `div` с `bb:border bb:border-white bb:bg-white`;
- пропы `header`, `isRequired`, `isLoading`: их берут обёртки.

Остаются:

- `SelectSingle`: `items`, `modelValue`, события `update:modelValue` и
  `changed`;
- `SelectMultiple`: `items`, `modelValue`, `withSearch`, `lang`, те же
  события.

Корень ядра занимает всю высоту и ширину, которые дала обёртка
(`DropdownButton` уже растягивается через `grow` и `h-full`). Без пунктов
ядро, как сейчас, кнопку не рисует; обёртка при этом сохраняет свою высоту
и рамку (раздел 6).

Внутренний проп `look` (`"filter"` по умолчанию | `"form"`) есть у обоих ядер
и у `DropdownButton`. Обёртки `…Form` передают `look="form"`, и тогда кнопка
`DropdownButton` скруглена (`bb:rounded-md`): кольцо фокуса обводит
скруглённое поле, как у `FormInput`. Вид фильтра не меняется (уточнено по
итоговому ревью).

### 3.2 `SelectDateInterval`

Ядро — два `PickDay` и их значения: `dateFrom`, `dateTo`, события
`update:dateFrom`, `update:dateTo`, `changed`, правило «`changed` только когда
новое значение отличается от пропа», `lang`. Логика наблюдателей переезжает
из сегодняшнего компонента без изменений.

Раскладку двух полей задаёт внутренний проп `look`: `"filter"` (по умолчанию)
или `"form"`, с `validator`. Классы выбираются литералами в `:class`
(тернарный оператор), как требует `tests/utilityPrefix.test.js`:

- `filter`: сегодняшняя раскладка — одна строка, поля `flex-1` с вертикальной
  линией между ними, ширина ядра `w-72`;
- `form`: два поля одинаковой ширины (`grid grid-cols-2 gap-3`), каждое в
  своей рамке вида `FormInput` высотой 38px (раздел 5).

Подсказки полей — `texts.dateFrom` и `texts.dateTo` («от» и «до»), как сейчас.

В `form` ядро передаёт `look` и полям даты: внутренний проп `look` у `PickDay`
(по умолчанию `"filter"`, вид фильтра не меняется). В `form` кнопка поля и
поле ввода скруглены (`bb:rounded-md`), а отступ текста (`bb:pl-3`) стоит
на поле ввода, а не на корне `PickDay`. Так кольцо фокуса обоих носителей
обводит всё поле, как у `FormInput` (уточнено по приёмке в браузере).

## 4. Обёртки `…Filter`

Вид сегодняшних фильтров плюс встроенные высота и рамка. Корень обёртки:

- `bb:h-18 bb:border bb:border-gray-200`, внутри — прежняя рамка
  `bb:border bb:border-white bb:bg-white`, перенесённая из ядра, и раскладка
  в столбец;
- первым — `ElementHeader` с `header`, `isRequired`, `isLoading`, как сейчас;
- под ним — ядро, занимает оставшуюся высоту.

Ширина — как сейчас: у `SelectSingleFilter` и `SelectMultipleFilter` по
содержимому (`flex-none`), у `SelectDateIntervalFilter` 18rem (`w-72`), «от» и
«до» по половине.

Пропы и события обёрток — объединение пропов заголовка и ядра; обёртка
передаёт ядру его пропы и `v-model`, а наверх — его события без изменений:

| Обёртка | Пропы | События |
| --- | --- | --- |
| `SelectSingleFilter` | `items` (обяз.), `modelValue`, `header` (обяз.), `isRequired`, `isLoading` | `update:modelValue`, `changed` |
| `SelectMultipleFilter` | `items` (обяз.), `modelValue`, `header` (обяз.), `isRequired`, `isLoading`, `withSearch`, `lang` | `update:modelValue`, `changed` |
| `SelectDateIntervalFilter` | `dateFrom`, `dateTo`, `header` (обяз.), `isRequired`, `isLoading`, `lang` | `update:dateFrom`, `update:dateTo`, `changed` |

Атрибуты потребителя (`class`, `style`, остальные) ложатся на корень обёртки,
как сейчас ложатся на корень компонента: `class="ml-2"` продолжает работать.
Старый класс `h-18 border border-gray-200` на обёртке ничего не ломает: он
повторяет встроенный.

## 5. Обёртки `…Form`

Вид `FormInput`:

- строка подписи: `label` классами подписи `FormInput`
  (`bb:text-sm bb:font-medium bb:leading-5 bb:text-gray-700`), справа от неё
  красная точка `Dot` с `bb:ml-2`, пока `isRequired`;
- под ней, с `bb:mt-1`, рамка поля классами поля `FormInput`
  (`bb:rounded-md bb:border bb:border-gray-300 bb:bg-white bb:shadow-xs`),
  высотой 38px (`bb:h-9.5`), шрифт `bb:text-sm`;
- поле на всю ширину формы (`bb:block bb:w-full`).

Внутри рамки:

- `SelectSingleForm`, `SelectMultipleForm` — ядро на всю рамку; надпись
  кнопки, ластик и список — ядра, без изменений;
- `SelectDateIntervalForm` — ядро с `look="form"`: подпись одна над обоими
  полями, у каждого поля своя рамка, ширина полей одинаковая.

Подпись связана с полем для скринридера, без видимых изменений и без нового
текста:

- у подписи `id` из `useId()` обёртки (стабилен при SSR и гидратации, у двух
  полей на странице разные);
- `SelectSingleForm`, `SelectMultipleForm`: обёртка передаёт этот `id` ядру
  внутренним пропом `labelledBy`; ядро передаёт его `DropdownButton`, и кнопка
  получает `aria-labelledby="<id подписи> <id кнопки>"`. Имя кнопки — подпись
  и выбранное значение («Country AE — United Arab Emirates»), у пустого поля —
  подпись;
- `SelectDateIntervalForm`: оба поля — группа (`role="group"`,
  `aria-labelledby` на подпись); поля дат, как сейчас, называются своими
  подсказками «от» и «до» с датой;
- клик по подписи ничего не делает, как клик по заголовку фильтра.

У фильтров заголовок, как сейчас, текст без связи с кнопкой: обёртки `…Filter`
поведение не меняют.

| Обёртка | Пропы | События |
| --- | --- | --- |
| `SelectSingleForm` | `items` (обяз.), `modelValue`, `label` (обяз.), `isRequired` | `update:modelValue`, `changed` |
| `SelectMultipleForm` | `items` (обяз.), `modelValue`, `label` (обяз.), `isRequired`, `withSearch`, `lang` | `update:modelValue`, `changed` |
| `SelectDateIntervalForm` | `dateFrom`, `dateTo`, `label` (обяз.), `isRequired`, `lang` | `update:dateFrom`, `update:dateTo`, `changed` |

`class` и `style` потребителя ложатся на корень обёртки.

## 6. Пустой список и пустые значения

- Нет пунктов: ядро не рисует кнопку, как сейчас. Обёртка сохраняет высоту
  и рамку: фильтр — 4.5rem с заголовком, поле формы — пустая рамка 38px под
  подписью. Текста в пустом поле нет.
- Ничего не выбрано: надпись кнопки пустая, как сейчас.
- Входные данные ядра нормализуют, как в 0.19.1: `null` и `undefined` —
  пустой список, ничего не выбрано, пустая дата; не-объекты в `items`
  пропускаются. Новых защит у ядер нет. Обёртки добавляют одно: `null` и
  `undefined` в `header` и `label` — пустая подпись, без падения.

## 7. Клавиатура, фокус, Popover

Без изменений: всё живёт в ядрах. Кольцо фокуса — на кнопке ядра и на полях
дат, как сейчас. Список и календарь открываются в верхнем слое браузера под
кнопкой или полем и не обрезаются рамкой формы или карточкой.

## 8. Языки

Новых текстов нет. Ключи `dateFrom`, `dateTo`, `selected`, `search`,
`nothingFound`, `clear` используются ядрами, как сейчас. Проп `lang` обёрток
`SelectMultiple…` и `SelectDateInterval…` передаётся ядру.

## 9. SSR

Каждый экспортируемый компонент обязан иметь фикстуру в
`tests/ssrFixtures.js` (`tests/ssr.test.js`, `tests/hydration.test.js`).
Фикстуры трёх старых имён уходят, приходят шесть новых: у `…Filter` с
`header`, у `…Form` с `label`, остальные пропы — как у старых фикстур. Ядра
обращаются к браузеру только там, где сейчас; обёртки к браузеру не
обращаются.

## 10. Тесты

- Тесты поведения сегодняшних компонентов (`SelectSingle.test.js`,
  `SelectMultiple.test.js`, `SelectDateInterval.test.js`, `PickDay.test.js`,
  `keyboardNavigation.test.js`, `press.test.js`, `i18n.test.js`,
  `focusRing.test.js`) остаются и монтируют `…Filter` вместо старых имён.
  Проверки заголовка переходят к обёрткам. Число проверок поведения
  не уменьшается. Проверка, которая читает состояние компонента
  (`wrapper.vm.isOpen`, например `SelectSingle.test.js:237`,
  `SelectMultiple.test.js:944`), читает его у ядра:
  `wrapper.findComponent(SelectSingle).vm`; сценарий проверки не меняется.
  Обёрткам доступ к состоянию ради тестов не добавляется.
- Новые тесты обёрток (по файлу на ядро или общий файл):
  - `…Filter`: высота и рамка на корне, заголовок, точки `isRequired` и
    `isLoading`, без пунктов высота и рамка остаются, `class` потребителя
    на корне, `v-model` и `changed` проходят насквозь;
  - `…Form`: подпись и красная точка как у `FormInput`, рамка и высота поля,
    без пунктов пустая рамка остаётся, `class` на корне, `v-model` и `changed`
    проходят насквозь;
  - `SelectDateIntervalForm`: два поля одинаковой ширины (одинаковые классы
    ширины у обоих полей), каждое в своей рамке;
  - `look` ядра `SelectDateInterval`: значение вне списка отклоняет
    `validator`, раскладка `filter` по умолчанию;
  - доступное имя полей формы: у пустого `SelectSingleForm` и
    `SelectMultipleForm` кнопка ссылается на подпись, у выбранного — на
    подпись и себя; у `SelectDateIntervalForm` группа ссылается на подпись;
    у двух полей на странице разные `id`; при гидратации `id` совпадают
    (`tests/hydration.test.js` без предупреждений о несовпадении).
- `tests/exports.test.js`: ровно двадцать два компонента — девятнадцать
  минус три старых плюс шесть новых, `dashboardUi`, `downloadFile`; старые
  имена и ядра не экспортируются.
- `tests/utilityPrefix.test.js` покрывает новые файлы сам.

## 11. Playground

- Секции `SelectDateInterval`, `SelectSingle`, `SelectMultiple` заменяются:
  панель фильтров с тремя `…Filter`, в том числе фильтр без пунктов рядом
  с фильтром с пунктами, чтобы было видно одинаковую высоту;
- форма с `FormInput` и тремя `…Form` друг под другом, в том числе поле без
  пунктов и обязательное поле;
- оба окружения (голое и окружение приложения) показывают одинаковый вид:
  высота и рамки — классы пакета, не приложения.

## 12. README

- Разделы `SelectDateInterval`, `SelectSingle`, `SelectMultiple` становятся
  разделами `SelectSingleFilter`, `SelectMultipleFilter`,
  `SelectDateIntervalFilter`: поведение описано один раз, в разделе фильтра.
- Новые разделы `SelectSingleForm`, `SelectMultipleForm`,
  `SelectDateIntervalForm`: вид, пропы, события, ссылка на поведение
  в разделе фильтра.
- «Правила API пакета»: `required: true` — у `items`, `header` фильтров и
  `label` полей формы.
- «Playground»: число компонентов.
- Новый раздел «Обновление с 0.19» в формате раздела «Обновление с 0.15»:

| Было | Стало |
| --- | --- |
| `<select-single class="h-18 border border-gray-200" header="…">` | `<select-single-filter header="…">` — высота и рамка встроены |
| `<select-multiple class="h-18 border border-gray-200" header="…">` | `<select-multiple-filter header="…">` |
| `<select-date-interval class="h-18 border border-gray-200" header="…">` | `<select-date-interval-filter header="…">` |
| `SelectSingle` в форме рядом с `FormInput` | `<select-single-form label="…">` |
| `SelectMultiple` в форме | `<select-multiple-form label="…">` |
| `SelectDateInterval` в форме | `<select-date-interval-form label="…">` |

  Плюс абзац: `import { SelectSingle }` больше не работает, имена
  `SelectSingle`, `SelectMultiple`, `SelectDateInterval` из пакета убраны;
  остальные классы на фильтрах (`ml-2` и т. п.) переносятся как есть. И абзац
  о версии: `0.20.0` не подтянется по `^0.19.x`, обновление —
  `npm install @boobooking/dashboard-ui-components@^0.20.0`.

## 13. Выпуск `0.20.0`

- `package.json` — `0.20.0`;
- `npm test` и `npm run build` чистые;
- Playground проверен в обоих окружениях;
- тег `v0.20.0` и пуш ветки и тега — только с согласия Тима на этом шаге;
  публикацию в npm делает GitHub Actions по тегу.

## 14. Приёмка

- `npm test` зелёный, вывод чистый, `npm run build` без предупреждений;
- в Playground:
  - три фильтра одной высоты с серой рамкой, в том числе фильтр без пунктов;
  - три поля формы под `FormInput` одинаковой с ним высоты и рамки, подпись
    сверху, красная точка у обязательного;
  - «от» и «до» в форме одинаковой ширины;
  - клавиатура и мышь в фильтрах и полях формы работают как в 0.19.1:
    открытие, стрелки, выбор, Escape, ластик, поиск, календари;
- голое окружение и окружение приложения выглядят одинаково.

## 15. Принятые риски и отложенное

- Заголовок фильтра, как сегодня, не связан с кнопкой фильтра, и пустой
  фильтр с пунктами для скринридера — кнопка без имени. Это поведение 0.19.1;
  связать заголовок фильтра — отдельная задача, если понадобится.
- Проекты на `^0.19.x` продолжают работать на старых именах до своей миграции.

## 16. Файлы

- Изменяются: `src/components/SelectSingle.vue`, `SelectMultiple.vue`,
  `SelectDateInterval.vue` (становятся ядрами), `src/components/DropdownButton.vue`
  (`aria-labelledby` кнопки, пока задан `labelledBy`; без него атрибута нет,
  фильтры не меняются), `src/index.js`, `README.md`,
  `package.json`, `playground/App.vue`, `tests/ssrFixtures.js`,
  `tests/exports.test.js` и тесты из раздела 10.
- Создаются: `src/components/SelectSingleFilter.vue`, `SelectSingleForm.vue`,
  `SelectMultipleFilter.vue`, `SelectMultipleForm.vue`,
  `SelectDateIntervalFilter.vue`, `SelectDateIntervalForm.vue` и тесты обёрток.
