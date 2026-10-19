# `SelectMultiple` и выпуск `0.19.0` — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** публичный компонент `SelectMultiple` — `SelectSingle` с выбором нескольких пунктов и необязательным поиском (`withSearch`); выпуск `0.19.0`.

**Architecture:** один SFC `src/components/SelectMultiple.vue` (Options API) на внутренних `ElementHeader`, `DropdownButton`, `ListElement`, как `SelectSingle`. Общие части получают три необязательные возможности, которые по умолчанию ничего не меняют: остановки стрелок (`findStops` у `moveMenuFocus` и `PopoverPanel`), удержание размера панели (`keepSize` у `PopoverPanel`) и язык ластика (`lang` у `DropdownButton`); `DropdownButton` пробрасывает их и событие `toggle`. Поиск, фокус в поле и перенаправление набора живут в `SelectMultiple`.

**Tech Stack:** Vue 3.5 (Options API, SFC), vitest + happy-dom, @vue/test-utils 2, Vite (library mode), Tailwind 4 с префиксом `bb`, chrome-devtools MCP, playwright-core 1.63.0 (Chromium 1243, WebKit 2359), `@inertiajs/vue3` 3.6.1 (стенд), GitHub Actions, npm.

**Spec:** `docs/superpowers/specs/2026-10-18-select-multiple-design.md`

## Global Constraints

- Рабочая копия — git worktree `/Users/boobooking/Code/dashboard-ui-components/.worktrees/select-multiple`, ветка `feature/select-multiple` от `d81579c`. Все команды Task 1–6 — из неё. Основную рабочую копию (`main`, выпуск `0.18.0` FormInput) не трогать до Task 7.
- Публикация (пуш `main` и тега `v0.19.0`) — **только после явного согласия владельца на этом шаге** (Task 8). Ветка не пушится.
- API (спека §4.1): пропы `items: Array` (обязателен), `modelValue: Array = () => []`, `header: String` (обязателен), `isRequired: Boolean = false`, `isLoading: Boolean = false`, `withSearch: Boolean = false`, `lang` — миксин `withLang`; события `update:modelValue` (новый массив) и `changed`.
- Сравнение `id` — строгое (`===`); клик добавляет `id` в конец или убирает все его вхождения; массив из пропа не меняется; `id` вне пунктов сохраняются (спека §4.2).
- Надпись (спека §4.3): ни одного выбранного среди `items` — пусто; один — его `name`; больше — `` `${texts.selected}: ${n}` ``.
- Тексты (спека §9) — ключи `selected` («Выбрано» / «Selected»), `search` («Поиск» / «Search»), `nothingFound` («Ничего не найдено» / «Nothing found») в `src/i18n.js`, оба словаря.
- `SelectSingle`, меню (`PopoverMenu`) и календари (`PickDay`) ведут себя по-прежнему: их тесты не меняются и остаются зелёными.
- Каждая утилита — `bb:`, без порогов ширины; содержимое кнопок — `bb:pointer-events-none bb:cursor-default` (у `ListElement` и `CrossButton` уже есть).
- Стиль: в `.vue` — двойные кавычки и точки с запятой в `<script>`, Options API; в `.js` тестов — одинарные кавычки без точек с запятой; отступ 4 пробела; комментарии по-русски, описывают код как он есть. Существующие комментарии сохраняются.
- Тесты — `npm test -- --dir tests`. База на `d81579c`: `Test Files 44 passed (44)`, `Tests 836 passed (836)`.
- Вывод тестов чистый: `npm test -- --dir tests --reporter=verbose > $W/<имя>.log 2>&1`, затем `grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/<имя>.log` — ожидается `0`.
- `W=/Users/boobooking/Code/dashboard-ui-components/.worktrees/select-multiple/.superpowers/sdd/2026-10-18-select-multiple` (каталог создаётся в Task 1, не попадает в `git status`); `S=/private/tmp/claude-501/-Users-boobooking-Code-dashboard-ui-components/03280d94-7310-46dc-a60d-462e4fab1b96/scratchpad` — временные стенды.
- Коммиты — conventional commits по-русски, повелительное наклонение, без служебных строк и упоминаний инструментов; `--no-verify` запрещён.
- Замечания итогового ревью всех уровней, включая Minor, исправляются (Task 6).
- Исполнитель-подагент: «If you cannot follow the plan or spec as written, stop and report the deviation with evidence; do not change the plan.» Отличия согласует с Codex только основная сессия.

## Review Focus

- Перезапрос Inertia с `preserveState` приносит новый массив `items` с теми же `id`, пока список открыт: фокус остаётся на том же пункте, галочки и `aria-pressed` верны. Тест — Task 2, «новый массив тех же пунктов при открытом списке».
- `modelValue` с дублями (`['a', 'a']`) или не массивом (`'a'`): компонент не падает; клик по `a` убирает все вхождения. Тест — Task 2, «дубли и не массив».
- Пункты пропали при открытом списке с непустым запросом: список закрыт, запрос сброшен; вернувшиеся пункты открываются закрытыми, поле пустое. Тест — Task 3, «пункты пропали при запросе».
- Две копии с поиском на странице: запрос одной не виден в другой; открытие второй закрывает первую и сбрасывает её запрос. Тест — Task 3, «две копии».
- Escape в поле поиска закрывает список, фокус возвращается на кнопку фильтра. Тест — Task 3, «Escape из поля».

