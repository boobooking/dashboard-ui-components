# HamburgerMenu и общее приватное меню PopoverMenu

Дата: 2026-10-08

## 1. Цель и рамки

Меню профиля в шапке трёх проектов (`resources/js/Shared/NavigationHeader.vue`
в payments, cashback и certificates) собрано из публичного `Popup` и разметки
проекта: кнопку ☰, панель и пункты проект верстает сам. Меню строк таблиц
(`DropdownButtonWithAction`) уже работает иначе: Popover API, пункты данными
(`actions`), стрелки и мышь ведут подсветку, Enter нажимает пункт, Escape и
клик вне меню закрывают его. Вид пунктов у него задаёт только библиотека.

Цель: меню профиля работает и выглядит так же, как меню
`DropdownButtonWithAction`, на тех же технологиях, а проект передаёт только
список пунктов. Вид и поведение меню живут в одном месте пакета, чтобы любое
изменение — например, будущая анимация появления — делалось одной правкой
для обоих меню.

В рамках задачи (выпуск пакета `0.15.0`):

- приватный компонент `PopoverMenu` — панель меню, пункты и всё поведение
  меню; `DropdownButtonWithAction` переходит на него без изменения своего API;
- внутренний модуль `menuItems.js` — проверка и разбор пунктов;
- публичный компонент `HamburgerMenu` — кнопка ☰ с меню на `PopoverMenu`;
- `Popup`, `PickDay` и `Closer` больше не экспортируются;
- тесты, playground, README с разделом «Обновление с 0.14»;
- выпуск `0.15.0`.

Вне рамок:

- перевод шапок проектов на `HamburgerMenu` — свои задачи в их
  репозиториях (раздел 11);
- перевод `SelectSingle` и `PickDay` с `Popup` на Popover API и удаление
  `Popup` и `Overlay` — следующая отдельная задача;
- решение по `Dot` — отдельно;
- анимация появления меню — не делается, но её место определено (раздел 4.6);
- мобильный вариант меню профиля: блок с кнопкой в шапках скрыт на узких
  экранах (`hidden sm:flex`), это разметка проектов.

## 2. Что показало исследование

Импорты из пакета собраны по исходникам трёх проектов (52 файла, сверено
вторым поиском); импортов в обход публичного экспорта нет, плагин компоненты
глобально не регистрирует.

- `Popup` напрямую вызывают только три `Shared/NavigationHeader.vue`. Внутри
  пакета его используют `DropdownButton` (список `SelectSingle`) и `PickDay`.
- `PickDay` и `Closer` в проектах не упоминаются вовсе, локальных копий нет.
  Внутри пакета `PickDay` использует `SelectDateInterval`, `Closer` —
  `PageCard`.
- Шапки трёх проектов совпадают: кнопка ☰ с одинаковыми классами,
  `aria-label="Main menu"` и неизменным `aria-expanded="false"`, панель
  `mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black/5`, пункты —
  Inertia `<Link as="button">` с классами
  `block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100
  hover:text-gray-900`. Панель и пункты по виду совпадают с меню
  `DropdownButtonWithAction`; отличаются только подсветкой по наведению
  вместо фокуса и анимацией появления у `Popup`.
- Пункты certificates и cashback: «Администраторы», «Поменять пароль»,
  «Выйти». payments: «Users», «Settings», «Change password», «Log out».
- «Выйти» — `<Link method="delete">`: это запрос DELETE, а не переход.

## 3. Решения и их источники

| Решение | Источник |
| --- | --- |
| Имя публичного компонента — `HamburgerMenu` | выбор владельца из вариантов |
| Меню на Popover API, как `DropdownButtonWithAction`; стрелки, Enter, Escape — как в выпуске 0.14 | владелец |
| Без анимации; устроено так, чтобы её было просто добавить | владелец |
| Вид и поведение меню — в одном приватном компоненте, публичные компоненты рисуют только свою кнопку (подход A) | выбор владельца из трёх подходов |
| `SelectSingle` и `PickDay` переводятся на Popover API отдельной задачей | владелец |
| `Popup`, `PickDay`, `Closer` — приватные | владелец |
| Пункты `HamburgerMenu` — в формате `actions` `DropdownButtonWithAction`; «Выйти» — пункт-действие с `router.delete` | согласовано в дизайне |
| У `HamburgerMenu` нет `v-model` | согласовано в дизайне |
| Перевод проектов — отдельными задачами | согласовано в дизайне |
| Одна версия `0.15.0` | согласовано в дизайне |

