# Общий список цветов, InfoPill, ActionPill и TextPopover

Дата: 2026-10-10

## 1. Цель и рамки

Цвета в пакете сейчас разбросаны по шести местам: `SmallBadge`,
`menuItems.js`, основная кнопка `DropdownButtonWithAction`, пункты
`PopoverMenu`, строки `DataTable` (`rowColor`) и `Dot`. У каждого места свой
набор имён и свои оттенки: красный бейдж — `red-100`/`red-800`, красный пункт
меню — `red-50`/`red-700`. Пилюли действий в проектах — свои копии:
`DownloadLink` пакета (ссылка) и `Shared/ActionPill.vue` в certificates
(кнопка POST). `TextPopover` живёт в certificates, хотя писался для пакета.

Цель:

- один список цветов в пакете: правка оттенка или новый цвет — правка в одном
  файле, а не по компонентам;
- `InfoPill` — пилюля, которая только показывает текст (статус, счётчик,
  флаг, пометку), вместо `SmallBadge`;
- `ActionPill` — пилюля, которой запускают действие, с видом «идёт работа»,
  вместо `DownloadLink` и своей пилюли certificates;
- `downloadFile(url)` — скачивание файла запросом, общее для всех дашбордов;
- `TextPopover` в пакете, на `PopoverPanel`, без кода, повторяющего
  `popover.js`.

В рамках задачи (выпуск `0.16.0`):

- модуль `src/colors.js` и перевод на него `InfoPill`, `ActionPill`, `Dot`,
  `DataTable`, `DropdownButtonWithAction`, `PopoverMenu`;
- `InfoPill`, `ActionPill`, иконки `Refresh`, `Clock`, `Eye`, функция
  `downloadFile`, `TextPopover`;
- в `DataTable` полоска строки `rowStripe` вместо заливки `rowColor`;
- два пропа и событие `toggle` у `PopoverPanel` для подсказки;
- удаление `SmallBadge`, `DownloadLink`, `rowColor` и legacy-предупреждений
  об убранном API;
- README, Playground, тесты; приёмка в Chrome и Safari; версия `0.16.0`
  последним коммитом.

Вне рамок:

- перевод certificates — своя спека
  `certificates/src/docs/superpowers/specs/2026-10-10-dashboard-ui-components-0-16-design.md`
  и свой план, после выпуска пакета;
- перевод cashback (`^0.15.1`) и payments (`^0.9.0`) — свои задачи в их
  репозиториях (раздел 15 даёт образцы замены);
- russia, belarus и остальные дашборды пакет не используют;
- синий цвет, иконки сверх `download` и `refresh`, неактивное состояние
  `ActionPill`, кроме «идёт работа».

## 2. Что показало исследование

**Цвета статусов в проектах.** Карта «статус → цвет» везде во фронте, бэкенд
отдаёт только подпись.

| Проект | Цветов статусов | Какие |
| --- | --- | --- |
| certificates | 4 | green, red, yellow, gray — SMS (`resources/js/models/sms.js`) |
| cashback | 3 | green, red, gray — `PaymentStatusBadge`, `DiscontoReceiptStatusBadge` |
| russia, belarus, belarus-dashboard, overweight, health-days-backend, cashback-vetkit-backend | 2 | green, gray |
| payments | 0 | статусов нет |

Других цветов у пилюль два: `indigo` — счётчик «Найдено» в `DataTable` и «Будет
добавлено» на форме ключей certificates; `purple` — пилюли действий во всех
дашбордах (`bg-purple-100 text-purple-800 hover:text-purple-600`). `blue`
в `SmallBadge` есть, но не используется нигде, кроме мёртвого кода overweight.

**Где `SmallBadge` кроме статусов.** Счётчики (`DataTable` «Найдено»,
пять плашек на `Groups/Keys/Create` certificates), флаги «да/нет» в карточках
cashback, пометка «added» в payments. Поэтому имя — не `StatusPill`.

**Загрузка в пилюле.** В belarus (`resources/js/Shared/DownloadXls.vue`,
из belarus-dashboard, коммит 121fd49 «индикация, что идут формирование
отчёта») файл качается axios-запросом за blob с таймаутом 300 с; пока он
идёт — статичные часы вместо иконки, «формируется отчёт», курсор
`not-allowed`. В certificates xlsx — обычная ссылка, конец скачивания странице
не виден; «запросить статусы» — Inertia POST, пока он идёт, пилюля погашена
(`opacity-40`).

