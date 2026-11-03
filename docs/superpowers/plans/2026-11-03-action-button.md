# ActionButton, яркие цвета и общий список иконок — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** публичный компонент `ActionButton`; общий список цветов из двенадцати имён (`<цвет>-solid` и `<цвет>-pale`) вместо шести прежних; общий список иконок с новыми `bank-transfer` и `currency-exchange`; кнопки `ConfirmationModal` и основная кнопка `DropdownButtonWithAction` на `ActionButton`; выпуск `0.24.0`.

**Architecture:**
- Цвета — `src/colors.js`: двенадцать записей литералами, у каждой наборы `pill`, `pillHover`, `button`, `buttonHover`, `menuItem`, `mark`. Наведение кнопки вынесено из `button` в `buttonHover` по образцу `pill`/`pillHover`: выключенная кнопка не берёт наведение.
- Иконки — прежние `src/actionIcons.js` и `ActionIcon.vue`: список расширяется, имена модуля и компонента не меняются.
- `ActionButton.vue` — `<a>` или `<button>` с иконкой (`ActionIcon`) и подписью; внутренний проп `groupPart` даёт `DropdownButtonWithAction` скругление и тень группы.

**Tech Stack:** Vue 3.5 (Options API), vitest + happy-dom, Playwright 1.63 (Chromium, WebKit), Tailwind 4 с префиксом `bb`.

**Spec:** `docs/superpowers/specs/2026-11-03-action-button-design.md`.

## Global Constraints

- **Ветка:** `feat/action-button`, основная рабочая копия. Слияние и тег — только по слову владельца.
- **Имена цветов, порядок списка:** `gray-solid`, `gray-pale`, `green-solid`, `green-pale`, `yellow-solid`, `yellow-pale`, `red-solid`, `red-pale`, `indigo-solid`, `indigo-pale`, `purple-solid`, `purple-pale`. Синонимов для `gray`, `green`, … нет.
- **Яркие (фон / наведение и рамка / текст):** gray `500`/`600`/`white`; green `600`/`700`/`white`; yellow `300`/`400`/`yellow-950`; red `600`/`700`/`white`; indigo `500`/`600`/`white`; purple `500`/`600`/`white`.
- **Иконки, порядок списка:** `plus`, `download`, `refresh`, `bank-transfer`, `currency-exchange`; 16 × 16 px только в `ActionIcon`.
- **Кнопка:** `bb:px-4 bb:py-2 bb:border bb:rounded-md bb:shadow-xs bb:text-sm bb:font-medium bb:gap-2`, высота 38 px; без цвета `bb:bg-white bb:border-gray-300 bb:text-gray-700`, наведение `bb:hover:bg-gray-50`; фокус `bb:focus:focus-ring`; выключенная `bb:opacity-50 bb:cursor-not-allowed`.
- **Код:** классы литералами с префиксом `bb:`, цветовые — только через `colorClass`; содержимое кнопок и ссылок — с `bb:pointer-events-none bb:cursor-default`, иконки `aria-hidden="true"`; комментарии по-русски и без истории изменений; существующие комментарии не удалять, если они не стали ложными — ложные исправить.
- **Коммиты:** conventional commits по-русски, без `--no-verify`.
- **Отклонения:** если план или спеку нельзя выполнить как написано — остановиться и сообщить об отклонении с доказательством; план не менять.
- **Проверка:** `npx vitest run --dir tests` (голый `npm test` падает на зондах в `.project-context`); вывод чистый — без падений и без предупреждений Vue, кроме тех, что тест ловит сам.

## Review Focus

1. Страница передаёт старое имя `color="green"`: цвета нет, одно предупреждение Vue, компонент не падает — у `ActionButton`, `InfoPill`, `ActionPill`, `Dot` и в `actions`. Тесты — Task 1 и Task 3.
2. `<action-button @click.prevent="save">` и `type="submit"` в форме: `save` вызван, ошибок нет, `.prevent` отменяет отправку формы. Тест — Task 3.
3. Выключенная кнопка-ссылка: нет `href`, клик не уходит в `navigate`, `click` не летит. Тест — Task 3.
4. `isDisabled` меняется на лету (страница выключает кнопку на время запроса): `disabled`, прозрачность и наведение переключаются туда и обратно. Тест — Task 3.
5. Неизвестная иконка у `ActionPill`: пилюля без иконки и без пустого блока 16 px. Тест — Task 2.

---

### Task 1: Двенадцать цветов