## 4. `PopoverMenu` (приватный)

Файл `src/components/PopoverMenu.vue`. В него переезжает из
`DropdownButtonWithAction` всё, кроме основной кнопки и вида кнопки,
открывающей меню. Код переносится, а не пишется заново: комментарии,
исправления и порядок действий сохраняются.

### 4.1. Интерфейс

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `actions` | любой | `[]` | Пункты меню; разбор — `toMenuItems` (раздел 4.3) |
| `modelValue` | `Boolean` | `false` | Открыто ли меню |

Событие `update:modelValue` — с тем же смыслом, что сейчас у
`DropdownButtonWithAction`: входящее значение только принимается, без
ответного события; о каждом открытии и закрытии самим меню (кнопка, клик вне,
Escape, клик по пункту, прокрутка, размер окна, пропавшие пункты) родитель
узнаёт один раз.

`actions` у `PopoverMenu` не проверяется ни по типу, ни валидатором:
проверку делают публичные компоненты (разделы 5 и 6), и каждое предупреждение
приходит один раз. Неверные данные `PopoverMenu` переживает без ошибок
благодаря `toMenuItems`.

Слот `trigger` получает пропсы `{ id, popovertarget }`. Компонент, который
рисует кнопку, вешает их на неё двумя явными атрибутами —
`:id="trigger.id" :popovertarget="trigger.popovertarget"`: `v-bind="trigger"`
без аргумента не пропускает `tests/utilityPrefix.test.js`, потому что классы
в таком объекте статически не проверить. По `popovertarget` браузер сам
открывает и закрывает меню, `id` связывает панель с кнопкой
(`aria-labelledby`). Оба идентификатора — `useId()`, одинаковые при SSR и
гидрации.

### 4.2. Разметка

- Корень — `<span ref="root" class="bb:relative">` с `v-if` по наличию пунктов.
  Отображение (`block`, `inline-flex`) и отступы задаёт вызывающий компонент
  классом на `<popover-menu>`: без этого `DropdownButtonWithAction`
  не сохранил бы свою раскладку пиксель в пиксель.
- Внутри корня — слот `trigger` и панель `popover="auto"` с ролью `menu`,
  `aria-orientation="vertical"`, `aria-labelledby` = `id` кнопки и классами
  `bb:m-0 bb:inset-auto bb:w-56 bb:rounded-md bb:shadow-lg bb:bg-white
  bb:ring-1 bb:ring-black/5`.
- Пункты — как сейчас в `DropdownButtonWithAction`: `<a href>` для перехода,
  `<button type="button">` для действия, роль `menuitem`, классы обычного
  и опасного (`danger`) пункта без изменений.

### 4.3. Пункты: `src/menuItems.js`

Внутренний модуль, в него переезжают из `DropdownButtonWithAction`:

- `isMenuItem(item)` — проверка одного пункта, без изменений;
- `toMenuItems(actions)` — то, что сейчас вычисляет `actionItems`: не массив —
  пустой список, элементы-необъекты пропускаются.

Модуль нужен двоим: `PopoverMenu` берёт из него пункты, публичные компоненты —
валидатор, а `DropdownButtonWithAction` ещё и знание, есть ли пункты:
основная кнопка лежит вне `PopoverMenu` и скругляется справа, когда пунктов
нет.

### 4.4. Поведение

Переносится без изменений:

- открытие и закрытие по `popovertarget`, приведение меню к `modelValue`
  (`applyMenuState`), гашение ответного события, состояние — по фактическому
  состоянию меню, а не по `newState` события `toggle`;
- место меню — `placePopover` в `beforetoggle` с `maxWidth` 224 px; якорь —
  сама кнопка из слота, найденная по `id` из пропсов слота (а не обёртка:
  обёртка может быть шире кнопки);