---

### Task 1: Остановки стрелок, размер панели, язык ластика

**Files:**
- Modify: `src/menuFocus.js`
- Modify: `src/components/PopoverPanel.vue`
- Modify: `src/components/DropdownButton.vue`
- Test: `tests/menuFocus.test.js`, `tests/PopoverPanel.test.js`

**Interfaces:**
- Produces: `moveMenuFocus(menu, findSelected = () => null, findStops = null)` — `findStops: () => Element[]`; задан — стрелки ходят по его результату в его порядке вместо `menu.querySelectorAll('a[href], button')`, а `mousemove` ставит фокус только на элемент из результата (`closest('a[href], button')`, входящий в него). Не задан — поведение прежнее. Возвращает функцию снятия, как сейчас.
- Produces: `PopoverPanel` — пропы `findStops: { type: Function, default: null }` (передаётся в `moveMenuFocus` третьим аргументом) и `keepSize: { type: Boolean, default: false }`.
- Produces: `DropdownButton` — пропы `lang: { type: String, default: null }` (на `<cross-button :lang="lang">`), `findStops` и `keepSize` (на `<popover-panel>`); событие `toggle` — из `@toggle` панели, с тем же `isOpen`; `emits: ["update:isOpen", "erased", "toggle"]`.

- [ ] **Step 1: База**

```bash
W=/Users/boobooking/Code/dashboard-ui-components/.worktrees/select-multiple/.superpowers/sdd/2026-10-18-select-multiple
mkdir -p "$W" && git rev-parse HEAD > "$W/base-sha" && cat "$W/base-sha" && git status -s
```

Expected: SHA коммита этого плана; `git status -s` пуст (`.superpowers/` в `git status` не виден). Иначе — остановиться и сообщить.

- [ ] **Step 2: Тесты**

`tests/menuFocus.test.js`, новый `describe('moveMenuFocus: findStops')`; в `beforeEach` к меню добавляется `field = document.createElement('input')` перед пунктами; `stops = () => [field, A, C]` (без `B`):

| Тест | Утверждения |
| --- | --- |
| из поля вниз — первый стоп после поля | фокус в `field`, ArrowDown → `A`; `defaultPrevented` `true` |
| с первого пункта вверх — в поле | фокус `A`, ArrowUp → `document.activeElement === field` |
| с последнего вниз — в поле | фокус `C`, ArrowDown → `field` |
| пункт вне стопов пропускается | фокус `A`, ArrowDown → `C` |
| фокус вне стопов — от выбранного | фокус `outside`, `findSelected` → `A`, ArrowDown → `C` |
| мышь над элементом вне стопов фокус не трогает | фокус `A`, `mousemove` с `target` `B` (`bubbles: true`) → фокус `A` |
| пустые стопы — стрелка не гасится | `stops = () => []`, ArrowDown → `defaultPrevented` `false` |

`tests/PopoverPanel.test.js`, новый `describe('PopoverPanel: keep-size')`; размеры панели задаются `Object.defineProperty(panel, 'offsetWidth' | 'offsetHeight', { configurable: true, value })`, место — как в `SelectSingle.test.js` «место списка» (`viewport`, `getBoundingClientRect` кнопки, `clientHeight`/`scrollHeight` панели); после открытия — `await new Promise((resolve) => requestAnimationFrame(resolve))`:

| Тест | Утверждения |
| --- | --- |
| открытая вниз держит ширину, но не высоту | `keepSize: true`, `offsetWidth` 240, `offsetHeight` 300 → `style.minWidth` `'240px'`, `style.minHeight` `''` |
| открытая вверх держит и высоту | кнопка `{ top: 700, bottom: 740, left: 50, right: 290 }`, окно 1000×800, `clientHeight` 48, `scrollHeight` 120 → `style.top` `'auto'`, `minWidth` `'240px'`, `minHeight` `'300px'` |
| при следующем открытии — заново | открыть, закрыть кнопкой, `offsetWidth` 180, открыть → `minWidth` `'180px'` |
| без keep-size размер не держится | `minWidth` `''`, `minHeight` `''` |
| find-stops доходит до стрелок | `arrows: true`, `findStops: () => []`, открыть, ArrowDown → `defaultPrevented` `false`; контроль — `arrows: true` без `findStops`: `true` |

`DropdownButton` отдельно не тестируется: его проброс проверяют тесты `SelectMultiple` (Task 2, 3).

- [ ] **Step 3: Тесты падают**

Run: `npm test -- --dir tests tests/menuFocus.test.js tests/PopoverPanel.test.js`
Expected: FAIL — новые тесты; прежние зелёные.

- [ ] **Step 4: Реализация**

- `src/menuFocus.js`: третий параметр по Interfaces; комментарий модуля — о стопах и о том, что ластик поля в них не входит.
- `PopoverPanel.vue`: при `beforetoggle` с `newState === "open"` и `keepSize` — сбросить `style.minWidth` и `style.minHeight` до `placePopover`; в кадре после `fitPopover` (только если панель открыта) — `minWidth = offsetWidth px`, и `minHeight = offsetHeight px`, если `style.top === "auto"` (открылась вверх). Комментарий у пропа: поле поиска не двигается, пока фильтр убирает пункты.
- `DropdownButton.vue`: пропы и событие по Interfaces.