**Полоска строки.** belarus, список мероприятий
(`resources/js/Pages/Events/Index.vue:131-139`): в первой ячейке —
`absolute left-0 top-0 bottom-0 w-1`, красная (`bg-red-500`) за 3 дня до конца
активного мероприятия, жёлтая (`bg-yellow-400`) за 14. `rowColor` пакета
заливает всю строку и не используется ни одним проектом.

**Нестыковки оттенков в пакете.** У `green`, `gray`, `indigo` бейджа текст
серый (`text-gray-700`), у `red`, `yellow` — своего тона (`-800`); `green` —
`-50` против `-100` у остальных. Красный бейдж — `red-100`/`red-800`, красная
кнопка и пункт меню — `red-50`/`red-700`.

**Высота.** `SmallBadge` — `py-2` и строка 12 px, пилюля действия — `py-1.5`
и иконка 16 px: обе 28 px. Менять нечего.

**`TextPopover` и `popover.js`.** `TextPopover` certificates держит свои копии
`canControlPopover`, `isPopoverOpen`, размещения у кнопки и закрытия по
прокрутке и размеру окна. Всё это есть в `popover.js` и `PopoverPanel`.
Отличия: подсказка открывается туда, где места больше (меню — вниз, если
помещаются); при пустом тексте кнопка погашена (`PopoverPanel` при
`hasContent: false` не рисует ничего); доступное имя области — «Полный текст»
(`PopoverPanel` называет панель по кнопке); у области `tabindex="0"`; запрет
выделения страницы, пока подсказка открыта.

**Правила API пакета (README).** Булев проп состояния — `is*` (`isLoading`).
Классы в `:class` — литералами; `tests/utilityPrefix.test.js` разрешает
только два исключения: `$attrs.class` и `panelClass` в `PopoverPanel.vue`.
Tailwind пакета смотрит только `src/components` (`@source '../components'`).

## 3. Решения и их источники

| Решение | Источник |
| --- | --- |
| Компонент только рисует: пропы вида, состояние и событие; действие задаёт приложение. Повторяющаяся во всех дашбордах логика — функция пакета | владелец |
| Пилюля без действия — `InfoPill`; `SmallBadge` убирается без псевдонима | владелец, выбор из вариантов |
| `ActionPill` — отдельный компонент; `DownloadLink` убирается | владелец |
| Шесть цветов: gray, green, yellow, red, indigo, purple; имена по тону | владелец, выбор из вариантов |
| Одна схема пилюль: фон `-100`, текст `-800` своего тона | владелец, выбор в браузере (вариант B) |
| Кнопка: фон `-100`, рамка `-300`, текст `-800`, наведение `-200`; пункт меню: текст `-800`, фокус `-100`; `Dot` и полоска — `-500` | владелец, таблица цветов в браузере |
| Список — модуль `src/colors.js` с готовыми классами | владелец, выбор из трёх подходов |
| «Идёт работа»: пилюля погашена `opacity-60`, курсор `not-allowed`, часы с бегущими стрелками (минутная — 1 с, часовая — 12 с), текст из пропа | владелец, выбор в браузере |
| Проп состояния — `isLoading` | правило README; владелец |
| `rowColor` убирается, полоска строки слева — `rowStripe`, все цвета списка | владелец |
| `Dot` — любой цвет списка | владелец |
| Legacy-предупреждения об убранном API удаляются; об убранном говорят только разделы миграции README | владелец |
| `TextPopover` переписывается на `PopoverPanel`; функциональность сохраняется | владелец |
| Пустой текст — `TextPopover` не рисует ничего | владелец |
| Запрет выделения — по событию `toggle` `PopoverPanel` о фактическом состоянии, а не по `update:modelValue` с подавленным эхом | ревью спеки |
| Две спеки и два плана: пакет, затем certificates; cashback и payments — свои задачи | дизайн, часть 5, одобрена |

## 4. Список цветов — `src/colors.js`

Внутренний модуль: из `index.js` не экспортируется.

```js
// Общий список цветов пакета: имя цвета — классы каждого места, где цвет
// встречается. Классы записаны целиком, литералами: Tailwind пакета
// генерирует только те утилиты, которые видит в исходниках
// (@source '../colors.js' в styles/index.css).
const COLORS = {
    gray: {
        pill: 'bb:bg-gray-100 bb:text-gray-800',
        pillHover: 'bb:hover:text-gray-600',
        button: 'bb:bg-gray-100 bb:border-gray-300 bb:text-gray-800 bb:hover:bg-gray-200',
        menuItem: 'bb:text-gray-800 bb:focus:bg-gray-100',
        mark: 'bb:text-gray-500',
    },
    green: { … },
    yellow: { … },
    red: { … },
    indigo: { … },
    purple: { … },
}
```