- закрытие по клику внутри меню, по прокрутке вне меню и изменению размера
  окна (`closeOnScrollAndResize`);
- стрелки и мышь — `moveMenuFocus`; Enter и пробел нажимают пункт средствами
  браузера (пробел — только кнопки); Escape и клик вне меню закрывают его
  средствами браузера (`popover="auto"`);
- переход — через `navigate` плагина (`withNavigation`), клик с Cmd, Ctrl,
  Shift, Alt и средней кнопкой остаётся браузеру;
- `onSelect` вызывается без аргументов, результат возвращается обработчику
  клика (отказ асинхронного `onSelect` уходит в `errorHandler` Vue);
- пункты пропали при открытом меню — слушатели снимаются, родитель узнаёт
  о закрытии; пункты появились — состояние меню применяется заново после
  рендера;
- без Popover API и вне документа управлять нечем, исключений нет.

### 4.5. Без пунктов

`PopoverMenu` не рисует ничего, но остаётся смонтированным: так он сообщает
о закрытии, если пункты пропали при открытом меню, и вернёт меню в нужное
состояние, когда пункты появятся.

### 4.6. Будущая анимация

Классы и стили панели есть только в `PopoverMenu`. Анимация появления на
Popover API — `transition` на панели и `@starting-style` для начального
состояния — добавляется правкой этого файла и сразу действует в обоих меню.

## 5. `DropdownButtonWithAction`

Публичный API, разметка корня и основной кнопки не меняются:

    <span class="bb-dashboard-ui bb:relative bb:inline-flex bb:shadow-xs bb:rounded-md">
        <button …основная кнопка… :class="{ 'bb:rounded-r-md': !hasActions }">
            <slot name="button"></slot>
        </button>
        <popover-menu class="bb:-ml-px bb:block" :actions="actions"
                      :model-value="modelValue"
                      @update:model-value="$emit('update:modelValue', $event)">
            <template #trigger="trigger">
                <button type="button" :id="trigger.id" :popovertarget="trigger.popovertarget"
                        …классы стрелки…>…</button>
            </template>
        </popover-menu>
    </span>

- Проп `actions` с валидатором `value.every(isMenuItem)` остаётся здесь;
  `hasActions` — `toMenuItems(this.actions).length > 0`.
- Предупреждение об убранном слоте `actions` остаётся здесь.
- Классы стрелки, скрытая подпись `texts.openMenu` и SVG стрелки —
  без изменений.

## 6. `HamburgerMenu` (публичный)

### 6.1. API

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `actions` | `Array` | `[]` | Пункты меню в формате `DropdownButtonWithAction`: `{ label, href }` — переход, `{ label, onSelect }` — действие, `danger: true` — опасный пункт; валидатор `value.every(isMenuItem)` |
| `lang` | `String` | язык плагина | `"ru"` или `"en"` — для скрытой подписи кнопки (`withLang`) |

Слотов, событий и `v-model` нет: шапке не нужно управлять меню извне.
`PopoverMenu` это умеет, и `v-model` добавляется пробросом, когда понадобится.
Без пунктов кнопки нет.

### 6.2. Разметка и вид

    <popover-menu class="bb-dashboard-ui bb:inline-flex" :actions="actions">
        <template #trigger="trigger">
            <button type="button" :id="trigger.id"
                    :popovertarget="trigger.popovertarget" class="…">
                <span class="bb:sr-only">{{ texts.openMenu }}</span>
                <svg class="bb:h-6 bb:w-6" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round"
                          stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
            </button>
        </template>
    </popover-menu>

- Классы кнопки — из шапок проектов с префиксом: `bb:relative bb:inline-flex
  bb:items-center bb:justify-center bb:p-2 bb:rounded-md bb:text-gray-400
  bb:hover:text-gray-500 bb:hover:bg-gray-100 bb:focus:outline-hidden
  bb:focus:bg-gray-100 bb:focus:text-gray-500 bb:transition bb:duration-150
  bb:ease-in-out`. `z-20` проектов не нужен: панель в верхнем слое.