- [ ] **Step 5: Весь набор**

```bash
npm test -- --dir tests --reporter=verbose > $W/t1-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests " $W/t1-suite.log
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t1-suite.log
```

Expected: `tests exit 0`; 44 файла, тестов больше 836, все passed (тесты `SelectSingle`, меню, `PickDay` — без изменений); `0`.

- [ ] **Step 6: Коммит**

```bash
git add src/menuFocus.js src/components/PopoverPanel.vue src/components/DropdownButton.vue tests/menuFocus.test.js tests/PopoverPanel.test.js
git commit -m "feat: дать панели остановки стрелок, удержание размера и язык ластика"
```

---

### Task 2: `SelectMultiple` без поиска

**Files:**
- Create: `src/components/SelectMultiple.vue`, `tests/SelectMultiple.test.js`
- Modify: `src/i18n.js` — ключ `selected`
- Modify: `src/index.js` — экспорт после `SelectSingle`
- Modify: `tests/exports.test.js` — «ровно девятнадцать», `SelectMultiple` в списке перед `SelectSingle`
- Modify: `tests/ssrFixtures.js` — фикстура после `SelectDateInterval`
- Modify: `tests/keyboardNavigation.test.js`, `tests/CrossButton.test.js`, `tests/press.test.js` — случаи `SelectMultiple`

**Interfaces:**
- Consumes: Task 1 — `DropdownButton` (`lang`, `findSelected`, `toggle`).
- Produces: `export { default as SelectMultiple } from './components/SelectMultiple.vue'`; в компоненте — computed `itemList`, `selectedIds`, `selectedItems`, `visibleItems` (в этой задаче равен `itemList`), `title`; методы `itemClicked(item)`, `clear()`, `firstSelectedElement()`; `ref="list"` у контейнера пунктов. Task 3 расширяет их, не переименовывая.

- [ ] **Step 1: Тесты**

`tests/SelectMultiple.test.js` — по образцу `tests/SelectSingle.test.js`: popover-заглушка, `settle`, `press`, `open`, `triggerOf`, `panelOf`, `isOpen`; `mountSelect(props)` собирает `errors` и `warnings` (`errorHandler`, `warnHandler`); пункты `a` «Первый», `b` «Второй», `c` «Третий». Если не сказано иное, каждый тест проверяет `errors` и `warnings` — `[]`.

Перенесённые из `SelectSingle.test.js` — те же сценарии и утверждения на `SelectMultiple`: `null` в `items`; ArrowDown на первый пункт и `defaultPrevented`; отсчёт от выбранного (`['b']` → «Третий»); закрытый список — стрелки прокручивают; Escape — фокус на кнопке; весь `describe` «пункты пропали при открытом списке»; из `describe` «список на Popover API» — все тесты, кроме «выбор пункта закрывает список».

Свои:

| Тест | Утверждения |
| --- | --- |
| клик добавляет `id` в конец | `modelValue: ['c']`, клик «Первый» → `update:modelValue` `[[['c', 'a']]]`, `changed` `[[]]`; массив пропа по-прежнему `['c']` |
| повторный клик убирает | `['a', 'c']`, клик «Первый» → `[[['c']]]`, `changed` один раз |
| `id` вне пунктов сохраняются | `['x']`: надпись `''`, ластика нет; клик «Первый» → `[[['x', 'a']]]` |
| надпись | `[]` → `''`; `['b']` → `Второй`; `['a', 'b']` → `Выбрано: 2`; `['a', 'x']` → `Первый`; `lang: 'en'`, `['a', 'b']` → `Selected: 2` (текст кнопки `[popovertarget]`) |
| клик список не закрывает | открыть, ArrowDown, `click()` пункта → `isOpen` `true`, `vm.isOpen` `true`, `document.activeElement` — тот же пункт; значение возвращается компоненту — `setProps({ modelValue: wrapper.emitted('update:modelValue')[0][0] })`, `settle` → у пункта `aria-pressed="true"`, фокус на нём, список открыт |
| отсчёт от первого выбранного | `['c', 'a']`, открыть, ArrowDown → «Второй» |
| `aria-pressed` | `['b']` → у пунктов `false`, `true`, `false` |
| `modelValue: null` | ничего не выбрано, надпись `''`, `warnings` `[]` |
| дубли и не массив | `['a', 'a']` → клик «Первый» → `[[[]]]`; `modelValue: 'a'` → не падает, предупреждение `Invalid prop: type check failed for prop "modelValue"`, надпись `''` |
| новый массив тех же пунктов при открытом списке | `['b']`, открыть, фокус на кнопку «Второй» (`focus()`), `setProps({ items: items.map((item) => ({ ...item })) })`, `settle` → список открыт, фокус на «Второй», `aria-pressed` `false`, `true`, `false` |
| ластик — `[]` и `changed` | `['a']`, ластик (`CrossButton` вне панели), окончание анимации, как `pressFinished` в `tests/press.test.js` → `update:modelValue` `[[[]]]`, `changed` `[[]]` |
| `lang: 'en'` — подпись ластика | скрытая подпись ластика — `Clear` |