У всех шести цветов одна схема, отличается только тон:

| Набор | Где | Классы |
| --- | --- | --- |
| `pill` | `InfoPill`, `ActionPill` | `bg-<тон>-100 text-<тон>-800` |
| `pillHover` | `ActionPill`, когда не идёт работа | `hover:text-<тон>-600` |
| `button` | основная кнопка и стрелка `DropdownButtonWithAction` | `bg-<тон>-100 border-<тон>-300 text-<тон>-800 hover:bg-<тон>-200` |
| `menuItem` | пункт `PopoverMenu` | `text-<тон>-800 focus:bg-<тон>-100` |
| `mark` | `Dot`, полоска строки `DataTable` | `text-<тон>-500` |

`mark` задаёт цвет текста, а не фона: `Dot` — SVG с `fill-current`, полоска —
блок с `bb:bg-current`. Так у точки и полоски один набор.

Модуль экспортирует для пакета:

- `COLOR_NAMES` — `Object.keys(COLORS)`, порядок как в объекте;
- `isColor(name)` — `true` только для строки из `COLOR_NAMES`;
- `colorClass(name, part)` — строка классов набора `part` цвета `name`;
  неизвестный цвет — пустая строка.

«Без цвета» в список не входит: белая кнопка, обычный пункт меню, строка без
полоски — вид компонента по умолчанию, их классы остаются в компоненте.

Компоненты берут классы через миксин `withColors` из `colors.js`: метод
`colorClass(name, part)` — для шаблона.

**Проверка префикса.** `tests/utilityPrefix.test.js`:

- в `:class` разрешается третья форма — вызов `colorClass(…)` (callee —
  идентификатор `colorClass`); любой другой вызов, как и сейчас, — ошибка;
- новый тест проверяет каждую строку каждого набора `COLORS`: каждая утилита
  с префиксом `bb:`, у каждого цвета ровно пять наборов
  `pill`, `pillHover`, `button`, `menuItem`, `mark`.

README, «Правила API пакета»: правило о литералах дополняется — цветовые
классы берутся из `colors.js` вызовом `colorClass`, а свои цветовые классы
в компонентах не пишутся.

## 5. `InfoPill`

Заменяет `SmallBadge`; файл `SmallBadge.vue` удаляется.

```html
<info-pill text="доставлено" color="green" />
```

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `text` | `String` | обязателен | Текст пилюли |
| `color` | `String` | обязателен | Имя из списка цветов; `validator: isColor` |

Корень — `<span>`:
`bb-dashboard-ui bb:inline-flex bb:items-center bb:px-3 bb:py-2 bb:rounded-full bb:text-xs bb:font-medium bb:leading-none bb:select-none bb:whitespace-nowrap`
плюс `colorClass(color, 'pill')`. Текст — `v-text`; `null` и `undefined` —
пустая строка. Неизвестный цвет: валидатор предупреждает, пилюля рисуется без
цветовых классов. Событий нет.

## 6. `ActionPill`

Заменяет `DownloadLink`; файл `DownloadLink.vue` удаляется. Пилюля не знает,
что запускает: страница слушает `click` и сама передаёт `isLoading`.

```html
<action-pill
    icon="download"
    title="скачать xlsx"
    loading-text="формируется отчёт"
    :is-loading="exportLoading"
    @click="exportOrders"
/>
```

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `title` | `String` | обязателен | Подпись и всплывающая подсказка |
| `icon` | `String` | обязателен | `"download"` или `"refresh"` |
| `color` | `String` | `"purple"` | Имя из списка цветов |
| `isLoading` | `Boolean` | `false` | Идёт работа |
| `loadingText` | `String` | `null` | Подпись на время работы; нет — остаётся `title` |

Событие `click` без аргументов; объявлено в `emits`, поэтому обработчик
страницы не вешается на корень вторым.

Корень — `<button type="button">`:
`bb-dashboard-ui bb:inline-flex bb:items-center bb:px-3 bb:py-1.5 bb:rounded-full bb:text-xs bb:font-medium bb:leading-none bb:select-none bb:whitespace-nowrap`
плюс `colorClass(color, 'pill')`. Атрибут `title` — видимая подпись.

