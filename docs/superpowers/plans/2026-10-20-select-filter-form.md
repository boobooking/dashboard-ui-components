# Фильтры и поля формы на общих ядрах, выпуск `0.20.0` — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `SelectSingle`, `SelectMultiple` и `SelectDateInterval` становятся закрытыми ядрами. Над каждым ядром две публичные обёртки:

- `…Filter` — вид фильтра со встроенными высотой и серой рамкой;
- `…Form` — вид `FormInput`.

Старые имена из пакета убраны. Выпуск `0.20.0`.

**Architecture:**

- **Ядра** — прежние файлы `src/components/SelectSingle.vue`, `SelectMultiple.vue`, `SelectDateInterval.vue`. Из них уходят заголовок и внешняя рамка, всё поведение остаётся.
- **Обёртки** — шесть новых SFC. Каждая рисует заголовок или подпись и рамку и передаёт ядру значение и события.
- **Внутренние пропы ядер:**
  - `labelledBy` у `SelectSingle` и `SelectMultiple`, он передаётся в `DropdownButton` → `aria-labelledby` кнопки;
  - `look` (`"filter"` | `"form"`) у `SelectDateInterval`, он задаёт раскладку двух `PickDay`.

**Tech Stack:** Vue 3.5 (Options API, SFC), vitest + happy-dom, @vue/test-utils 2, Vite (library mode), Tailwind 4 с префиксом `bb`, chrome-devtools MCP (Playground), GitHub Actions, npm.

**Spec:** `docs/superpowers/specs/2026-10-20-select-filter-form-design.md` (согласована с Codex).

## Global Constraints

- **Рабочая копия и публикация:**
  - работа идёт в основной рабочей копии `/Users/boobooking/Code/dashboard-ui-components`, на ветке `feature/select-filter-form`; все команды — из неё;
  - публикация (слияние в `main`, тег `v0.20.0`, пуш `main` и тега) — **только после явного согласия владельца на этом шаге** (Task 5);
  - ветка не пушится.
- **Имена и API** — по таблицам спеки §4 и §5:
  - фильтры: `SelectSingleFilter`, `SelectMultipleFilter`, `SelectDateIntervalFilter` с пропом `header` (обязателен) и `isRequired`, `isLoading`;
  - формы: `SelectSingleForm`, `SelectMultipleForm`, `SelectDateIntervalForm` с пропом `label` (обязателен) и `isRequired`, без `isLoading`;
  - пропы и события ядер обёртка передаёт без изменений;
  - `withSearch` и `lang` есть у обёрток `SelectMultiple…`, `lang` — у обёрток `SelectDateInterval…`.
- **Экспорт:** ядра `SelectSingle`, `SelectMultiple`, `SelectDateInterval` пакет не экспортирует.
- **Никаких новых текстов, значков и поведения.** Ни «Не выбрано», ни «Нет вариантов», ни значка календаря. `src/i18n.js` не меняется.
- **Вид фильтра:**
  - корень обёртки — `bb:h-18 bb:border bb:border-gray-200`, внутри прежняя рамка `bb:border bb:border-white bb:bg-white`, перенесённая из ядра. Вид совпадает с сегодняшним `class="h-18 border border-gray-200"` до пикселя;
  - заголовок — `ElementHeader`;
  - без пунктов высота и рамка остаются.
- **Вид формы:**
  - подпись `bb:block bb:text-sm bb:font-medium bb:leading-5 bb:text-gray-700`, справа от неё `Dot color="red"` с `bb:ml-2`, пока `isRequired`;
  - рамка `bb:mt-1 bb:h-9.5 bb:w-full bb:rounded-md bb:border bb:border-gray-300 bb:bg-white bb:shadow-xs bb:text-sm`;
  - у диапазона два поля в `bb:grid bb:grid-cols-2 bb:gap-3`, у каждого своя рамка тех же классов.
- **Доступность формы** (спека §5):
  - у подписи `id` из `useId()`;
  - кнопка `SelectSingleForm` / `SelectMultipleForm` получает `aria-labelledby="<id подписи> <id кнопки>"`;
  - у `SelectDateIntervalForm` обёртка полей — `role="group"` с `aria-labelledby` на подпись;
  - у фильтров атрибута нет.
- **Утилиты:** каждая — с префиксом `bb:`; в `:class` — только литералы (тернарный оператор, объект, массив). Это проверяет `tests/utilityPrefix.test.js`.
- **Стиль кода:**
  - в `.vue` — двойные кавычки и точки с запятой в `<script>`, Options API;
  - в `.js` тестов — одинарные кавычки без точек с запятой;
  - отступ 4 пробела;
  - комментарии по-русски и описывают код как он есть. Существующие комментарии сохраняются; комментарий, ставший ложным, правится.
- **Тесты:**
  - команда `npm test -- --dir tests`;
  - база на `e1a97f5`: `Test Files 46 passed (46)`, `Tests 1103 passed (1103)`. Число тестов поведения не уменьшается.