`tests/exports.test.js` — девятнадцать компонентов. `tests/ssrFixtures.js`:

```js
    SelectMultiple: { props: { header: 'Бренд', items: [{ id: 'rc', name: 'Royal Canin' }, { id: 'eukanuba', name: 'Eukanuba' }], modelValue: ['rc', 'eukanuba'] } },
```

Случаи в общих таблицах — как у `SelectSingle`, с `props: { header: 'Бренд', items: [{ id: 'a', name: 'Сбер' }], modelValue: ['a'] }`:
- `keyboardNavigation.test.js`: «SelectMultiple — ластик» (`label: 'Очистить'`), «SelectMultiple — кнопка списка» (`label: null`);
- `CrossButton.test.js`: «SelectMultiple — ластик», `icon` и `place` — как у «SelectSingle — ластик»;
- `press.test.js`: «SelectMultiple», `expected: []`.

- [ ] **Step 2: Тесты падают**

Run: `npm test -- --dir tests tests/SelectMultiple.test.js tests/exports.test.js`
Expected: FAIL — `SelectMultiple.vue` не найден.

- [ ] **Step 3: `src/components/SelectMultiple.vue`**

Разметка — как `SelectSingle.vue` (корень `bb-dashboard-ui bb:flex bb:flex-none`, `element-header`, `dropdown-button` с `v-if="hasItems"`, контейнер пунктов `ref="list"` с теми же классами и комментарием о панели). Отличия:
- `mixins: [withLang]`; `dropdown-button` — `:title="title"`, `:has-value="selectedItems.length > 0"`, `:find-selected="firstSelectedElement"`, `:lang="lang"`;
- пункты — `v-for="item in visibleItems"`, `:key="item.id"`, `:is-checked="selectedIds.includes(item.id)"`, `:aria-pressed="selectedIds.includes(item.id)"` (Vue переносит атрибут на корневую кнопку `ListElement`);
- `selectedIds` — `modelValue`, если это массив, иначе `[]`;
- `itemClicked(item)` список не закрывает; новый массив — `selectedIds` без всех `item.id` или `[...selectedIds, item.id]`; затем `changed`;
- `firstSelectedElement()` — кнопка первого выбранного пункта из `visibleItems` в `$refs.list`, иначе `null`;
- `watch hasItems` — как у `SelectSingle`, с его комментарием: `dropdown-button` уходит по `v-if` вместе с панелью, и `toggle` при этом не приходит.

`src/i18n.js`: `selected: 'Выбрано'` / `'Selected'` с комментарием «SelectMultiple: надпись при нескольких выбранных, «Выбрано: 3»». `src/index.js` — экспорт.

- [ ] **Step 4: Весь набор**

```bash
npm test -- --dir tests --reporter=verbose > $W/t2-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests " $W/t2-suite.log
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t2-suite.log
npm run build > $W/t2-build.log 2>&1; echo "build exit $?"
```

Expected: `tests exit 0`; `Test Files 45 passed (45)`, все passed — в том числе `ssr`, `hydration`, `utilityPrefix`, `i18n` для `SelectMultiple`; `0`; `build exit 0`.

- [ ] **Step 5: Коммит**

```bash
git add src/components/SelectMultiple.vue src/i18n.js src/index.js tests/SelectMultiple.test.js tests/exports.test.js tests/ssrFixtures.js tests/keyboardNavigation.test.js tests/CrossButton.test.js tests/press.test.js
git commit -m "feat: добавить компонент SelectMultiple"
```

---

### Task 3: Поиск в `SelectMultiple`

**Files:**
- Modify: `src/components/SelectMultiple.vue`, `src/i18n.js` — ключи `search`, `nothingFound`
- Modify: `tests/SelectMultiple.test.js`, `tests/ssrFixtures.js` — `withSearch: true` в фикстуре
- Modify: `tests/keyboardNavigation.test.js`, `tests/CrossButton.test.js`, `tests/press.test.js` — ластик поля

**Interfaces:**
- Consumes: Task 1 — `DropdownButton` `findStops`, `keepSize`, `toggle`; Task 2 — computed и методы компонента.
- Produces: проп `withSearch`; `data` `query: ""`; `ref="search"` у поля; `visibleItems` — с фильтром; методы `onToggle(isOpen)`, `searchStops()`, `onListKeydown(event)`, `clearQuery()`.

- [ ] **Step 1: Тесты**

В `tests/SelectMultiple.test.js`, `describe('SelectMultiple: поиск')`, `mountSelect({ withSearch: true, ... })`; поле — `panelOf(wrapper).get('input')`:

| Тест | Утверждения |
| --- | --- |
| без `withSearch` поля нет | `panelOf(wrapper).find('input').exists()` `false` |
| поле | `type="text"`, `autocomplete="off"`, `placeholder` и `aria-label` — `Поиск`; `lang: 'en'` — `Search` |
| фильтр без учёта регистра и с обрезкой | `setValue('  ВТО ')` → пункты `['Второй']`; `setValue('   ')` → все три |
| ничего не найдено | `setValue('zzz')` → строка `Ничего не найдено`, кнопок пунктов нет; `lang: 'en'` — `Nothing found` |
| ластик поля | пусто — скрыт (`display: none`); `setValue('вто')` — виден; нажатие и конец анимации → поле `''`, фокус в поле |
| фокус в поле при открытии, без прокрутки | шпион `focus` поля, как в «возврат фокуса на кнопку не прокручивает страницу»; `open` → `document.activeElement` — поле, опции `[{ preventScroll: true }]` |
| при монтировании фокус не в поле | `document.activeElement` — не поле |
| запрос сбрасывается при закрытии, но не при клике | открыть, `setValue('й')`, клик по пункту → поле `'й'`; клик по кнопке фильтра (закрыть) → поле `''` |
| скрытые фильтром выбранные считаются | `['a', 'b']`, `setValue('тре')` → надпись `Выбрано: 2` |
| Enter в поле | `keydown` Enter на поле → `defaultPrevented` `true` |
| круг стрелок через поле | поле, ArrowDown → «Первый»; поле, ArrowUp → «Третий»; с «Первый» ArrowUp → поле; с «Третий» ArrowDown → поле |
| ластик поля вне стрелок и мыши | `setValue('й')`, фокус в поле, ArrowDown → «Первый», не ластик; `mousemove` по ластику — фокус не меняется |
| набор с пункта уходит в поле | `setValue('й')`, ArrowDown, `keydown` `x` на пункте → `defaultPrevented` `true`; после `nextTick` фокус в поле, значение `'йx'`, `selectionStart === selectionEnd === 2`; `update:modelValue` не было |
| Backspace с пункта | `setValue('й')`, ArrowDown, Backspace → поле `''`, фокус в поле |
| модификаторы, пробел, composition не перехватываются | на пункте: `a` с `ctrlKey`, с `metaKey`, с `altKey`, `' '`, `a` с `isComposing: true` → `defaultPrevented` `false`, поле не меняется |
| без поиска набор не перехватывается | `withSearch: false`, на пункте `x` → `defaultPrevented` `false` |
| размер панели держится только с поиском | `findComponent(PopoverPanel).props('keepSize')`: `withSearch: true` — `true`, без — `false` |
| `lang: 'en'` — подпись ластика поля | `Clear` |
| пункты пропали при запросе | открыть, `setValue('й')`, `setProps({ items: [] })`, `settle` → список закрыт; `setProps({ items })`, `settle` → список закрыт; открыть → поле `''` |
| две копии | страница из двух `SelectMultiple` с поиском; открыть первую, `setValue('вто')`; открыть вторую → первая закрыта, её поле `''`, поле второй `''` |
| Escape из поля | открыть, фокус в поле, Escape → список закрыт, `document.activeElement` — кнопка фильтра |

Общие таблицы — случай «SelectMultiple — ластик поиска» с `withSearch: true` и `modelValue: []`, запрос — `setValue('а')` в поле до проверки (кнопка с крестиком внутри панели):
- `keyboardNavigation.test.js` — `label: 'Очистить'`;
- `CrossButton.test.js` — `icon` `['bb:w-6', 'bb:h-6']`, `place` `['bb:absolute', 'bb:top-0', 'bb:right-0', 'bb:h-full', 'bb:pr-2']`;
- `press.test.js` — проверяется значение поля `''` после анимации, событий компонента нет.

Если форма таблицы не позволяет задать запрос до проверки, случай пишется отдельным `it` в том же файле.

- [ ] **Step 2: Тесты падают**

Run: `npm test -- --dir tests tests/SelectMultiple.test.js`
Expected: FAIL — новые тесты; тесты Task 2 зелёные.

- [ ] **Step 3: Реализация**

- Блок поля в панели перед контейнером пунктов, `v-if="withSearch"`: обёртка `bb:sticky bb:top-0 bb:min-w-56 bb:px-2 bb:py-2 bb:bg-white bb:border-b bb:border-gray-200`; внутри `bb:relative` — `<input ref="search" type="text" autocomplete="off" v-model="query" :placeholder="texts.search" :aria-label="texts.search" @keydown.enter.prevent>` с классами `bb:w-full bb:pl-3 bb:pr-9 bb:py-2 bb:text-sm bb:bg-white bb:border bb:border-gray-300 bb:rounded-md bb:focus:outline-hidden bb:focus:border-indigo-500 bb:focus:ring-1 bb:focus:ring-indigo-500` и рядом с ним `cross-button` `v-show="query !== ''"`, `size="small"`, `:lang="lang"`, `bb:absolute bb:right-0 bb:top-0 bb:pr-2 bb:h-full`, `@clicked="clearQuery"`.
- Контейнер пунктов — `v-if` есть видимые пункты, `@keydown="onListKeydown"`; иначе — строка `texts.nothingFound`, `bb:px-3 bb:py-2 bb:text-sm bb:text-gray-500 bb:text-center`.
- `visibleItems`: запрос `query.trim().toLowerCase()`; пустой — `itemList`, иначе пункты, у которых `name.toLowerCase()` содержит его.
- `dropdown-button`: `:find-stops="withSearch ? searchStops : null"`, `:keep-size="withSearch"`, `@toggle="onToggle"`.
- `onToggle(isOpen)`: открыт и `withSearch` — `$refs.search.focus({ preventScroll: true })`; закрыт — `query = ""`.
- `watch hasItems` (Task 2) при пропаже пунктов сбрасывает и `query`: панель уходит из DOM без `toggle`.
- `searchStops()`: `[$refs.search, ...кнопки $refs.list]` (без списка — только поле).
- `onListKeydown(event)`: без `withSearch`, с `ctrlKey`/`metaKey`/`altKey` или `isComposing` — ничего; `Backspace` — `query` без последнего символа; одна печатная клавиша (`key.length === 1`), кроме пробела, — `query + key`; в этих двух случаях `preventDefault()`, фокус в поле сразу (`preventScroll: true`), после `nextTick` каретка в конец (`setSelectionRange`).
- `clearQuery()`: `query = ""`, фокус в поле.