Переименование атомарно: после задачи в `src/`, `tests/` и `playground/` нет прежних имён, все тесты проходят.

**Files:**
- Modify: `src/colors.js`, `src/components/DropdownButtonWithAction.vue`, `src/components/ActionPill.vue` (умолчание `color`), `src/components/DataTable.vue:17`, `src/components/ElementHeader.vue:7-8`, строка 5 в `FormInput.vue`, `AmountForm.vue`, `AmountIntervalForm.vue`, `SelectSingleForm.vue`, `SelectMultipleForm.vue`, `SelectDateForm.vue`, `SelectDateIntervalForm.vue`, `SelectSingleCards.vue`, `SelectMultipleList.vue`; `playground/App.vue:637-638` и прочие имена цветов в демо
- Test: `tests/colors.test.js`; прежние имена в `tests/{InfoPill,ActionPill,Dot,DataTable,DropdownButtonWithAction,HamburgerMenu,FormInput,SelectSingleCards,SelectMultipleList,SelectSingleWrappers,SelectMultipleWrappers,SelectDateWrappers,SelectDateIntervalWrappers}.test.js`, `tests/ssrFixtures.js`

**Interfaces:**
- Produces: `COLORS: Record<ColorName, { pill, pillHover, button, buttonHover, menuItem, mark: string }>`, `COLOR_NAMES` в порядке Global Constraints, `isColor(name: unknown): boolean`, `colorClass(name, part): string` — сигнатуры прежние.

- [ ] **Step 1: Переписать `tests/colors.test.js`**

- `PARTS = ['pill', 'pillHover', 'button', 'buttonHover', 'menuItem', 'mark']`; `COLOR_NAMES` равен списку Global Constraints.
- Схема бледного, `name = <c>-pale`:
  `pill: bb:bg-<c>-100 bb:text-<c>-800`, `pillHover: bb:hover:text-<c>-600`, `button: bb:bg-<c>-100 bb:border-<c>-300 bb:text-<c>-800`, `buttonHover: bb:hover:bg-<c>-200`, `menuItem: bb:bg-<c>-100 bb:text-<c>-800 bb:hover:bg-<c>-200 bb:focus:bg-<c>-200`, `mark: bb:text-<c>-500`.
- Схема яркого, `name = <c>-solid`, `[base, dark, text]` из таблицы `SOLID = { gray: [500, 600, 'bb:text-white'], green: [600, 700, 'bb:text-white'], yellow: [300, 400, 'bb:text-yellow-950'], red: [600, 700, 'bb:text-white'], indigo: [500, 600, 'bb:text-white'], purple: [500, 600, 'bb:text-white'] }`:
  `pill: bb:bg-<c>-<base> <text>`, `pillHover: bb:hover:bg-<c>-<dark>`, `button: bb:bg-<c>-<base> bb:border-<c>-<dark> <text>`, `buttonHover: bb:hover:bg-<c>-<dark>`, `menuItem: bb:bg-<c>-<base> <text> bb:hover:bg-<c>-<dark> bb:focus:bg-<c>-<dark>`, `mark: bb:text-<c>-500`.