| | Не идёт работа | Идёт работа (`isLoading`) |
| --- | --- | --- |
| Иконка | по `icon` | `Clock` |
| Подпись | `title` | `loadingText ?? title` |
| Классы | `bb:cursor-pointer` + `colorClass(color, 'pillHover')` | `bb:opacity-60 bb:cursor-not-allowed` |
| Атрибуты | — | `disabled`, `aria-busy="true"` |

`disabled` — второй клик браузер не пропустит, и `click` не придёт. Подпись —
`<span class="bb:ml-1">`. Неверные значения пилюлю не роняют: валидатор
предупреждает, а пилюля рисуется — без иконки при неизвестном `icon`, без
цветовых классов при неизвестном `color`; `null` в `title` и `loadingText` —
как отсутствие текста.

**Иконки.** В `src/components/icons/`, внутренние; у каждой
`bb:w-4 bb:h-4`, `aria-hidden="true"`:

- `Download` — есть;
- `Refresh` — стрелки из `Shared/ActionPill.vue` certificates
  (`M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15`);
- `Clock` — часы с бегущими стрелками;
- `Eye` — из `Shared/icons/Eye.vue` certificates, для `TextPopover`
  (`bb:h-5 bb:w-5`, как сейчас).

Карта `icon` → компонент — в `ActionPill`; `validator` — по её ключам.
Новое действие с новой иконкой — новая иконка и новое имя в пакете.

**`Clock`.** `viewBox="0 0 24 24"`, `stroke="currentColor"`,
`stroke-width="2"`, `stroke-linecap="round"`, без заливки: окружность
`r="9"` в центре, часовая стрелка — линия из центра до `(15, 12)`,
минутная — до `(12, 6.5)`. Стрелки крутятся вокруг центра:

- минутная — `bb:animate-spin` (оборот за 1 с);
- часовая — `bb:animate-[spin_12s_linear_infinite]`;
- у обеих `bb:origin-center` и `bb:motion-reduce:animate-none`.

У SVG-элементов `transform-box` по умолчанию — `view-box`, поэтому
`origin-center` — центр `viewBox`, `(12, 12)`. Своего CSS и своих
`@keyframes` нет: `spin` Tailwind генерирует вместе с `animate-spin`.
После сборки проверить в `dist/style.css`, что `@keyframes spin` и обе
анимации на месте.

## 7. `downloadFile(url)`

Файл `src/download.js`, экспорт из `index.js`. Скачивает файл запросом
и отдаёт его браузеру; возвращает `Promise<void>`.

```js
exportOrders() {
    this.exportLoading = true;
    downloadFile(this.exportUrl)
        .catch(() => { this.exportFailure = "Попробуйте ещё раз"; })
        .finally(() => { this.exportLoading = false; });
}
```

1. `fetch(url, { credentials: 'same-origin' })` — с cookie сессии. Сетевая
   ошибка — Promise отклоняется ошибкой `fetch`.
2. `response.redirected` — отклоняется `Error`: сервер перенаправил, обычно на
   страницу входа после истёкшей сессии; без проверки скачался бы HTML.
3. `!response.ok` — отклоняется `Error` с кодом ответа в тексте.
4. Имя файла — из `Content-Disposition`: сначала `filename*=UTF-8''…`
   (`decodeURIComponent`), затем `filename="…"` или `filename=…` без кавычек
   (так отдаёт Laravel: `attachment; filename=orders_export.xlsx`). Заголовка
   или имени нет — последний непустой сегмент пути `url`
   (`decodeURIComponent`); и его нет — `download`.
5. `response.blob()` → `URL.createObjectURL` → скрытая
   `<a href download="имя">` в `document.body`, `click()`, ссылка удаляется.
6. Blob-адрес освобождается `URL.revokeObjectURL` через 40 с: немедленное
   освобождение в части браузеров обрывает скачивание (так же делает
   FileSaver.js). Проверить в Safari при приёмке.

Таймаута нет: у `fetch` его нет по умолчанию, ждём, сколько держит сервер.
Уход со страницы скачивание не прерывает. Обращение к `window` и `document`
— только при вызове, загрузке модуля на сервере это не мешает.

## 8. `Dot`

- `color` — любое имя из списка (`validator: isColor`), обязателен, как сейчас;
- цвет — `colorClass(color, 'mark')` на корне вместо `isRed`/`isGreen`;
- `withPulse` — как сейчас.