Комментарии: почему `type="text"` (Escape у `search`), почему Enter гасится (форма вокруг фильтра), почему набор с пункта уходит в поле (мышь уводит фокус на пункт).

- [ ] **Step 4: Весь набор**

```bash
npm test -- --dir tests --reporter=verbose > $W/t3-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests " $W/t3-suite.log
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t3-suite.log
npm run build > $W/t3-build.log 2>&1; echo "build exit $?"
```

Expected: `tests exit 0`; 45 файлов, все passed; `0`; `build exit 0`.

- [ ] **Step 5: Коммит**

```bash
git add src/components/SelectMultiple.vue src/i18n.js tests/SelectMultiple.test.js tests/ssrFixtures.js tests/keyboardNavigation.test.js tests/CrossButton.test.js tests/press.test.js
git commit -m "feat: добавить поиск в SelectMultiple"
```

---

### Task 4: Playground и README

**Files:**
- Modify: `playground/App.vue` — раздел после `SelectSingle`
- Modify: `README.md`

**Interfaces:**
- Consumes: `SelectMultiple` из `../dist/index.js`.
- Produces: раздел `<h2>SelectMultiple</h2>` с заголовками «Бренд» и «Мероприятие» — по ним Task 5 находит фильтры.

- [ ] **Step 1: Playground**

`SelectMultiple` в импорт и `components`. Раздел:
- `<select-multiple header="Бренд" :items="brandItems" v-model="brands" @changed="brandCommits++"/>` и строка `Выбрано: {{ brands.length === 0 ? '(ничего)' : brands.join(', ') }}, запросов: {{ brandCommits }}`;
- `<h3>Длинный список с поиском: поле не двигается при наборе, у нижнего края окна — вверх</h3>` и `<select-multiple header="Мероприятие" :items="eventItems" v-model="events" with-search/>`.

`data()`: `brandItems` — `[{ id: 'rc', name: 'Royal Canin' }, { id: 'eukanuba', name: 'Eukanuba' }]`, `brands: []`, `brandCommits: 0`, `events: []`. computed `eventItems` — 30 пунктов `{ id: 'e<n>', name }` с именами разной длины, все начинаются с «Мероприятие»: `Мероприятие <n>`, у каждого третьего — с городом, у каждого пятого — длинное, около 40 символов. Ширина панели при наборе заметно держится, а запрос `мер` совпадает со всеми пунктами (Task 5 Step 2).

- [ ] **Step 2: README**

- Раздел `### SelectMultiple` между `### SelectSingle` и `### InfoPill` (спека §13): пример из спеки §4, таблица пропов §4.1, события, значение и `id` вне пунктов (§4.2), надпись (§4.3), отличия списка (§5), поиск и размер панели (§6), клавиатура (§7); абзац «Перезапрос выдачи на `changed` — с `{ preserveState: true, preserveScroll: true }`»: без `preserveScroll` Inertia прокручивает окно наверх, и прокрутка закрывает открытый список.
- «Компоненты»: «восемнадцать» → «девятнадцать», `SelectMultiple` в списке после `SelectSingle`.
- «Требования»: «список `SelectSingle`» → «списки `SelectSingle` и `SelectMultiple`».
- «Языки»: три строки из спеки §9; `SelectMultiple` — в строке ластиков, с пометкой «(проп `lang`)».
- «Клавиатурная навигация»: «списке `SelectSingle`» → «списках `SelectSingle` и `SelectMultiple`».
- «Playground»: «восемнадцатью» → «девятнадцатью».

- [ ] **Step 3: Проверка и коммит**

```bash
npm test -- --dir tests --reporter=verbose > $W/t4-suite.log 2>&1; echo "tests exit $?"
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t4-suite.log
npm run build > $W/t4-build.log 2>&1 && npx vite build --config vite.playground.config.js --outDir $S/playground-check --emptyOutDir --base ./ > $W/t4-playground.log 2>&1; echo "build exit $?"
grep -n "восемнадцат" README.md
git add playground/App.vue README.md
git commit -m "docs: показать SelectMultiple в Playground и описать в README"
```

Expected: `tests exit 0`, `0`, `build exit 0`; `grep` пуст.

---

### Task 5: Приёмка в браузерах

**Files:** нет. Временно: `~/Code/mars/certificates/src/public/build/ui-playground/`, `$S/pw/`, `$S/inertia-stand/`. Если приёмка находит дефект — остановиться и сообщить: исправление идёт как отклонение.

- [ ] **Step 1: Playground в Chrome**