- `isColor` отклоняет `'green'`, `'red'`, `'purple'`, `'green-light'`, `'blue'`, `''`, `null`, `undefined`, `42`, `'toString'`, `'__proto__'`.
- `colorClass('red-pale', 'pill')` — `'bb:bg-red-100 bb:text-red-800'`; `colorClass('red', 'pill')` — `''`.

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run --dir tests tests/colors.test.js`
Expected: FAIL — имена прежние.

- [ ] **Step 3: Реализовать**

- `colors.js`: двенадцать записей литералами по схемам шага 1; комментарий модуля — набор `buttonHover` (наведение кнопки и стрелки, не берётся у выключенной кнопки), два вида цвета.
- `DropdownButtonWithAction.vue`: основная кнопка и стрелка берут `colorClass(mainColor, 'button')` и `colorClass(mainColor, 'buttonHover')`; вид без цвета не меняется.
- `ActionPill` — умолчание `'purple-pale'`; плашка `DataTable` — `indigo-pale`; точки `ElementHeader` и девяти полей — `red-pale`.
- Тесты и фикстуры: прежнее имя `<c>` → `<c>-pale`, ожидаемые классы те же. Playground: `colors` — `COLOR_NAMES` по порядку; `stripeRows` — `null` и двенадцать имён; прочие имена в демо → `-pale`.

- [ ] **Step 4: Проверить, что прежних имён не осталось**

Run: `grep -rnE "(color[=:] *|['\"])(gray|green|yellow|red|indigo|purple)['\"]" src tests playground/App.vue`
Expected: пусто.

- [ ] **Step 5: Прогнать тесты**

Run: `npx vitest run --dir tests`
Expected: PASS, предупреждений Vue нет — в том числе у скрытых точек обязательности (`FormInput.test.js` монтирует поле без `isRequired`).

- [ ] **Step 6: Закоммитить**

```bash
git add src tests playground/App.vue
git commit -m "feat!: заменить список цветов на яркие и бледные"
```

### Task 2: Общий список иконок

**Files:**
- Create: `src/components/icons/BankTransfer.vue`, `src/components/icons/CurrencyExchange.vue`
- Modify: `src/actionIcons.js`, `src/components/ActionIcon.vue` (комментарий), `src/components/icons/Download.vue`, `src/components/icons/Refresh.vue`, `src/components/ActionPill.vue`, `src/menuItems.js` (комментарий)
- Test: `tests/ActionIcon.test.js`, `tests/ActionPill.test.js`

**Interfaces:**
- Produces: `ACTION_ICONS` с ключами `plus`, `download`, `refresh`, `bank-transfer`, `currency-exchange` (в этом порядке); `isActionIcon` — прежняя сигнатура.

- [ ] **Step 1: Написать падающие тесты**

- `ActionIcon.test.js`: `Object.keys(ACTION_ICONS)` равен списку Global Constraints; существующий `it.each(Object.keys(ACTION_ICONS))` сторожа размера покрывает новые имена; путь `bank-transfer` — `M2 9l10-7 10 7H2zM4.5 12v6M9.5 12v6M14.5 12v6M19.5 12v6M3.5 18h17M2 22h20`, `currency-exchange` — `M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4`; у обеих `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.
- `ActionPill.test.js`: `it.each(Object.keys(ACTION_ICONS))` — пилюля рисует `svg` иконки (тот же `path`, что у `ActionIcon`), предупреждений нет; `icon: 'pin'` — предупреждение о пропе, в кнопке нет `svg` и нет пустого блока 16 px (`span.bb\\:w-4`); при `isLoading` — часы, а не иконка.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run --dir tests tests/ActionIcon.test.js tests/ActionPill.test.js`
Expected: FAIL — в списке одно имя.

- [ ] **Step 3: Реализовать**

- Новые иконки — по образцу `Plus.vue`: без класса размера, `aria-hidden="true"`, пути шага 1.
- `Download.vue`, `Refresh.vue`: убрать `class="bb:w-4 bb:h-4"`, комментарий «размер задаёт ActionIcon». `Clock.vue` не меняется.
- `actionIcons.js`: пять имён; верхний комментарий — список общий для `ActionButton`, `ActionPill` и меню.
- `ActionPill.vue`: валидатор `icon` — `isActionIcon`; вместо веток `download-icon`/`refresh-icon` — `<action-icon v-else-if="hasIcon" :name="icon"/>`, `hasIcon` — `isActionIcon(this.icon)`; локальный список и импорты `Download`/`Refresh` убрать.

- [ ] **Step 4: Прогнать тесты**

Run: `npx vitest run --dir tests`
Expected: PASS.

- [ ] **Step 5: Закоммитить**

```bash
git add src tests
git commit -m "feat: добавить иконки перевода и обмена валют в общий список"
```

### Task 3: Компонент ActionButton

**Files:**
- Create: `src/components/ActionButton.vue`, `tests/ActionButton.test.js`
- Modify: `src/index.js`, `tests/exports.test.js`, `tests/ssrFixtures.js`, `tests/keyboardNavigation.test.js`, `tests/focusRing.test.js`

**Interfaces:**
- Consumes: `colorClass`, `isColor` (Task 1); `ActionIcon`, `isActionIcon` (Task 2); `withNavigation.followLink`.
- Produces: `ActionButton`, пропы `label: String (required)`, `color: String|null = null`, `icon: String|null = null`, `href: String|null = null`, `type: 'button'|'submit' = 'button'`, `isDisabled: Boolean = false`, внутренний `groupPart: null|'whole'|'start' = null`; событие `click(event: MouseEvent)`.

- [ ] **Step 1: Написать падающие тесты в `tests/ActionButton.test.js`**

Монтирование с `navigate` — как `inApp` в `tests/DropdownButtonWithAction.test.js:819`. Каждый тест ловит предупреждения Vue (`vi.spyOn(console, 'warn')`) и проверяет их число.

- `без цвета — белая кнопка type="button"`: корень `BUTTON`, `type="button"`, классы содержат токены вида без цвета и кнопки из Global Constraints и `bb:cursor-pointer`; подпись — `span` с `bb:pointer-events-none bb:cursor-default`, текст `label`; предупреждений нет.
- `it.each(COLOR_NAMES)('%s — наборы button и buttonHover')`: классы содержат все токены `colorClass(name, 'button')` и `colorClass(name, 'buttonHover')`, нет `bb:bg-white`.
- `it.each(['green', 'blue', 'constructor'])('%s — без цвета и одно предупреждение')`; `it.each([null, ''])` — без цвета и без предупреждений.
- `it.each(Object.keys(ACTION_ICONS))('%s — иконка слева от подписи')`: первый дочерний элемент — `svg` `aria-hidden="true"`, второй — подпись; `icon: 'pin'` — одно предупреждение, `svg` нет; `icon: ''` и `null` — без иконки и без предупреждений.
- `click передаёт MouseEvent`: `trigger('click')` → `emitted('click')[0][0]` — `MouseEvent`.
- `@click.prevent работает`: родитель `<action-button label="Создать" @click.prevent="onClick"/>`, клик → `onClick` вызван один раз, ошибок нет.
- `type="submit" в форме`: `type="submit"`; родитель `<form @submit="onSubmit"><action-button label="Войти" type="submit" @click.prevent="onClick"/></form>` — `onClick` вызван, `onSubmit` нет; `type: 'reset'` — одно предупреждение, `type="button"`.
- `ссылка`: `href: '/users/create'` → корень `A` с этим `href`, без `type` и `disabled`; клик уходит в `navigate` (`navigation` равен `['/users/create']`), `emitted('click')` нет; `href: ''` и `null` — кнопка.
- `выключенная`: `isDisabled: true` → `disabled`, `bb:opacity-50 bb:cursor-not-allowed`, нет `bb:cursor-pointer` и токенов наведения (`bb:hover:bg-gray-50`; с `color: 'green-solid'` — нет `bb:hover:bg-green-700`); клик — `emitted('click')` нет.
- `выключенная ссылка`: `href` и `isDisabled` → корень `BUTTON` `disabled`, атрибута `href` нет, `navigation` пуст, `emitted('click')` нет.
- `isDisabled на лету`: `setProps({ isDisabled: true })` и обратно `false` — `disabled`, прозрачность и токены наведения переключаются, после возврата клик снова даёт `click`.
- `атрибуты на корень`: `class="bb:w-full"`, `data-dialog-focus` — на корневом элементе и у кнопки, и у ссылки.
- `groupPart`: `'start'` — `bb:rounded-l-md bb:focus:z-10`, нет `bb:rounded-md` и `bb:shadow-xs`; `'whole'` — `bb:rounded-md bb:focus:z-10`, нет `bb:shadow-xs`.

Ещё:
- `keyboardNavigation.test.js` — случаи «ActionButton — кнопка с иконкой» и «ActionButton — ссылка с иконкой» (`label: null`);
- `focusRing.test.js` — носитель `['ActionButton.vue', 'bb:focus:focus-ring', 1]`;
- `exports.test.js` — `ActionButton` в списке экспорта;
- `ssrFixtures.js` — `ActionButton: { props: { label: 'Создать', color: 'green-solid', icon: 'plus' } }`.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run --dir tests tests/ActionButton.test.js tests/exports.test.js`
Expected: FAIL — компонента нет.