`ElementHeader` (красная точка загрузки и обязательного поля) не меняется:
`red` есть в списке, оттенок тот же, `-500`.

## 9. `DataTable`

- Бейдж «Найдено…» и бейдж `emptyText` — `InfoPill` цвета `indigo`.
- Проп `rowColor`, `ROW_COLORS` и метод `colorOf` удаляются. Строки всегда
  `bb:bg-white bb:even:bg-gray-50`.
- Проп `rowStripe`: `Function`, по умолчанию `null`; `row => имя цвета | null`.

Полоска — в первой видимой ячейке строки, первым элементом перед слотом:

```html
<span
    v-if="columnIndex === 0 && stripeOf(row) !== null"
    class="bb:absolute bb:left-0 bb:inset-y-0 bb:w-1 bb:bg-current"
    :class="colorClass(stripeOf(row), 'mark')"
    aria-hidden="true"
></span>
```

Ячейки уже `bb:relative`. `stripeOf(row)`: `rowStripe` не функция — `null`;
результат не имя из списка (`isColor`) — `null`. Полоска только для глаз:
смысл цвета страница показывает и в данных строки.

## 10. `DropdownButtonWithAction`, `HamburgerMenu`, `PopoverMenu`

**Цвета.**

- `menuItems.js`: `const COLORS = ['yellow', 'red']` удаляется; `isMenuItem`
  и `itemColor` проверяют цвет `isColor`. Пункт с цветом вне списка валидатор
  отклоняет, рисуется он обычным.
- Основная кнопка и стрелка `DropdownButtonWithAction`: при цвете —
  `colorClass(mainColor, 'button')` вместо объектов с `yellow` и `red`; без
  цвета — нынешние белые классы.
- Пункты `PopoverMenu`: при цвете — `colorClass(color(item), 'menuItem')`;
  без цвета — нынешние классы.
- Кнопка ☰ `HamburgerMenu` не красится.

Красный становится `red-100`/`red-800` (сейчас `red-50`/`red-700`) у кнопки,
стрелки и пункта; жёлтый не меняется.

**Legacy удаляется.**

- `menuItems.js`: проверка `item.danger !== undefined` в `isMenuItem`
  и `itemColor`, миксин `warnsRemovedDanger` и комментарии о нём. Пункт
  с полем `danger` — пункт с лишним полем: валидатор его не отклоняет,
  цвет — по `color`.
- `DropdownButtonWithAction`: хук `created()` с предупреждениями «слот actions
  убран» и «слот button убран»; миксин `warnsRemovedDanger`.
- `HamburgerMenu`: миксин `warnsRemovedDanger`.
- Тесты этих предупреждений (`DropdownButtonWithAction.test.js`, блок «убранное
  поле danger» и проверки слотов; `HamburgerMenu.test.js` — то же).
- README, раздел `DropdownButtonWithAction`: упоминания предупреждений.
  Разделы «Обновление с 0.14» и «Обновление с 0.13» остаются.

## 11. `TextPopover` и `PopoverPanel`

**API** — как у `TextPopover` certificates:

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `text` | `String` | обязателен | Скрытый текст; `null`, `undefined` и `""` — компонента нет |
| `modelValue` | `Boolean` | `false` | Открыта ли подсказка; `v-model` необязателен |
| `lang` | `String` | язык плагина | `"ru"` или `"en"` — через `withLang` |

Событие `update:modelValue` — когда подсказка открылась или закрылась сама:
кнопкой, кликом вне, Escape, прокруткой, изменением размера окна, опустевшим
текстом. Входящее значение эхом не возвращается — как у меню
`DropdownButtonWithAction`.

**Устройство.** Корень — `PopoverPanel`:

```html
<popover-panel
    class="bb-dashboard-ui bb:inline-flex"
    :has-content="!isEmpty"
    :model-value="modelValue"
    align="end"
    :max-width="384"
    panel-role="region"
    :panel-label="texts.fullText"
    panel-focusable
    panel-class="bb:p-3 bb:rounded-md bb:border bb:border-gray-200 bb:bg-white bb:shadow-lg bb:text-left bb:text-sm bb:leading-5 bb:text-gray-700 bb:whitespace-normal bb:break-words bb:overscroll-contain bb:select-text bb:focus:outline-hidden bb:focus-visible:ring-2 bb:focus-visible:ring-indigo-500"
    @update:model-value="$emit('update:modelValue', $event)"
    @toggle="onPanelToggle"
>
    <template #trigger="{ id, popovertarget }">
        <button
            type="button"
            :id="id"
            :popovertarget="popovertarget"
            class="bb:relative bb:text-gray-400 bb:hover:text-gray-600 bb:rounded-md bb:focus:outline-hidden bb:focus-visible:ring-2 bb:focus-visible:ring-indigo-500"
        >
            <span class="bb:sr-only">{{ texts.showText }}</span>
            <eye/>
        </button>
    </template>
    {{ normalizedText }}
</popover-panel>
```