- Доступное имя — скрытый текст `texts.openMenu` («Открыть меню» /
  «Open menu») вместо жёсткого `aria-label="Main menu"`. Неизменного
  `aria-expanded="false"` нет: с `popovertarget` открытое состояние
  сообщает браузер.
- Панель и пункты — из `PopoverMenu`, на глаз как сейчас: `w-56`, зазор 4 px
  от кнопки (`GAP` в `placePopover`, сейчас `mt-1`), правый край меню по
  правому краю кнопки (сейчас `align="right"`). Подсветка пункта — фокус;
  мышь ставит фокус на пункт под курсором, поэтому для мыши это выглядит как
  нынешний `hover`.

## 7. Экспорт пакета

- `src/index.js`: убираются `Popup`, `PickDay`, `Closer`; добавляется
  `HamburgerMenu`. Компонентов — пятнадцать.
- Файлы `Popup.vue`, `PickDay.vue`, `Closer.vue` и их тесты остаются: они
  нужны `DropdownButton`, `SelectDateInterval` и `PageCard`, а их тесты
  проверяют компоненты напрямую, как `tests/Overlay.test.js` — приватный
  `Overlay`.
- Импорт убранного имени не проходит молча: сборка Vite (Rollup) падает
  с «… is not exported by …», в режиме разработки браузер бросает
  `SyntaxError` об отсутствующем экспорте.

## 8. Тесты

vitest и happy-dom, Popover API — заглушка `tests/popoverStub.js`. Каждый
новый тест сначала запускается и падает.

- `tests/DropdownButtonWithAction.test.js` — все 59 тестов без изменений.
  Это проверка переноса: их прогон до и после переноса даёт тот же состав и
  тот же результат.
- `tests/HamburgerMenu.test.js` — новый:
  - скрытая подпись кнопки «Открыть меню», при `lang="en"` — «Open menu»;
  - без пунктов кнопки и панели нет;
  - клик по кнопке открывает меню, повторный — закрывает; Escape и клик вне
    меню закрывают;
  - переход — `<a href>`, клик уходит в `navigate` плагина и закрывает меню,
    клик с Cmd остаётся браузеру;
  - действие вызывает `onSelect` и закрывает меню;
  - в открытом меню стрелки ведут фокус по пунктам и гасят прокрутку,
    у закрытого стрелки прокручивают страницу;
  - меню встаёт правым краем по правому краю кнопки; у кнопки и обёртки
    `PopoverMenu` в тесте разные координаты, чтобы тест различал, по чему
    считается место;
  - неверный пункт — ровно одно предупреждение валидатора и без ошибок;
    верные пункты — без предупреждений.
- `tests/exports.test.js` — список из пятнадцати компонентов.
- `tests/ssrFixtures.js` — пример для `HamburgerMenu`; примеры `Popup`,
  `PickDay` и `Closer` убираются (`tests/ssr.test.js` требует пример ровно
  на каждый экспорт). Их отрисовку на сервере по-прежнему покрывают примеры
  `SelectSingle`, `SelectDateInterval` и `PageCard`.
- Весь набор и сборка — с чистым выводом: ни предупреждений, ни ошибок.

## 9. Playground и README

Playground и README описывают публичный контракт.

Playground (`playground/App.vue`, `playground/shell.css`):

- убираются демо `Popup`, `PickDay` (и `<pick-day lang="en">` в разделе
  `lang="en"`) и `Closer` вместе с их данными и стилями, которыми больше
  никто не пользуется (`.menu`, `.field`, `.closer-demo`);
- добавляется демо `HamburgerMenu` в полосе, похожей на шапку: три пункта —
  два перехода и одно действие, которое считает выборы, как в демо
  `DropdownButtonWithAction`; и вариант с `lang="en"` в разделе `lang="en"`.

README:

- список компонентов — пятнадцать, с `HamburgerMenu`;
- разделы `Popup`, `PickDay`, `Closer` убираются, появляется раздел
  `HamburgerMenu` (пропы, пример, клавиатура и мышь — как у
  `DropdownButtonWithAction`);