- [ ] **Step 3: Реализовать `src/components/ActionButton.vue`**

- Миксины `withColors`, `withNavigation`; `emits: ['click']`.
- Два корня через `v-if`: `<a>` при непустом `href` и `!isDisabled`, иначе `<button :type :disabled>`. У ссылки `@click="followLink($event, href)"`, у кнопки `@click="$emit('click', $event)"`.
- Классы: общие с `bb-dashboard-ui bb:relative bb:inline-flex bb:items-center bb:whitespace-nowrap` и токенами Global Constraints; скругление и тень по `groupPart` (`null` — `bb:rounded-md bb:shadow-xs`; `'whole'` — `bb:rounded-md bb:focus:z-10`; `'start'` — `bb:rounded-l-md bb:focus:z-10`); цвет — `colorClass(color, 'button')` или вид без цвета; наведение — `colorClass(color, 'buttonHover')` или `bb:hover:bg-gray-50`, только у включённой.
- Валидаторы: `color` — `null`, `''` или `isColor`; `icon` — `null`, `''` или `isActionIcon`; `type` — `'button'`, `'submit'`; `groupPart` — `null`, `'whole'`, `'start'`. Неверный `type` рисуется как `'button'`.
- Комментарий: `groupPart` — внутренний проп для `DropdownButtonWithAction`, в README не описан.
- `src/index.js`: экспорт `ActionButton` перед `ActionPill`.