- **Чистый вывод:** `npm test -- --dir tests --reporter=verbose > $W/<имя>.log 2>&1`, затем `grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/<имя>.log` — ожидается `0`. `W=/Users/boobooking/Code/dashboard-ui-components/.superpowers/sdd/2026-10-20-select-filter-form` (в `git status` не попадает).
- **Коммиты:** conventional commits по-русски, в повелительном наклонении, без служебных строк и упоминаний инструментов; `--no-verify` запрещён.
- **Отклонения:** исполнитель-подагент: «If you cannot follow the plan or spec as written, stop and report the deviation with evidence; do not change the plan.» Отличия согласует с Codex только основная сессия.

## Review Focus

- **Фильтр без пунктов, которые приходят позже.** Пустой `items`, затем `setProps` с пунктами: корень сохраняет `bb:h-18`, кнопка появляется. Тест — Task 1, «пункты пришли позже».
- **Два поля формы на одной странице.** У подписей разные `id`, каждая кнопка ссылается на свою подпись. Тест — Task 1 и Task 2, «две формы на странице».
- **Клавиатура в поле формы.** Список открывается внутри скруглённой рамки, Escape закрывает его, и фокус возвращается на кнопку.
  - Unit-тест — Task 1, «клавиатура в поле формы»: открытие кликом. Заглушка Popover в happy-dom открывает панель только по `click`, а не по Enter.
  - Нативное открытие Enter и пробелом — в приёмке Task 4, в обоих окружениях.
- **`null` в `label` и `header`.** Компонент рисуется, подпись пустая, ошибок нет. Тест — Task 1, Task 2, Task 3, «null в подписи».
- **Старый класс на новом фильтре.** Проект ещё передаёт `class="h-18 border border-gray-200 ml-2"`: классы ложатся на корень, вид не меняется. Тест — Task 1, «класс потребителя».

---

### Task 1: `SelectSingle` — ядро, `SelectSingleFilter`, `SelectSingleForm`

**Files:**
- Modify: `src/components/SelectSingle.vue`, `src/components/DropdownButton.vue`, `src/index.js`, `playground/App.vue`
- Create: `src/components/SelectSingleFilter.vue`, `src/components/SelectSingleForm.vue`
- Test:
  - new file: `tests/SelectSingleWrappers.test.js`;
  - modified: `tests/SelectSingle.test.js`, `tests/keyboardNavigation.test.js`, `tests/press.test.js`, `tests/CrossButton.test.js`, `tests/PopoverPanel.test.js`, `tests/i18n.test.js`, `tests/exports.test.js`, `tests/ssrFixtures.js` — только части о `SelectSingle`.

**Interfaces:**
- **`DropdownButton`:** новый проп `labelledBy: { type: String, default: null }`. На кнопке-триггере: `:aria-labelledby="labelledBy ? labelledBy + ' ' + trigger.id : null"`. С корня снимается `bb:bg-white`: фон дают рамка фильтра (`bb:bg-white`) и рамка формы. Белый прямоугольник кнопки закрашивал бы скруглённые углы рамки формы. `DropdownButton` используют только `SelectSingle` и `SelectMultiple`.
- **Ядро `SelectSingle`:**
  - пропы `items` (обязателен), `modelValue`, `labelledBy: { type: String, default: null }`; события `update:modelValue`, `changed`;
  - корень `<div class="bb-dashboard-ui bb:flex bb:flex-col bb:grow">`, внутри — прежний `dropdown-button` с `:labelled-by="labelledBy"`;
  - `ElementHeader`, внутренняя рамка и пропы `header`, `isRequired`, `isLoading` уходят.
- **`SelectSingleFilter`:**
  - корень `bb-dashboard-ui bb:flex bb:flex-none bb:h-18 bb:border bb:border-gray-200`;
  - внутри `bb:flex bb:w-full bb:flex-col bb:border bb:border-white bb:bg-white`, затем `element-header` (`:text="header ?? ''"`, `isRequired`, `isLoading`) и ядро.
- **`SelectSingleForm`:**
  - `setup()` возвращает `{ labelId: useId() }`;
  - корень `bb-dashboard-ui`;
  - строка подписи `bb:flex bb:items-center`: `<span :id="labelId" …>` с текстом `label ?? ''`, затем `dot`;
  - рамка (классы из Global Constraints, плюс `bb:flex bb:flex-col`), в ней ядро с `:labelled-by="labelId"`.
- **Обе обёртки** передают значение и события как `:model-value="modelValue"` и `@update:model-value="$emit('update:modelValue', $event)"`, плюс `@changed="$emit('changed')"`. `emits: ["update:modelValue", "changed"]`. `class` и прочие атрибуты ложатся на корень — `inheritAttrs` по умолчанию.
- **Produces для Task 2:** `DropdownButton.labelledBy` и раскладка обёрток — образец для `SelectMultiple`.
- **Уточнение по итоговому ревью** (согласовано с Codex, PLAN-004):
  - внутренний проп `look: { type: String, default: "filter", validator }` у ядер `SelectSingle` и `SelectMultiple` и у `DropdownButton`; ядра передают его как `:look="look"`;
  - обёртки `…Form` передают `look="form"`;
  - в `form` кнопка `DropdownButton` получает `bb:rounded-md` (литеральное тернарное выражение);
  - в `filter` классы прежние.