```bash
npm run build > $W/t5-build.log 2>&1 && npx vite build --config vite.playground.config.js --outDir ~/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./ > $W/t5-playground.log 2>&1; echo "exit $?"
for p in index.html host.html; do curl -sk -o /dev/null -w "$p %{http_code}\n" https://certificates.test/build/ui-playground/$p; done
```

Expected: `exit 0`, оба `200` (при `404` — выложить заново). chrome-devtools, 1280×900, `index.html`, затем `host.html`: сценарии 1–5 спеки §16 «Playground». Состояние — `evaluate_script` (`document.activeElement`, значение поля, текст кнопки, `aria-pressed`, `style.minWidth`/`minHeight` панели, `getBoundingClientRect()` поля до и после набора). Каждый шаг с результатом — строка в `$W/acceptance.md`.

- [ ] **Step 2: WebKit и набор с пункта**

`$S/pw` — `playwright-core@1.63.0`; страница — собранный Playground через `python3 -m http.server` из `$S/playground-check` (Task 4). WebKit: сценарии 2 и 3 спеки §16. Chromium и WebKit: три сценария «Набор с пункта» спеки §16 на «Мероприятие» — `page.keyboard`; запрос `мер` совпадает с пунктами Playground («Мероприятие …»), каретка ставится `setSelectionRange(1, 1)` после набора; перед проверяемой клавишей (`x`, Backspace) утверждается, что фокус на кнопке пункта (`document.activeElement` — `button` внутри списка, не поле). Результаты — в `$W/acceptance.md`. Песочница не даёт запустить браузер или слушать порт — тот же запуск вне песочницы.

- [ ] **Step 3: Перезапрос Inertia**

`$S/inertia-stand` — vite, `node_modules` симлинком на пакет, `@pkg` → `dist`, настоящий `@inertiajs/vue3` 3.6.1, ответ сервера с задержкой — как `tests/inertia/harness.js`. Страница выше окна с `SelectMultiple` «Мероприятие» (с поиском) вверху; на `changed` — `router.get(адрес, { events }, { preserveState: true, preserveScroll })`. Playwright Chromium и WebKit, окно прокручено на 200px: с `preserveScroll: true` три клика по пунктам с ожиданием ответа — список открыт, `aria-pressed` верны, прокрутка 200px; с `preserveScroll: false` — после первого ответа список закрыт. Итог — в `$W/acceptance.md`, стенд удалить.

- [ ] **Step 4: iPad — владелец**

Перед сообщением — `200` у `index.html`. Ссылка https://certificates.test/build/ui-playground/index.html владельцу: Safari на iPad, «Мероприятие» — открыть список, появляется экранная клавиатура, список остаётся открытым, набор фильтрует. Ответ владельца — в `$W/acceptance.md`. Список закрывается — отклонение (спека §17), согласуется с Codex до исправления.

---

### Task 5a: Исправления по приёмке (согласовано с Codex, reply-6)

**Files:**
- Modify: `src/components/DropdownButton.vue`, `src/components/SelectMultiple.vue`
- Test: `tests/SelectMultiple.test.js`

**Interfaces:**
- Produces: `DropdownButton` — проп `withStableHeight: { type: Boolean, default: false }`; при `true` у span надписи кнопки — `bb:min-h-8` (кнопка одной высоты пустая и с надписью). `SelectMultiple` передаёт `with-stable-height` всегда, с поиском и без; `SelectSingle` — нет.

- [ ] **Step 1: Тесты**

| Тест | Утверждения |
| --- | --- |
| кнопка одной высоты | у span внутри `button[popovertarget]` `SelectMultiple` класс `bb:min-h-8`; у `SelectSingle` — нет |
| фокус на пункте после клика, как в Safari | открыть, ArrowDown, `document.activeElement.blur()` (фокус на body), `click()` по «Первый» → `document.activeElement` — кнопка «Первый»; то же с `withSearch: true` |
| фокус ставится до событий | в слушателе `update:modelValue` записать `document.activeElement` → это кнопка нажатого пункта |
| Escape после клика | `blur()`, `click()` по пункту, Escape, `settle` → фокус на кнопке фильтра |

- [ ] **Step 2: Тесты падают** — `npm test -- --dir tests tests/SelectMultiple.test.js`: новые тесты FAIL.

- [ ] **Step 3: Реализация**
- `DropdownButton.vue`: проп по Interfaces; условный класс в `:class` литералом.
- `SelectMultiple.vue`: `itemClicked(item)` первой строкой — `focus({ preventScroll: true })` на кнопку пункта (индекс `item` в `visibleItems`, кнопка из `$refs.list`), затем оба события; комментарий — почему (Safari по клику фокус на кнопку не ставит). `dropdown-button` — `with-stable-height`.

- [ ] **Step 4: Весь набор и сборка** — как в Task 3 Step 4: `tests exit 0`, 45 файлов, все passed; `0`; `build exit 0`.

- [ ] **Step 5: Коммит** — `fix: держать высоту кнопки и фокус на пункте после клика в SelectMultiple`.