- [ ] **Step 4: Прогнать тесты**

Run: `npx vitest run --dir tests`
Expected: PASS, включая `ssr.test.js`, `hydration.test.js`, `utilityPrefix.test.js`.

- [ ] **Step 5: Закоммитить**

```bash
git add src tests
git commit -m "feat: добавить компонент ActionButton"
```

### Task 4: ConfirmationModal на ActionButton

**Files:**
- Modify: `src/components/ConfirmationModal.vue:24-46`
- Test: `tests/ConfirmationModal.test.js`, `tests/focusRing.test.js`

**Interfaces:**
- Consumes: `ActionButton` (Task 3).

- [ ] **Step 1: Написать падающие тесты**

- `кнопка действия — red-solid у dangerous, yellow-solid у warning`: у кнопки с `actionButtonText` токены `colorClass('red-solid', 'button')` / `colorClass('yellow-solid', 'button')`; у жёлтой `bb:text-yellow-950`.
- `отмена — ActionButton без цвета с data-dialog-focus`: `bb:bg-white bb:border-gray-300 bb:text-gray-700`, атрибут `data-dialog-focus`, текст «Отмена».
- `клики`: действие → одно `actionConfirmed`, отмена → одно `actionCanceled`, ошибок нет.
- `focusRing.test.js`: строка `ConfirmationModal.vue` удаляется — носитель теперь `ActionButton`.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run --dir tests tests/ConfirmationModal.test.js`
Expected: FAIL — классы прежние.

- [ ] **Step 3: Реализовать**

Обе кнопки — `<action-button class="bb:ml-3" @click.prevent="…">`: действие `:label="actionButtonText"`, `:color` — `'red-solid'` при `isDangerous`, `'yellow-solid'` при `isWarning`, иначе `null`; отмена `data-dialog-focus`, `:label="cancelButtonText ?? texts.cancel"`. Комментарий о фокусе на отмене сохраняется.

- [ ] **Step 4: Прогнать тесты**

Run: `npx vitest run --dir tests`
Expected: PASS — все существующие тесты фокуса `ConfirmationModal` без изменений.

- [ ] **Step 5: Закоммитить**

```bash
git add src tests
git commit -m "feat: перевести кнопки ConfirmationModal на ActionButton"
```

### Task 5: Основная кнопка DropdownButtonWithAction на ActionButton

**Files:**
- Modify: `src/components/DropdownButtonWithAction.vue:4-37`
- Test: `tests/DropdownButtonWithAction.test.js`, `tests/focusRing.test.js`, `tests/keyboardNavigation.test.js`

**Interfaces:**
- Consumes: `ActionButton` с `groupPart` (Task 3).

- [ ] **Step 1: Написать падающие тесты**

- `основная кнопка — ActionButton`: `findComponent(ActionButton)` есть; без меню `groupPart` `'whole'`, с меню `'start'`; у основной кнопки нет `bb:shadow-xs`, у обёртки есть.
- `it.each(['green-solid', 'yellow-solid'])` — основная и стрелка с токенами `colorClass(c, 'button')` и `colorClass(c, 'buttonHover')`.
- `focusRing.test.js`: `DropdownButtonWithAction.vue` — один носитель (стрелка).
- Существующие тесты основной кнопки (переход через `navigate`, `onSelect`, отказ `onSelect` уходит в обработчик ошибок Vue, иконка, цвета) проходят без изменения смысла; поиск основной кнопки в помощнике `mainOf` при необходимости обновить.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run --dir tests tests/DropdownButtonWithAction.test.js`
Expected: FAIL — `ActionButton` не найден.

- [ ] **Step 3: Реализовать**

Ветки `<a>`/`<button>` основной кнопки заменить одной `<action-button :label="mainAction.label" :color="mainColor" :icon="mainIcon" :href="isLink(mainAction) ? mainAction.href : null" :group-part="hasMenu ? 'start' : 'whole'" @click="select(mainAction)"/>`; `select` по-прежнему возвращает результат `onSelect`. Комментарии о главной кнопке обновить: переход и клик выполняет `ActionButton`.