- [ ] **Step 1: База** — `W=…; mkdir -p "$W"; git rev-parse HEAD > "$W/base-sha"; npm test -- --dir tests 2>&1 | grep -E 'Test Files|Tests '`. Ожидается `46 passed`, `1103 passed`.
- [ ] **Step 2: Тесты обёрток (падают)** — `tests/SelectSingleWrappers.test.js`, `describe('SelectSingleFilter')` и `describe('SelectSingleForm')`. Пункты `[{ id: 'a', name: 'Первый' }, { id: 'b', name: 'Второй' }]`.
  - `SelectSingleFilter`:
    - `высота и рамка на корне` — у корня классы `bb:h-18`, `bb:border`, `bb:border-gray-200`;
    - `заголовок и точки` — текст `Вендор`; точка `isRequired` видна; точка `isLoading` с пульсом видна;
    - `пункты пришли позже` — `items: []`: у корня `bb:h-18`, `find('button').exists()` — `false`. После `setProps({ items })` кнопка есть, классы корня те же;
    - `класс потребителя` — `class: 'h-18 border border-gray-200 ml-2'`: все четыре класса на корне, ошибок и предупреждений нет;
    - `v-model насквозь` — выбор `b`: события `update:modelValue` `['b']` и `changed`;
    - `кнопка без aria-labelledby` — атрибута нет;
    - `null в подписи` — `header: null`: рисуется, ошибок нет. `warnHandler: () => {}`, как в тесте `null` у `items`.
  - `SelectSingleForm`:
    - `подпись и точка как у FormInput` — текст подписи, классы подписи из Global Constraints, точка при `isRequired`;
    - `рамка поля` — `bb:h-9.5`, `bb:rounded-md`, `bb:border-gray-300`;
    - `без пунктов рамка остаётся` — рамка есть, кнопки нет;
    - `доступное имя` — без выбора у кнопки `aria-labelledby` равно `${labelId} ${button.id}`, где `labelId` — `id` подписи. С `modelValue: 'a'` значение то же;
    - `две формы на странице` — две копии в одном `mount` обёртки-родителя: `id` подписей разные, у каждой кнопки свой;
    - `клавиатура в поле формы` — фокус на кнопке, клик по ней, список открыт; Escape (`press('Escape')`) — список закрыт, `document.activeElement` — кнопка. Помощники `settle`, `press`, `open` и `installPopoverStub` — как в `SelectSingle.test.js`. Заглушка открывает панель только по `click`; открытие Enter и пробелом проверяет Task 4 в браузере. Обработчики компонентов ради теста не меняются;
    - `v-model насквозь`, `класс на корне`, `null в подписи` — как у фильтра.
- [ ] **Step 3: Запуск** — `npm test -- --dir tests tests/SelectSingleWrappers.test.js`. Ожидается FAIL: файлов обёрток нет.
- [ ] **Step 4: `DropdownButton`, ядро, две обёртки** — как в Interfaces. Комментарии ядра и `DropdownButton` поправить там, где они говорят о заголовке или фоне.
- [ ] **Step 5: Экспорт и SSR:**
  - `src/index.js`: убрать `SelectSingle`, добавить `SelectSingleFilter` и `SelectSingleForm`;
  - `tests/exports.test.js`:
    - в списке вместо `SelectSingle` стоят `SelectSingleFilter` и `SelectSingleForm`;
    - заголовок теста называет новое число компонентов (`двадцать`);
    - новый `it.each(['SelectSingle'])('%s — ядро, не экспортируется')`. Task 2 и Task 3 дописывают в него свои ядра;
  - `tests/ssrFixtures.js`: вместо `SelectSingle` — `SelectSingleFilter: { props: { header: 'Вендор', items: [{ id: 'a', name: 'Первый' }], modelValue: 'a' } }` и `SelectSingleForm` с `label: 'Вендор'` и теми же пунктами.
- [ ] **Step 6: Перенос тестов поведения:**
  - всюду, где тесты монтируют `SelectSingle` с `header`, они монтируют `SelectSingleFilter` с тем же `header`. Это `SelectSingle.test.js`, `keyboardNavigation.test.js`, `press.test.js`, `CrossButton.test.js`, `PopoverPanel.test.js`, `i18n.test.js`;
  - чтение состояния (`wrapper.vm.isOpen`, `SelectSingle.test.js:237`) идёт у ядра: `wrapper.findComponent(SelectSingle).vm.isOpen`, где ядро импортируется из `../src/components/SelectSingle.vue`;
  - имена тестов и сценарии не меняются.
- [ ] **Step 7: Playground** — секция `SelectSingle` в `playground/App.vue` становится двумя:
  - `SelectSingleFilter` — два фильтра рядом, с пунктами и с `items: []`;
  - `SelectSingleForm` — под `FormInput` секции FormInput: поле с пунктами, обязательное поле, поле без пунктов.

  Импорт из `../dist/index.js` и `components` — по новым именам. Затем две сборки, обе без ошибок и предупреждений:
  - `npm run build` — сборка библиотеки;
  - `npx vite build --config vite.playground.config.js` — сборка Playground, обе страницы.
- [ ] **Step 8: Полный прогон** — тесты и проверка чистого вывода (Global Constraints). Ожидается: все зелёные, `0`, число тестов больше 1103.
- [ ] **Step 9: Commit** — `git add -A src tests playground/App.vue && git commit -m "feat: разделить SelectSingle на ядро и обёртки фильтра и формы"`.