- [ ] **Step 6: Повтор приёмки** — Playground заново (Task 5 Step 1), Chrome оба окружения: геометрия кнопки «Бренд» `пусто → имя → Выбрано: 2 → пусто` — высота одна, панель кнопку не закрывает; WebKit (Task 5 Step 2): без движения мыши `клик по пункту → символ` (символ в поле) и `клик по пункту → Escape` (фокус на кнопке фильтра), с поиском и без; Chromium — те же последовательности и сценарий 3 спеки §16. Результаты — в `$W/acceptance.md`.

---

### Task 6: Итоговое ревью

- [ ] **Step 1: Пакет ревью**

```bash
BASE=$(cat $W/base-sha) && git log --oneline $BASE..HEAD
bash ~/.claude/plugins/cache/claude-plugins-official/superpowers/7.0.0/skills/subagent-driven-development/scripts/review-package docs/superpowers/plans/2026-10-18-select-multiple.md $BASE HEAD
```

- [ ] **Step 2: Ревьюер**

Свежий ревьюер на самой сильной доступной модели (указывается явно) по `superpowers:requesting-code-review`: пакет ревью, спека, этот план, Review Focus дословно, `$W/acceptance.md`, решения из журнала исполнения. Тесты ревьюер запускает только `npm test -- --dir tests`.

- [ ] **Step 3: Исправления**

Замечания всех уровней — исправления, каждое отдельно: тест, который сначала падает (документы — без теста), исправление, весь набор с `0` в проверке чистоты, коммит `fix:`. Исправление, меняющее вид или поведение, — повторить затронутые шаги Task 5. Замечание, которое нельзя исправить без отхода от спеки, — согласовать до правки.

---

### Task 7: `main` и версия `0.19.0`

- [ ] **Step 1: Ждать `0.18.0`**

```bash
npm view @boobooking/dashboard-ui-components dist-tags.latest --prefer-online
git -C /Users/boobooking/Code/dashboard-ui-components status -sb | head -n 1
```

Expected: `0.18.0`, `## main...origin/main` без `ahead`. Иначе — сообщить владельцу и ждать.

- [ ] **Step 2: Перебазирование**

```bash
git fetch /Users/boobooking/Code/dashboard-ui-components main && git rebase FETCH_HEAD
grep -n '"version"' package.json
```

Expected: без конфликтов (конфликт — остановиться и сообщить); `"version": "0.18.0"`. Затем весь набор и сборка, как в Task 3 Step 4, — всё зелёное, `0`.

- [ ] **Step 3: Версия и `main`**

```bash
npm version 0.19.0 --no-git-tag-version && git diff | grep -E "^[-+].*\"version\""
npm test -- --dir tests --reporter=verbose > $W/t7-suite.log 2>&1; echo "tests exit $?"
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t7-suite.log
npm run build > $W/t7-build.log 2>&1; echo "build exit $?"
git add package.json package-lock.json && git commit -m "chore: поднять версию пакета до 0.19.0"
git -C /Users/boobooking/Code/dashboard-ui-components merge --ff-only feature/select-multiple
git -C /Users/boobooking/Code/dashboard-ui-components log --oneline -1
```

Expected: три строки `0.18.0` → `0.19.0`; `tests exit 0`; `0`; `build exit 0`; `main` перемотан на версионный коммит.

---

### Task 8: Публикация — после согласия владельца

- [ ] **Step 1: Согласие** — остановиться и спросить владельца: публикуется `0.19.0` — пуш `main` и тега `v0.19.0`, коммиты `origin/main..main`. Без явного согласия дальше не идти.

- [ ] **Step 2: Пуш, `Test`, тег, `Publish`** — как Task 8 Steps 2–3 плана `docs/superpowers/plans/2026-10-16-form-input.md`, из основной рабочей копии, с `0.19.0` и тегом `v0.19.0`. Expected: `test exit 0`, `publish exit 0`; `npm view …@0.19.0 version` и `dist-tags.latest` — `0.19.0` (E404 сразу после публикации — повторять).

---

### Task 9: Уборка и отчёт

- [ ] **Step 1: Временные файлы**

```bash
rm -rf ~/Code/mars/certificates/src/public/build/ui-playground $S/playground-check $S/pw $S/inertia-stand
git -C /Users/boobooking/Code/dashboard-ui-components worktree remove .worktrees/select-multiple
git -C /Users/boobooking/Code/dashboard-ui-components branch -d feature/select-multiple
git -C /Users/boobooking/Code/dashboard-ui-components status -s
```

Expected: `status -s` пуст. Каталог `$W` уходит вместе с рабочей копией — до этого скопировать `acceptance.md` в `$S`.

- [ ] **Step 2: Отчёт** — сообщение Codex о конце реализации (что сделано и проверено, согласованные отличия, что не проверялось), затем отчёт владельцу: коммиты, строки тестов, приёмка, ответ с iPad, запуски `Test` и `Publish`, `npm view`.

## Отличия от спеки

- Тесты запускаются с `--dir tests` (спека §15 пишет `npm test`): в `.codex-advisor/` основной рабочей копии лежат копии ревьюера.
- Enter и пробел на пункте (спека §11) проверяются в браузере (Task 5 Step 1, сценарий 2): happy-dom не превращает их в клик кнопки.
- Размер панели — в `PopoverPanel`, `DropdownButton` только пробрасывает `keepSize` (спека §18 оставляла выбор).