Классы кнопки и панели — нынешние классы `TextPopover` с префиксом, без
`disabled:*`: погашенной кнопки больше нет.

Делает `PopoverPanel`: открытие и закрытие по `popovertarget`, клику вне
и Escape; место у кнопки (`placePopover`, `fitPopover`); закрытие прокруткой
вне панели и изменением размера окна; входящий `modelValue`; закрытие
и событие `update:modelValue(false)`, когда текст опустел при открытой
подсказке (`hasContent: false`); событие `toggle` о фактическом состоянии
панели (ниже).

Своё у `TextPopover`:

- `isEmpty` — `text` не строка или пустая строка;
- `onPanelToggle(isOpen)` — запрет выделения страницы: `lockPageSelection()`
  при `true`, `unlockPageSelection()` при `false` (общий счётчик модуля, как
  сейчас);
- `beforeUnmount` — `unlockPageSelection()`.

Запрет выделения привязан к `toggle`, а не к `update:modelValue`:
`PopoverPanel` не возвращает родителю входящий `modelValue`, и по
`update:modelValue` подсказка, открытая через `v-model`, не запретила бы
выделение, а открытая кнопкой и закрытая через `v-model` — не сняла бы
запрет до размонтирования.

Запрет выделения переносится из certificates без изменений: пока открыта хотя
бы одна подсказка, `<html>` получает `user-select: none`; прежние стили
запоминает первая взявшая запрет, возвращает последняя отпустившая.

**Новое в `PopoverPanel`.**

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `panelLabel` | `String` | `null` | Доступное имя панели: `aria-label`, и тогда без `aria-labelledby` |
| `panelFocusable` | `Boolean` | `false` | `tabindex="0"` у панели: длинное содержимое прокручивается с клавиатуры |

Событие `toggle(isOpen)` — панель фактически открылась или закрылась, по
любой причине, в том числе по входящему `modelValue`. Подавление эха
`update:modelValue` на `toggle` не распространяется:

- `created()` — `this.panelShown = false`: открыта ли панель в браузере
  сейчас, по последнему событию;
- `onToggle()` — после расчёта фактического `isOpen`: если `isOpen` не равно
  `panelShown`, `panelShown = isOpen` и `$emit('toggle', isOpen)`; затем,
  как сейчас, сравнение с `panelIsOpen` и `update:modelValue`;
- обработчик `hasContent` при `false`: браузер не присылает `toggle`, удаляя
  открытую панель из DOM, — если `panelShown`, то `panelShown = false`
  и `$emit('toggle', false)`;
- без Popover API событий `toggle` нет: панель видна в потоке всегда.

Меню, список `SelectSingle` и календарь новых пропов не передают и `toggle`
не слушают — для них ничего не меняется. Пропы внутреннего компонента,
правило `is*`/`with*` к ним не применяется, как к `arrows`, `closeOnClick`,
`returnFocus`.

**Что меняется для пользователя.** Подсказка открывается по правилу меню:
вниз, если помещается, иначе туда, где места больше. Пустой текст — нет ни
иконки, ни подсказки (в certificates — погашенная иконка).

**Тексты** — `i18n.js`: `showText` — «Показать текст» / «Show text»,
`fullText` — «Полный текст» / «Full text».

## 12. `i18n.js`, `index.js`, `styles/index.css`

- `i18n.js`: ключ `download` удаляется (его брал только `DownloadLink`);
  добавляются `showText`, `fullText`.
- `index.js`: добавляются `InfoPill`, `ActionPill`, `TextPopover`,
  `downloadFile`; удаляются `SmallBadge`, `DownloadLink`. Компонентов
  шестнадцать, плюс плагин `dashboardUi` и функция `downloadFile`.
- `styles/index.css`: `@source '../colors.js'` рядом с
  `@source '../components'`. Комментарий к сбросу ссылок «как у DownloadLink»
  исправляется: ссылкой-корнем в пакете больше никто не является.