### Task 2: `SelectMultiple` — ядро, `SelectMultipleFilter`, `SelectMultipleForm`

**Files:**
- Modify: `src/components/SelectMultiple.vue`, `src/index.js`, `playground/App.vue`
- Create: `src/components/SelectMultipleFilter.vue`, `src/components/SelectMultipleForm.vue`
- Test:
  - new file: `tests/SelectMultipleWrappers.test.js`;
  - modified: `tests/SelectMultiple.test.js`, `tests/keyboardNavigation.test.js`, `tests/press.test.js`, `tests/CrossButton.test.js`, `tests/i18n.test.js`, `tests/exports.test.js`, `tests/ssrFixtures.js` — только части о `SelectMultiple`.

**Interfaces:**
- Consumes: `DropdownButton.labelledBy` и образец обёрток из Task 1.
- **Ядро `SelectMultiple`:**
  - пропы `items` (обязателен), `modelValue`, `withSearch`, `labelledBy`, `lang` (`withLang`); события `update:modelValue`, `changed`;
  - корень `bb-dashboard-ui bb:flex bb:flex-col bb:grow`;
  - `dropdown-button` получает `:labelled-by="labelledBy"` и прежние пропы;
  - поиск, его ластик и кольцо фокуса поля (`bb:focus:focus-ring`) остаются в ядре: `focusRing.test.js` по-прежнему ждёт один узел в `SelectMultiple.vue`.
- **`SelectMultipleFilter` / `SelectMultipleForm`** — как обёртки Task 1 плюс пропы `withSearch` и `lang`, переданные ядру.

- [ ] **Step 1: Тесты обёрток (падают)** — `tests/SelectMultipleWrappers.test.js`, те же группы, что в Task 1 (в «клавиатуре в поле формы» тоже открытие кликом), плюс:
  - `надпись «Выбрано» через lang` — `lang: 'en'`, `modelValue: ['a', 'b']`: надпись кнопки `Selected: 2`;
  - `поиск у формы` — `withSearch`: при открытии фокус в поле поиска;
  - `две формы на странице`;
  - `null в подписи`.
- [ ] **Step 2: Запуск** — FAIL, файлов нет.
- [ ] **Step 3: Ядро и обёртки.**
- [ ] **Step 4: Экспорт и SSR:**
  - `SelectMultiple` убран из `src/index.js`, вместо него `SelectMultipleFilter` и `SelectMultipleForm`;
  - список в `exports.test.js` обновлён (`двадцать один`), `SelectMultiple` в `it.each` ядер;
  - фикстуры `SelectMultipleFilter` (`header: 'Бренд'`) и `SelectMultipleForm` (`label: 'Бренд'`) с пунктами, `modelValue` и `withSearch: true` прежней фикстуры.
- [ ] **Step 5: Перенос тестов поведения** — как Step 6 Task 1. Чтение `wrapper.vm.isOpen` и `wrapper.vm.query` (в том числе `SelectMultiple.test.js:944`) идёт у ядра через `findComponent(SelectMultiple)`.
- [ ] **Step 6: Playground** — секции `SelectMultipleFilter` (рядом с фильтрами Task 1, с поиском) и `SelectMultipleForm` (в форме Task 1). Затем `npm run build` и `npx vite build --config vite.playground.config.js`, обе без ошибок и предупреждений.
- [ ] **Step 7: Полный прогон** — тесты зелёные, чистый вывод `0`.
- [ ] **Step 8: Commit** — `git commit -m "feat: разделить SelectMultiple на ядро и обёртки фильтра и формы"`.

### Task 3: `SelectDateInterval` — ядро с `look`, `SelectDateIntervalFilter`, `SelectDateIntervalForm`

**Files:**
- Modify: `src/components/SelectDateInterval.vue`, `src/index.js`, `playground/App.vue`
- Create: `src/components/SelectDateIntervalFilter.vue`, `src/components/SelectDateIntervalForm.vue`
- Test:
  - new file: `tests/SelectDateIntervalWrappers.test.js`;
  - modified: `tests/SelectDateInterval.test.js`, `tests/keyboardNavigation.test.js`, `tests/press.test.js`, `tests/i18n.test.js`, `tests/exports.test.js`, `tests/ssrFixtures.js` — только части о `SelectDateInterval`.

**Interfaces:**
- **Ядро `SelectDateInterval`:**
  - пропы `dateFrom`, `dateTo`, `lang` и `look: { type: String, default: "filter", validator: (value) => ["filter", "form"].includes(value) }`;
  - события и наблюдатели прежние;
  - корень `:class="look === 'form' ? 'bb-dashboard-ui bb:grid bb:grid-cols-2 bb:gap-3' : 'bb-dashboard-ui bb:flex bb:h-full bb:divide-x bb:divide-gray-200'"`;
  - у каждого `pick-day` `:class="look === 'form' ? 'bb:h-9.5 bb:min-w-0 bb:rounded-md bb:border bb:border-gray-300 bb:bg-white bb:shadow-xs bb:text-sm' : 'bb:flex-1 bb:min-w-36 bb:pl-3'"` и `:look="look"`;
  - **`PickDay`** (отклонение по приёмке, согласовано с Codex): внутренний проп `look: { type: String, default: "filter", validator }`. Вид `filter` не меняется. В `form`:
    - кнопка-триггер получает `bb:rounded-md`;
    - поле ввода получает `bb:pl-3 bb:rounded-md` (литеральные тернарные выражения).

    Так оба носителя кольца фокуса (кнопка и поле ввода — отдельная остановка Tab) обводят всё скруглённое поле, а текст не прилипает к рамке;
  - `ElementHeader` и внешние `div` уходят в обёртку фильтра.