- то, что видно через публичные компоненты, переписывается от их имени:
  календарь в разделе «Языки» и загрузка Pikaday в разделе «SSR» —
  от `SelectDateInterval`; замечание о доступности `Closer` — о крестике
  `PageCard`; пример `withEraser` у `PickDay` в «Правилах API» заменяется
  примером из публичного компонента; раздел «Почему у Popup и Dot нет события
  changed» остаётся только про `Dot`;
- исторические разделы «Обновление с 0.13», «с 0.12», «с 0.11» не меняются;
- новый раздел «Обновление с 0.14»: замена `Popup` в шапке на
  `HamburgerMenu` (пример раздела 11), `PickDay` и `Closer` больше
  не экспортируются.

## 10. Выпуск `0.15.0`

Одна версия `0.15.0`: в 0.x сужение API — минорная версия. Коммит с версией —
последний на ветке; публикация, как обычно, тегом `v0.15.0` через CI
(`.github/workflows/publish.yml`).

## 11. Перевод проектов

cashback и certificates стоят на `^0.14.0`, payments — на `^0.9.0`; `0.15.0`
ни один из них не получит сам. Перевод — отдельная задача в каждом проекте:
шапка на `HamburgerMenu` и зависимость `^0.15.0`. Образец для certificates:

    <div class="hidden sm:ml-6 sm:flex sm:items-center">
        <hamburger-menu :actions="menuActions" />
    </div>

    import { HamburgerMenu, NavigationMenuElement } from "@boobooking/dashboard-ui-components";
    import { router } from "@inertiajs/vue3";

    computed: {
        menuActions() {
            return [
                { label: "Администраторы", href: this.route("users") },
                { label: "Поменять пароль", href: this.route("my.password.edit") },
                { label: "Выйти", onSelect: () => router.delete(this.route("logout")) },
            ];
        },
    },

- Пункты — в `computed`: в шаблоне Options API импорт `router` недоступен.
- «Выйти» — тот же `router.delete`, который сейчас вызывает
  `<Link method="delete">`.
- Переходы становятся ссылками `<a href>`: обычный клик — `router.visit`
  через `navigate` плагина, Cmd-клик и средний клик открывают новую вкладку.
- Из проекта уходят `Popup`, `menuDropdownOpen`, обёртка
  `<div class="relative">`, `z-20` на кнопке и `Link`, если он больше
  не нужен в файле.
- payments — те же пункты по-английски и «Settings».

## 12. Приёмка

- Весь набор тестов и сборка проходят с чистым выводом.
- Chrome (chrome-devtools, сборка playground временно в
  `certificates/src/public/build/ui-playground/`), голое окружение и
  окружение приложения: вид кнопки ☰, панели и пунктов `HamburgerMenu` и
  `DropdownButtonWithAction`; наведение, стрелки, Enter, Escape, клик вне,
  переход; консоль без ошибок.
- Safari — проверяет владелец (расширение глушит `keydown` на `body`).
- После проверок временная сборка удаляется.
- Итоговое ревью ветки свежим ревьюером на самой сильной модели, исправление
  найденного.

## 13. Принятые риски

- Проект, который поднимет зависимость до `0.15.0`, не переведя шапку,
  не соберётся (раздел 7) — ошибка громкая, а не тихая.
- Без Popover API (Safari до 17, Chrome до 114, Firefox до 125) панель видна
  в потоке всегда — так же, как у `DropdownButtonWithAction`.
- У `HamburgerMenu` нет `v-model`: если проекту понадобится управлять меню
  извне, это новая версия пакета.

## 14. Список файлов пакета

Создаются:

- `src/menuItems.js`
- `src/components/PopoverMenu.vue`
- `src/components/HamburgerMenu.vue`
- `tests/HamburgerMenu.test.js`

Меняются:

- `src/components/DropdownButtonWithAction.vue`
- `src/index.js`
- `tests/exports.test.js`
- `tests/ssrFixtures.js`
- `playground/App.vue`
- `playground/shell.css`
- `README.md`
- `package.json`, `package-lock.json`