## 13. README, Playground, тесты

**README.**

- раздел «Цвета»: шесть имён, таблица наборов из раздела 4, где какой набор
  берётся; «без цвета» — вид по умолчанию;
- разделы `InfoPill`, `ActionPill`, `TextPopover`, `downloadFile` — по
  разделам 5, 6, 7, 11;
- `Dot` — цвета из списка; `DataTable` — `rowStripe` вместо `rowColor`,
  пример с `info-pill` и `action-pill` вместо `small-badge` и `download-link`;
  `DropdownButtonWithAction` и `HamburgerMenu` — цвет пункта — имя из списка;
- разделы `SmallBadge` и `DownloadLink` удаляются;
- «Компоненты»: перечень и число; «Playground»: «шестнадцатью»;
- «Правила API пакета»: исключение `DownloadLink` в правиле о ссылках
  удаляется; правило о `:class` — по разделу 4;
- раздел «Обновление с 0.15»:

  | Было | Стало |
  | --- | --- |
  | `SmallBadge` | `InfoPill`, пропы те же; `blue` нет |
  | `<download-link :url title>` | `<action-pill icon="download" :title :is-loading @click>` + `downloadFile(url)` |
  | своя пилюля-кнопка с `loading` и `clicked` | `ActionPill`, `isLoading`, `click` |
  | `rowColor` | `rowStripe` — полоска слева, а не заливка |
  | `color` пункта и `Dot` — два значения | шесть имён списка |
  | красный пункт и кнопка `red-50`/`red-700` | `red-100`/`red-800` |
  | предупреждения о `danger` и слотах | нет; пункт с `danger` — обычный |

  и что `0.16.0` не подтянется по `^0.15.x`.

**Playground** (`playground/App.vue`):

- таблица цветов: шесть строк и «без цвета», столбцы `InfoPill`,
  `ActionPill`, кнопка со стрелкой, пункт меню, `Dot`, полоска строки;
- `ActionPill` `download` и `refresh` с переключателем `isLoading`;
- `TextPopover`: короткий, длинный, пустой текст, кнопка, меняющая текст на
  пустой при открытой подсказке;
- `DataTable` с `rowStripe`;
- удаляются `SmallBadge`, `DownloadLink`, `rowColor`, `danger`.

**Тесты** (vitest, как существующие):

| Файл | Что проверяет |
| --- | --- |
| `colors.test.js` (новый) | шесть имён в порядке; пять наборов у каждого; `isColor` — только имена списка (не `blue`, не `null`, не `''`); `colorClass` неизвестного — `''` |
| `utilityPrefix.test.js` | вызов `colorClass(…)` в `:class` разрешён, другой вызов — ошибка; префикс `bb:` у каждой утилиты `COLORS` |
| `InfoPill.test.js` (новый) | текст; классы `pill` каждого цвета; `null` — пустой текст; неверный цвет — предупреждение валидатора, без цветовых классов |
| `ActionPill.test.js` (новый) | иконка по `icon`; `click`; `isLoading`: `disabled`, `aria-busy`, `bb:opacity-60`, `Clock`, `loadingText`, без `loadingText` — `title`, без `pillHover`; `click` не приходит; цвет по умолчанию `purple` |
| `download.test.js` (новый) | `fetch` подменяется в тесте: имя из `filename*`, из `filename="…"`, из `filename=…`, из пути, `download`; ошибка на 404 и 500; ошибка при `redirected`; `credentials: 'same-origin'`; ссылка кликнута и удалена; `revokeObjectURL` через 40 с (фальшивые таймеры) |
| `Dot` (в существующем или новом файле) | `mark` каждого цвета; `withPulse` |
| `DataTable.test.js` | тесты `rowColor` заменяются: полоска в первой видимой ячейке при цвете; нет при `null`, неизвестном цвете, не функции; строки полосатые всегда; бейджи — `InfoPill` `indigo` |
| `DropdownButtonWithAction.test.js`, `HamburgerMenu.test.js` | шесть цветов кнопки, стрелки и пункта; пункт с `danger` — обычный, без предупреждения; тесты предупреждений удаляются |
| `PopoverPanel.test.js` | `panelLabel` — `aria-label` без `aria-labelledby`; без него — как сейчас; `panelFocusable` — `tabindex="0"`; `toggle(true)` при открытии кнопкой, при `modelValue: true` на монтировании и при смене `modelValue` на `true`; `toggle(false)` при закрытии кнопкой, при `modelValue: false` после открытия кнопкой и при пропаже содержимого у открытой панели; без `toggle`, когда состояние не изменилось; эхо `update:modelValue` по-прежнему подавлено |
| `TextPopover.test.js` (новый) | пустой и `null` текст — ничего; открытие кнопкой; `v-model` открывает и закрывает без эха; опустевший текст закрывает и шлёт `update:modelValue(false)`; запрет выделения: при `modelValue: true` на монтировании, при открытии кнопкой и через `v-model`; снятие: при закрытии кнопкой, через `v-model` после открытия кнопкой, при опустевшем тексте, при размонтировании; две подсказки — запрет держится, пока открыта хоть одна; имя области «Полный текст»; `tabindex="0"`; язык `en` |
| `i18n.test.js` | случаи `DownloadLink` удаляются; `TextPopover` на `ru`, `en`, по плагину |
| `exports.test.js` | новый список экспортов, `downloadFile` — функция |
| `ssrFixtures.js` | `InfoPill`, `ActionPill`, `TextPopover` вместо `SmallBadge`, `DownloadLink` |