- **`SelectDateIntervalFilter`:**
  - корень `bb-dashboard-ui bb:flex bb:h-18 bb:border bb:border-gray-200`;
  - внутри `bb:flex bb:border bb:border-white`;
  - затем столбец `bb:flex bb:flex-col bb:min-w-72 bb:w-72 bb:bg-white bb:h-full`: `element-header` и ядро с `look="filter"`.
- **`SelectDateIntervalForm`:**
  - `labelId` из `useId()`, подпись и точка как в Task 1;
  - `<div class="bb:mt-1" role="group" :aria-labelledby="labelId">` с ядром `look="form"`.
- **Обе обёртки** передают `dateFrom` / `dateTo`, `update:dateFrom` / `update:dateTo`, `changed` и `lang`; `emits: ["update:dateFrom", "update:dateTo", "changed"]`.

- [ ] **Step 1: Тесты обёрток (падают)** — `tests/SelectDateIntervalWrappers.test.js`:
  - `SelectDateIntervalFilter`:
    - корень `bb:h-18 bb:border bb:border-gray-200`;
    - заголовок и точки;
    - подсказки полей `от` и `до` (язык по умолчанию);
    - события насквозь: смена даты в первом поле — `update:dateFrom` и `changed`;
    - `null в подписи`.
  - `SelectDateIntervalForm`:
    - подпись и точка;
    - группа: элемент с `role="group"` и `aria-labelledby` = `id` подписи;
    - `от и до одинаковой ширины` — у обоих корней `PickDay` один и тот же набор классов, в нём `bb:h-9.5` и `bb:border-gray-300`, а у обёртки полей `bb:grid-cols-2`;
    - без значков: в поле только `input` и кнопка `PickDay`, новых `svg` и текстов нет. Сверить с числом `svg` в фильтре;
    - `null в подписи`.
  - Ядро: `SelectDateInterval.props.look.validator('x')` — `false`, `'filter'` и `'form'` — `true`; без `look` раскладка `filter`.
- [ ] **Step 2: Запуск** — FAIL.
- [ ] **Step 3: Ядро и обёртки.**
- [ ] **Step 4: Экспорт и SSR:**
  - в `src/index.js` вместо `SelectDateInterval` — `SelectDateIntervalFilter` и `SelectDateIntervalForm`;
  - список в `exports.test.js` (`двадцать два`) и `it.each` ядер;
  - фикстуры `SelectDateIntervalFilter` (`header: 'Интервал'`) и `SelectDateIntervalForm` (`label: 'Период'`) с прежними датами `01.03.2026` / `15.03.2026`.
- [ ] **Step 5: Перенос тестов поведения** — как Step 6 Task 1, монтируется `SelectDateIntervalFilter`. `PickDay.test.js` не меняется.
- [ ] **Step 6: Playground** — секции `SelectDateIntervalFilter` (в панели фильтров) и `SelectDateIntervalForm` (в форме). Затем `npm run build` и `npx vite build --config vite.playground.config.js`, обе без ошибок и предупреждений.
- [ ] **Step 7: Полный прогон** — зелёный, чистый вывод `0`. `tests/ssr.test.js` и `tests/hydration.test.js` проходят для всех двадцати двух компонентов.
- [ ] **Step 8: Commit** — `git commit -m "feat: разделить SelectDateInterval на ядро и обёртки фильтра и формы"`.

### Task 4: README, версия `0.20.0`, приёмка в Playground