- [ ] **Step 4: Прогнать тесты**

Run: `npx vitest run --dir tests`
Expected: PASS.

- [ ] **Step 5: Закоммитить**

```bash
git add src tests
git commit -m "feat: перевести основную кнопку DropdownButtonWithAction на ActionButton"
```

### Task 6: Playground, браузерные тесты, README

**Files:**
- Modify: `playground/App.vue`, `README.md`
- Create: `e2e/actionButton.e2e.js`

- [ ] **Step 1: Раздел Playground `ActionButton`** (над `ActionPill и downloadFile`)

Кнопка без цвета; двенадцать цветов по `COLOR_NAMES`; каждая иконка списка; ссылка `href="#create"` (счётчик переходов, как у меню); выключенные — без цвета, `green-solid`, `green-pale`, переключатель «isDisabled»; форма с `type="submit"` и счётчиком отправок; подвал формы «Отмена» / «Создать» (`green-solid`). В разделах `ActionPill` и `DropdownButtonWithAction` — пример яркого цвета и иконок `bank-transfer`, `currency-exchange`. Таблица «Цвета» — двенадцать строк.

- [ ] **Step 2: Браузерные тесты `e2e/actionButton.e2e.js`**

- высота `ActionButton` 38 px и равна высоте основной кнопки `DropdownButtonWithAction`; иконка 16 × 16 px;
- ссылка: клик уходит в `navigate` (счётчик), страница не перезагружается;
- выключенная: клик не меняет счётчик; после переключателя — меняет;
- `ConfirmationModal`: после открытия кнопкой фокус на «Отмене» и кольцо видно (`expectFocusRing` из `e2e/helpers.js`);
- `consoleProblems` пуст.

Run: `npm run test:browser`
Expected: все тесты проходят в Chromium и WebKit.

- [ ] **Step 3: README**

- «Компоненты»: `ActionButton` в перечне, «тридцать четыре»; раздел `ActionButton` перед `ActionPill` — пример спеки §6.1, таблица пропов §6.2 (без `groupPart`), событие `click` с `MouseEvent` и `.prevent`, ссылка, выключенная ссылка, атрибуты на корне.
- «Цвета»: двенадцать имён; таблица §4.3; оттенки ярких §4.2.
- Новый раздел «Иконки» после «Цвета»: пять имён, кто берёт список, размер 16 px.
- Разделы `InfoPill`, `ActionPill` (иконки — любое имя списка), `Dot`, `DataTable`, `DropdownButtonWithAction`, `HamburgerMenu`, `ConfirmationModal` (жёлтая кнопка с тёмным текстом): новые имена в примерах и таблицах.
- «Playground»: «тридцатью четырьмя».
- Над «Обновление с 0.22» — «Обновление с 0.23» по спеке §8: пометка о несовместимости, таблица `gray → gray-pale` … `purple → purple-pale`, где искать имена, `rowStripe` молча, вид `ConfirmationModal type="warning"`, `ActionButton` и новые иконки по желанию.

Run: `grep -nE "\`(gray|green|yellow|red|indigo|purple)\`|color[=:] *['\"](gray|green|yellow|red|indigo|purple)['\"]" README.md`
Expected: только таблица замены в «Обновление с 0.23» и разделы старых версий.

- [ ] **Step 4: Закоммитить**

```bash
git add playground/App.vue e2e/actionButton.e2e.js README.md
git commit -m "docs: описать ActionButton, цвета и иконки, показать в Playground"
```

### Task 7: Приёмка и выпуск

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Проверить ветку**

Run: `npx vitest run --dir tests && npm run build && npm run test:browser`
Expected: всё проходит, вывод чистый.

- [ ] **Step 2: Принять в Playground**

Chrome — исполнитель, Safari — владелец: двенадцать цветов на кнопке, пункте меню и пилюле; новые иконки рядом с прежними; `ConfirmationModal` обоих типов; подсказки расширений клавиатурной навигации на `ActionButton`. Ссылку владельцу давать после проверки, что страница отвечает 200.

- [ ] **Step 3: Поднять версию после итогового ревью и приёмки владельца**

Run: `npm version 0.24.0 --no-git-tag-version`
Expected: `0.24.0` в `package.json` и `package-lock.json`.

- [ ] **Step 4: Закоммитить**

```bash
git add package.json package-lock.json
git commit -m "chore: поднять версию до 0.24.0"
```

Слияние, тег `v0.24.0` и публикация — только по слову владельца.