## 14. Что видит пользователь

- Статусы и счётчики: зелёный ярче и с зелёным текстом, серый светлее фоном
  и темнее текстом, индиго — с индиговым текстом.
- Красная кнопка и красный пункт меню — на ступень насыщеннее.
- Пилюля действия во время работы погашена, вместо иконки бегут стрелки
  часов, подпись — текст на время работы; повторный клик не проходит.
- Подсказка с текстом открывается вниз, если помещается; при пустом тексте
  иконки нет.

## 15. Образцы замены для проектов

| Было | Стало |
| --- | --- |
| `import { SmallBadge } …`, `<small-badge :text :color/>` | `import { InfoPill } …`, `<info-pill :text :color/>` |
| `<download-link :url="exportUrl" title="скачать xlsx"/>` | `<action-pill icon="download" title="скачать xlsx" loading-text="формируется отчёт" :is-loading="exportLoading" @click="exportOrders"/>` + метод из раздела 7 + `NotificationMessage` на ошибку |
| своя пилюля `:loading="x" @clicked="f"` | `<action-pill icon="refresh" :title :loading-text :is-loading="x" @click="f"/>` |
| `:row-color="row => …"` | `:row-stripe="row => …"` |

## 16. Выпуск

Ветка — текущая `main`. Порядок:

1. коммиты по разделам: список цветов; `InfoPill`; `ActionPill`, иконки
   и `downloadFile`; `Dot` и `DataTable`; меню и legacy; `PopoverPanel`
   и `TextPopover`; README; Playground;
2. `npm test` — все тесты зелёные, вывод без предупреждений; `npm run build`;
3. приёмка в Chrome и Safari — Playground, собранный статически в
   `certificates/src/public/build/ui-playground/` и открытый на
   `https://certificates.test/build/ui-playground/index.html` и `host.html`:
   таблица цветов, часы и `prefers-reduced-motion`, `TextPopover` у краёв
   окна; `downloadFile` в Safari — на странице certificates до релиза
   (`npm pack`, `npm install --no-save <архив>`);
4. итоговое ревью;
5. `chore:`-коммит с `0.16.0` в `package.json` и двух местах
   `package-lock.json` — последним;
6. пуш `main`, зелёный `Test` по полному SHA версионного коммита, тег
   `v0.16.0` на этот SHA, пуш одного тега.

Пуш и тег — по слову владельца.

## 17. Принятые риски

- Ломающий выпуск: проект, поднявший версию без замен из раздела 13, не
  соберётся (`SmallBadge`, `DownloadLink` не экспортируются) — это и есть
  сигнал. `rowColor` молча перестанет работать — его никто не передаёт.
- Пункт со старым `danger: true` без `color` станет обычным, без
  предупреждения: так решил владелец; в проектах на `0.15` такого поля нет.
- Все шесть цветов попадают в CSS пакета целиком, даже неиспользуемые
  сочетания (фиолетовый пункт меню): десятки классов, принято ради одного
  списка.
- `downloadFile` держит файл в памяти вкладки целиком; отчёты дашбордов —
  единицы мегабайт.
- Popover API для `TextPopover` — Safari 17+, Chrome 114+, Firefox 125+, как
  у меню; в браузерах старше текст виден в потоке всегда.