**Files:**
- Modify: `README.md`, `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: шесть компонентов Task 1–3.

- [ ] **Step 1: README** — по спеке §12:
  - разделы `SelectDateInterval`, `SelectSingle`, `SelectMultiple` становятся разделами `SelectSingleFilter`, `SelectMultipleFilter`, `SelectDateIntervalFilter`. В примерах — новые теги без классов `h-18 border border-gray-200`;
  - новые разделы `SelectSingleForm`, `SelectMultipleForm`, `SelectDateIntervalForm`: вид, пропы, события и ссылка на поведение в разделе фильтра. Отдельной строкой — доступное имя: подпись связана с полем для скринридера;
  - «Правила API пакета»: `required: true` — у `items`, у `header` фильтров и у `label` полей формы;
  - «Playground»: двадцать два компонента;
  - новый раздел «Обновление с 0.19» перед «Обновление с 0.15»: таблица «Было | Стало» из спеки §12 и абзац о том, что импорт старых имён больше не работает. Абзац о версии: `0.20.0` не подтянется по `^0.19.x`, команда `npm install @boobooking/dashboard-ui-components@^0.20.0`.

  Упоминания старых имён в остальном README (`Клавиатурная навигация`, `Языки`, `SSR`) заменяются новыми.
- [ ] **Step 2: Версия** — `npm version 0.20.0 --no-git-tag-version`. В `package.json` и `package-lock.json` стоит `0.20.0`.
- [ ] **Step 3: Проверки:**
  - `npm test -- --dir tests` — зелёный, чистый вывод `0`;
  - `npm run build` и `npx vite build --config vite.playground.config.js` — без предупреждений.
- [ ] **Step 4: Приёмка в Playground** — `npm run playground`, открыть оба окружения через chrome-devtools (порт — из вывода vite; страницы `index.html` и `host.html`). В каждом окружении:
  - три фильтра одной высоты с серой рамкой, в том числе фильтр без пунктов;
  - три поля формы под `FormInput` одной с ним высоты и рамки:
    - подпись сверху, красная точка у обязательного;
    - углы рамки целые;
    - кольцо фокуса видно целиком;
  - «от» и «до» в форме одинаковой ширины;
  - клавиатура и мышь: открытие, стрелки, выбор, Escape, ластик, поиск, календари — как в 0.19.1. Отдельно — нативное открытие Enter и пробелом у всех трёх полей формы и фильтров (в unit-тестах его не проверить);
  - голое окружение и окружение приложения выглядят одинаково.

  Записать результат по каждому пункту в отчёт.
- [ ] **Step 5: Commit** — `git add README.md package.json package-lock.json && git commit -m "chore: описать фильтры и поля формы и поднять версию до 0.20.0"`.

### Task 5: Выпуск `0.20.0` (только с согласия владельца)

- [ ] **Step 1: Согласие.** Основная сессия спрашивает владельца. Без «да» на этом шаге ничего не публикуется.
- [ ] **Step 2: Слияние.** `git checkout main && git merge --ff-only feature/select-filter-form`, затем `npm test -- --dir tests` и `npm run build` на `main`.
- [ ] **Step 3: Тег и пуш.** `git tag v0.20.0 && git push origin main && git push origin v0.20.0`. Публикацию в npm делает GitHub Actions по тегу. Проверка: `npm view @boobooking/dashboard-ui-components dist-tags` показывает `latest: '0.20.0'` (после завершения workflow).
- [ ] **Step 4: Уборка.** `git branch -d feature/select-filter-form`.

---

## Редакция 2 (после показа Тиму, 2026-10-20)

Tasks 1–4 выполнены по редакции 1 спеки (головной коммит `be62f51`). Тим изменил разделение: ядро — только поведение, обёртка — весь вид; у ядер нет переключателей вида; разделитель и рамки полей диапазона — часть обёртки; добавляются `SelectDateFilter` и `SelectDateForm`. Спека — редакция 2. Tasks 6–9 переделывают код на той же ветке; Task 5 (выпуск) выполняется после Task 9.

**Global Constraints редакции 2** (дополняют и заменяют противоречащие строки выше):

- **Переключателей вида нет.** У ядер `SelectSingle`, `SelectMultiple`, `SelectDate`, `SelectDateInterval` и у `DropdownButton` пропа `look` нет. Классы, отличающие фильтр от формы, живут только в обёртках.
- **Скругление.**
  - Обёртка `…Form` задаёт на рамке поля `bb:[--bb-field-radius:0.375rem]`; обёртки `…Filter` переменную не задают.
  - Кнопка `DropdownButton`, а также кнопка-триггер и поле ввода `SelectDate` всегда несут `bb:rounded-[var(--bb-field-radius,0)]`.
- **Отступ текста поля даты** — `bb:pl-3` на поле ввода `SelectDate`; родители отступ не задают.
- **Экспорт:** двадцать четыре компонента. `SelectSingle`, `SelectMultiple`, `SelectDate`, `SelectDateInterval` и `PickDay` не экспортируются.
- **`SelectDateInterval`** — ядро без разметки:
  - `inheritAttrs: false`;
  - слот по умолчанию со свойствами `from` и `to`, у каждого `{ value, update, placeholder }`;
  - обёртки передают `lang` и ядру, и каждому `SelectDate`;
  - `v-bind` без аргумента запрещён `tests/utilityPrefix.test.js`, поэтому поля слота привязываются явно.
- **Доступность `SelectDate` с `labelledBy`:**
  - кнопка-триггер — `aria-labelledby="<id подписи> <id кнопки>"`;
  - поле ввода — `aria-labelledby="<id подписи>"`;
  - без `labelledBy` атрибутов нет.

### Task 6: `SelectSingle`, `SelectMultiple` — без `look`, радиус из переменной

**Files:**
- Modify: `src/components/DropdownButton.vue`, `SelectSingle.vue`, `SelectMultiple.vue`, `SelectSingleForm.vue`, `SelectMultipleForm.vue`
- Test: `tests/SelectSingleWrappers.test.js`, `tests/SelectMultipleWrappers.test.js` и тесты, проверявшие `look` у этих ядер и `DropdownButton`.

**Interfaces:**
- `DropdownButton`: проп `look` удалён; у кнопки-триггера литеральный класс `bb:rounded-[var(--bb-field-radius,0)]` без условия. `labelledBy` и прежнее поведение — как есть.
- Ядра: проп `look` удалён, `:look` больше не передаётся.
- `SelectSingleForm`, `SelectMultipleForm`: `look="form"` убран; на рамке поля добавлен `bb:[--bb-field-radius:0.375rem]`.

- [ ] **Step 1: Тесты (падают):**
  - у рамки формы класс `bb:[--bb-field-radius:0.375rem]`;
  - у кнопки-триггера и в фильтре, и в форме класс `bb:rounded-[var(--bb-field-radius,0)]`;
  - у корня и рамок фильтра нет класса с `--bb-field-radius`;
  - у ядер и `DropdownButton` нет пропа `look`: `expect(SelectSingle.props.look).toBeUndefined()`, то же для `SelectMultiple` и `DropdownButton`.

  Тесты валидатора `look` удаляются, сценарии поведения остаются. Ошибки и предупреждения Vue проверяются пустыми.
- [ ] **Step 2: Запуск** — FAIL.
- [ ] **Step 3: Код** — как в Interfaces.
- [ ] **Step 4: Прогон:**
  - тесты зелёные, чистый вывод `0`, `focusRing.test.js` без изменений числа носителей;
  - `npm run build` и `npx vite build --config vite.playground.config.js` — без предупреждений.
- [ ] **Step 5: Commit** — `git commit -m "refactor: убрать переключатель вида из ядер списков"`.

### Task 7: ядро `SelectDate`, `SelectDateFilter`, `SelectDateForm`

**Files:**
- Rename: `src/components/PickDay.vue` → `src/components/SelectDate.vue` (`git mv`), `tests/PickDay.test.js` → `tests/SelectDate.test.js`
- Create: `src/components/SelectDateFilter.vue`, `src/components/SelectDateForm.vue`, `tests/SelectDateWrappers.test.js`
- Modify:
  - `src/components/SelectDateInterval.vue` (импорт `SelectDate`), `src/index.js`, `playground/App.vue`;
  - тесты, импортирующие `PickDay`: `keyboardNavigation`, `i18n`, `hydration`, `utilityPrefix`, `focusRing` (имя файла в списке носителей), `exports`;
  - `tests/ssrFixtures.js`.

**Interfaces:**
- **Ядро `SelectDate`:**
  - пропы как у `PickDay` минус `look` плюс `labelledBy: { type: String, default: null }`; события как у `PickDay`;
  - поле ввода всегда несёт `bb:pl-3` и `bb:rounded-[var(--bb-field-radius,0)]`; кнопка-триггер — `bb:rounded-[var(--bb-field-radius,0)]`;
  - кнопка-триггер: `:aria-labelledby="labelledBy ? labelledBy + ' ' + trigger.id : null"`; поле ввода: `:aria-labelledby="labelledBy || null"`;
  - комментарий об отступе поля ввода переписывается: отступ стоит на поле ввода всегда.
- **`SelectDateFilter`:**
  - корень `bb-dashboard-ui bb:flex bb:w-fit bb:h-18 bb:border bb:border-gray-200`;
  - внутри `bb:flex bb:border bb:border-white`, затем столбец `bb:flex bb:flex-col bb:w-36 bb:bg-white bb:h-full`: `element-header` и `select-date` (`class="bb:flex-1"`);
  - пропы `modelValue` (String, `""`), `header` (обязателен), `isRequired`, `isLoading`, `lang`; события `update:modelValue`, `changed`.
- **`SelectDateForm`:**
  - подпись с `useId()` и `Dot`, как в Task 1;
  - рамка `bb:mt-1 bb:flex bb:h-9.5 bb:w-full bb:rounded-md bb:border bb:border-gray-300 bb:bg-white bb:shadow-xs bb:text-sm bb:[--bb-field-radius:0.375rem]`, в ней `select-date` (`class="bb:flex-1"`, `:labelled-by="labelId"`);
  - пропы `modelValue`, `label` (обязателен), `isRequired`, `lang`; события те же;
  - подсказка пустая.

- [ ] **Step 1: Переименование** — `git mv` файла ядра и теста, импорты во всех местах; полный прогон зелёный, без изменений поведения (коммит не нужен до Step 6).
- [ ] **Step 2: Тесты ядра и обёрток (падают):**
  - в `SelectDate.test.js`:
    - отступ `bb:pl-3` на поле ввода;
    - класс радиуса на кнопке и поле;
    - нет пропа `look`;
    - `labelledBy`: у кнопки `"<id> <id кнопки>"`, у поля `"<id>"`; без него атрибутов нет.
  - в `tests/SelectDateWrappers.test.js`:
    - **фильтр:** корень `bb:h-18 bb:border bb:border-gray-200 bb:w-fit`; столбец `bb:w-36`; заголовок и точки; смена даты — `update:modelValue` и `changed`; `class` на корне; `null` в заголовке; переменная радиуса не задана;
    - **форма:** подпись и точка; рамка поля и переменная; доступное имя кнопки и поля при пустой и выбранной дате; две формы — разные `id`; `class` на корне; `null` в подписи.

  Во всех тестах ошибки и предупреждения Vue пустые.
- [ ] **Step 3: Запуск** — FAIL.
- [ ] **Step 4: Код** — ядро и две обёртки, как в Interfaces.
- [ ] **Step 5: Экспорт, SSR, Playground:**
  - `SelectDateFilter` и `SelectDateForm` в `src/index.js`;
  - в `exports.test.js`: «двадцать четыре», `SelectDate` в `it.each` ядер;
  - фикстуры: `SelectDateFilter` (`header: 'Дата', modelValue: '01.03.2026'`), `SelectDateForm` (`label: 'Дата'`, та же дата);
  - в Playground — фильтр в панели фильтров и поле в форме.
- [ ] **Step 6: Прогон и Commit:**
  - тесты зелёные, чистый вывод `0`, обе сборки без предупреждений;
  - `git commit -m "feat: добавить поле одной даты SelectDateFilter и SelectDateForm"`.

### Task 8: ядро `SelectDateInterval` без разметки, обёртки рисуют поля

**Files:**
- Modify: `src/components/SelectDateInterval.vue`, `SelectDateIntervalFilter.vue`, `SelectDateIntervalForm.vue`
- Test: `tests/SelectDateIntervalWrappers.test.js`, `tests/SelectDateInterval.test.js`

**Interfaces:**
- **Ядро:**
  - `inheritAttrs: false`;
  - пропы `dateFrom`, `dateTo`, `lang`; события и наблюдатели прежние;
  - шаблон — только `<slot :from="from" :to="to"/>`;
  - `from` / `to` — computed `{ value, update, placeholder }`, где `update(value)` пишет в локальную копию, а `placeholder` — `texts.dateFrom` / `texts.dateTo`;
  - `look` и импорт `SelectDate` уходят из ядра.
- **`SelectDateIntervalFilter`:**
  - рамка, заголовок и столбец `bb:w-72`, как сейчас;
  - внутри ядро со слотом `v-slot="{ from, to }"`: строка `bb:flex bb:h-full bb:divide-x bb:divide-gray-200` с двумя `select-date` (`class="bb:flex-1 bb:min-w-36"`);
  - каждому `select-date` передаются `:model-value="from.value"`, `@update:model-value="from.update"`, `:placeholder-text="from.placeholder"` и `:lang="lang"` (у второго — `to`).
- **`SelectDateIntervalForm`:**
  - подпись, затем `<div class="bb:mt-1 bb:grid bb:grid-cols-2 bb:gap-3" role="group" :aria-labelledby="labelId">`, внутри ядро со слотом;
  - в слоте две рамки классами рамки `SelectDateForm` (с переменной радиуса), в каждой `select-date` (`class="bb:flex-1"`) с полем `from` или `to`, как в фильтре.

- [ ] **Step 1: Тесты (падают):**
  - ядро передаёт в слот `from` и `to` с `value`, `update`, `placeholder`; `update` меняет значение и даёт `update:dateFrom` и `changed`; эхо родителя не даёт `changed`; атрибуты на ядро не переносятся;
  - фильтр: строка с линией (`bb:divide-x`) — разметка обёртки, у обоих полей `bb:flex-1 bb:min-w-36`, переменная радиуса не задана;
  - форма: две рамки с одинаковыми классами и переменной, группа с подписью, `lang` у обоих полей;
  - тесты `look` удаляются, сценарии поведения в `SelectDateInterval.test.js` (через `SelectDateIntervalFilter`) остаются, в том числе «открытие "до" закрывает "от"».
- [ ] **Step 2: Запуск** — FAIL.
- [ ] **Step 3: Код** — как в Interfaces.
- [ ] **Step 4: Прогон:**
  - тесты зелёные, чистый вывод `0`;
  - `ssr` и `hydration` для двадцати четырёх компонентов;
  - обе сборки без предупреждений.
- [ ] **Step 5: Commit** — `git commit -m "refactor: отдать разметку полей диапазона дат обёрткам"`.

### Task 9: README, Playground, приёмка редакции 2

**Files:**
- Modify: `README.md`, `playground/App.vue`, при необходимости `docs/superpowers/specs/2026-10-20-select-filter-form-design.md`

- [ ] **Step 1: README:**
  - разделы `SelectDateFilter` и `SelectDateForm`;
  - список компонентов и «Playground» — двадцать четыре;
  - в «Клавиатурной навигации» поле даты названо без внутреннего имени `PickDay`;
  - в «Обновление с 0.19» — строка о новых компонентах одной даты (без предшественника);
  - описания вида фильтров и форм — по спеке редакции 2.
- [ ] **Step 2: Playground:**
  - панель фильтров — четыре `…Filter` и пустой `SelectSingleFilter` в одной строке;
  - форма — `FormInput` и четыре `…Form`.
- [ ] **Step 3: Проверки:**
  - `npm test -- --dir tests` — зелёный, чистый вывод `0`;
  - `npm run build` и `npx vite build --config vite.playground.config.js` — без предупреждений;
  - `npm version` не меняется, версия остаётся `0.20.0`.
- [ ] **Step 4: Commit** — `git commit -m "docs: описать поля одной даты и обновить Playground"`.
- [ ] **Step 5: Приёмка в браузере** — выполняет основная сессия: статическая сборка Playground в `~/Code/mars/certificates/src/public/build/ui-playground`, страницы `index.html` и `host.html`, контейнер headless Chrome. Проверяется спека §14 по каждому пункту в обоих окружениях.

После Task 9 и итогового ревью ветки — Task 5 (выпуск) с согласия владельца.
