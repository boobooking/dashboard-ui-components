# SelectSingleCards и SelectMultipleList, выпуск `0.21.0` — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** два публичных поля формы пакета — карточки с выбором одного варианта (`SelectSingleCards`) и список галочек (`SelectMultipleList`), сделанные по форме мероприятия russia. Выпуск `0.21.0`.

**Architecture:**

- **Раскладка по колонкам** — новый внутренний модуль `src/columns.js`: число колонок из пропа и место каждого пункта в CSS Grid (`grid-column`, `grid-row`) через `:style`. Оба компонента берут его.
- **Компоненты** — два SFC вида `SelectSingleForm`: подпись с точкой и под ней сетка пунктов. Внутри пунктов — родные `input type="radio"` / `type="checkbox"`. Вид кружка, квадрата и галочки рисует сам компонент: ресет пакета делает у всех `input` `appearance: none`.
- **Значение задаёт только проп.** После каждого выбора компонент через `$nextTick` сверяет `checked` всех своих `input` с `modelValue`: родной переключатель меняет `checked` сам, а Vue трогает DOM, только когда меняется проп.

**Tech Stack:** Vue 3.5 (Options API, SFC), vitest + happy-dom, @vue/test-utils 2, Vite (library mode), Tailwind 4 с префиксом `bb`, @playwright/test 1.63.0 (Chromium, WebKit), chrome-devtools MCP, GitHub Actions, npm.

**Spec:** `docs/superpowers/specs/2026-10-21-select-cards-list-design.md` (согласована с Codex, коммит `1a2bf40`).

## Global Constraints

- **Рабочая копия:** основная, `/Users/boobooking/Code/dashboard-ui-components`, ветка `feature/select-cards-list`; все команды — из неё. Ветка не пушится.
- **Публикация** (слияние в `main`, тег `v0.21.0`, пуш `main` и тега) — только после явного согласия Тима на этом шаге (Task 7).
- **Имена и API** — спека §4.1:
  - `SelectSingleCards`: `items` (`Array`, обяз.), `modelValue` (`[String, Number, Boolean]` именно в этом порядке, `default: null`), `label` (`String`, обяз.), `isRequired` (`Boolean`, `false`), `columns` (`Number`, `default: 2`, `validator: isColumnCount`); события `update:modelValue`, `changed`.
  - `SelectMultipleList`: те же, но `modelValue` — `Array`, `default: () => []`.
  - Порядок типов `[String, Number, Boolean]` важен: если `Boolean` стоит раньше `String`, Vue превращает `modelValue=""` в `true`.
- **Нет `lang` и новых текстов:** `src/i18n.js` не меняется.
- **Цвета выбора** — классы самого компонента (`indigo`), в `src/colors.js` не идут (спека §5.1).
- **Утилиты:** каждая — с префиксом `bb:`; в `:class` — только литералы. Это проверяет `tests/utilityPrefix.test.js`. Геометрия сетки — через `:style`, не классами.
- **Фокус:** только утилита `focus-ring`, только с клавиатуры. У карточки — `bb:has-focus-visible:focus-ring` на `label`, у галочки — `bb:focus-visible:focus-ring` на `input`. `bb:focus:outline-hidden` не ставится.
- **Стиль кода:**
  - в `.vue` — двойные кавычки и точки с запятой в `<script>`, Options API, отступ 4 пробела;
  - в `.js` тестов — одинарные кавычки без точек с запятой;
  - комментарии по-русски и описывают код как он есть; существующие сохраняются, ставший ложным правится.
- **Тесты:**
  - unit — `npm test -- --dir tests`; база на `1a2bf40`: `Test Files 50 passed (50)`, `Tests 1260 passed (1260)`;
  - браузерные — `npm run test:browser` (macOS, Chromium и WebKit).
- **Чистый вывод:** `npm test -- --dir tests --reporter=verbose > $W/<имя>.log 2>&1`, затем `grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/<имя>.log` — ожидается `0`. `W=/Users/boobooking/Code/dashboard-ui-components/.superpowers/sdd/2026-10-21-select-cards-list` (папка `sdd` в `.gitignore`).
- **Во всех unit-тестах компонентов** ошибки и предупреждения Vue собираются через `global.config.errorHandler` / `warnHandler` и проверяются пустыми, кроме тестов, которые их ждут, — как `mountWrapper` в `tests/SelectSingleWrappers.test.js`.
- **Коммиты:** conventional commits по-русски, в повелительном наклонении, без служебных строк и упоминаний инструментов; `--no-verify` запрещён.
- **Отклонения:** если план или спеку нельзя выполнить как написано — остановиться и доложить отклонение с доказательствами; план не менять.

## Review Focus

1. **Родитель не принял значение** (обработчик `update:modelValue` не меняет проп): выбранной остаётся прежняя карточка, галочка остаётся снятой — и по виду, и по `input.checked`. Тесты — Task 2 и Task 3.
2. **Булевы и нулевые `id`** (`true` / `false`, `0`): выбор по строгому `===`, в событие уходит `id` того же типа, `modelValue=""` не превращается в `true`. Тесты — Task 2.
3. **`@tailwindcss/forms` приложения** в `host.html`: у отмеченной галочки `background-image: none`, у карточек нет родного кружка. Тест — Task 4.
4. **Пункты сменились при выбранном значении** (`setProps({ items })` с другим числом пунктов): раскладка пересчитывается, ошибок нет. Тест — Task 2.
5. **Два компонента на странице:** разные `id` подписей и разные `name` групп карточек, стрелки не уходят в чужую группу. Тесты — Task 2 (unit) и Task 4 (e2e).

---

### Task 1: Раскладка по колонкам

**Files:**
- Create: `src/columns.js`
- Test: `tests/columns.test.js`

**Interfaces:**
- Produces:
  - `DEFAULT_COLUMNS = 2`;
  - `isColumnCount(value): boolean` — `Number.isInteger(value) && value >= 1`; это `validator` пропа `columns`;
  - `columnCount(value): number` — `value`, если `isColumnCount(value)`, иначе `DEFAULT_COLUMNS`;
  - `gridTemplate(columns: number): { gridTemplateColumns: string }` — `repeat(<columns>, minmax(0, 1fr))`;
  - `gridPlacement(count: number, columns: number): Array<{ gridColumn: number, gridRow: number }>` — место пункта по индексу, нумерация с 1.

- [ ] **Step 1: Write the failing test** `tests/columns.test.js` (`// @vitest-environment node`):

```js
const at = (column, row) => ({ gridColumn: column, gridRow: row })

it.each([
    [14, 2, [...[1, 2, 3, 4, 5, 6, 7].map((row) => at(1, row)), ...[1, 2, 3, 4, 5, 6, 7].map((row) => at(2, row))]],
    [14, 3, [...[1, 2, 3, 4, 5].map((row) => at(1, row)), ...[1, 2, 3, 4, 5].map((row) => at(2, row)), ...[1, 2, 3, 4].map((row) => at(3, row))]],
    [4, 3, [at(1, 1), at(1, 2), at(2, 1), at(3, 1)]],
    [2, 2, [at(1, 1), at(2, 1)]],
    [2, 3, [at(1, 1), at(2, 1)]],
    [1, 2, [at(1, 1)]],
    [0, 2, []],
])('%i пунктов в %i колонки', (count, columns, expected) => {
    expect(gridPlacement(count, columns)).toEqual(expected)
})

it.each([[3, 3], [1, 1], [0, 2], [-1, 2], [1.5, 2], [null, 2], [undefined, 2], ['3', 2]])('columnCount(%j) — %i', (value, expected) => {
    expect(columnCount(value)).toBe(expected)
})

it('gridTemplate', () => {
    expect(gridTemplate(3)).toEqual({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' })
})
```

Плюс `isColumnCount`: `true` для `1`, `2`; `false` для `0`, `-1`, `1.5`, `null`, `'3'`.

- [ ] **Step 2:** `npm test -- tests/columns.test.js` — FAIL: модуля нет.
- [ ] **Step 3: Implement `src/columns.js`.** Колонки идут по очереди. Первые `count % columns` колонок получают `Math.ceil(count / columns)` пунктов, остальные — `Math.floor(count / columns)`. В колонке строки идут с 1. Комментарий над модулем: внутренний модуль пакета, правило раскладки спеки §4.3.
- [ ] **Step 4:** `npm test -- tests/columns.test.js` — PASS.
- [ ] **Step 5: Commit** — `git add src/columns.js tests/columns.test.js && git commit -m "feat: добавить раскладку пунктов по колонкам"`.

---

### Task 2: `SelectSingleCards`

**Files:**
- Create: `src/components/SelectSingleCards.vue`, `tests/SelectSingleCards.test.js`
- Modify: `src/index.js` (экспорт после `SelectSingleForm`), `tests/exports.test.js` (двадцать пять компонентов, `SelectSingleCards` в списке), `tests/ssrFixtures.js`, `tests/focusRing.test.js`

**Interfaces:**
- Consumes: `src/columns.js` из Task 1; `Dot` (`src/components/Dot.vue`).
- Produces: компонент `SelectSingleCards` с API из Global Constraints. Разметка, на которую опираются Task 4 и Task 5:
  - корень `div.bb-dashboard-ui`;
  - сетка `div[role="radiogroup"][aria-labelledby]`;
  - карточка — `label`, внутри `input[type="radio"]` на всю карточку и надпись пункта.

- [ ] **Step 1: Write the failing tests** `tests/SelectSingleCards.test.js` (`// @vitest-environment happy-dom`, `attachTo: document.body`, `enableAutoUnmount(afterEach)`). Пункты `items = [{ id: 'rc', name: 'Royal Canin' }, { id: 'eukanuba', name: 'Eukanuba' }]`. Тесты:
  - **подпись и точка:** текст подписи `Бренд`; `Dot` с `color: 'red'` скрыт (`style.display === 'none'`), с `isRequired: true` виден; `label: null` — пустая подпись без ошибок;
  - **группа:** `[role="radiogroup"]` имеет `aria-labelledby`, равный `id` подписи, и классы `bb:mt-2 bb:grid bb:gap-3`; у двух смонтированных компонентов разные `id` подписей и разные `name` у `input`; внутри одного компонента `name` у всех `input` один;
  - **вид:**
    - выбранная карточка (`modelValue: 'eukanuba'`) — классы `bb:border-indigo-500 bb:bg-indigo-50`, кружок `bb:border-indigo-600` с точкой `bb:bg-indigo-600`, `input.checked === true`;
    - невыбранная — `bb:border-gray-300 bb:bg-white bb:hover:bg-gray-50`, кружок `bb:border-gray-400` без точки;
    - у кружка и надписи — `bb:pointer-events-none bb:cursor-default`;
    - у `input` — `bb:absolute bb:inset-0 bb:size-full bb:cursor-pointer bb:opacity-0`;
  - **без значения** (проп не передан): ни одна карточка не выбрана, ни один `input` не отмечен;
  - **выбор:** клик (`trigger('click')`) по `input` «Eukanuba» → `emitted('update:modelValue')` `[['eukanuba']]`, `emitted('changed')` `[[]]`; клик по надписи карточки выбирает так же;
  - **клик по выбранной** ничего не эмитит;
  - **родитель принял значение:** монтирование с `'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value })`, клик по «Eukanuba», `await flushPromises()` → карточка «Eukanuba» выбрана по классам и по `checked`, «Royal Canin» — нет;
  - **родитель не принял** (`modelValue: 'rc'`, обработчика нет): клик по «Eukanuba», `await flushPromises()` → `checked` у «Royal Canin» `true`, у «Eukanuba» `false`, классы выбора — у «Royal Canin»;
  - **булевы и нулевые `id`:**
    - пункты `[{ id: true, name: 'СМС' }, { id: false, name: 'Промо' }]`, `modelValue: true` → выбрана первая; клик по второй → `[[false]]` (строго `false`, не `'false'`);
    - пункты `[{ id: 0, name: 'Ноль' }, { id: 1, name: 'Один' }]` с `modelValue: 0` → выбрана «Ноль»;
    - `modelValue: ''` → `wrapper.props('modelValue') === ''`, ни одна не выбрана;
  - **`modelValue` вне пунктов** (`'other'`) — ни одна не выбрана, ошибок нет;
  - **раскладка:**
    - сетка `style.gridTemplateColumns === 'repeat(2, minmax(0, 1fr))'`;
    - с `columns: 3` и четырьмя пунктами карточки стоят в `style.gridColumn` / `style.gridRow` `1/1, 1/2, 2/1, 3/1`;
    - порядок карточек в DOM — порядок массива;
    - `setProps({ items: <четыре пункта> })` при выбранном значении пересчитывает места без ошибок;
  - **неверное `columns`:**
    - `0`, `-1`, `1.5`, `'3'` → `repeat(2, …)` и ровно одно предупреждение Vue;
    - `null` → `repeat(2, …)` без предупреждений;
  - **пустые `items`:** `[]`, `null`, `'x'` (не массив) → нет `[role="radiogroup"]`, подпись есть; `[null, 5, { id: 'rc', name: 'Royal Canin' }]` → одна карточка;
  - **атрибуты:** `class="ml-2"` и `data-x="1"` — на корне.
- [ ] **Step 2:** `npm test -- tests/SelectSingleCards.test.js` — FAIL: компонента нет.
- [ ] **Step 3: Implement `src/components/SelectSingleCards.vue`.**
  - Строка подписи — как в `SelectSingleForm.vue`: `span :id="labelId"` с `v-text="label ?? ''"` и `Dot`.
  - `setup()` возвращает `labelId: useId()` и `groupName: useId()`.
  - `computed`:
    - `itemList` — как в `SelectMultiple.vue`;
    - `gridStyle` — `gridTemplate(columnCount(this.columns))`;
    - `itemStyles` — `gridPlacement(this.itemList.length, columnCount(this.columns))`.
  - `methods`:
    - `isSelected(item)` — `item.id === this.modelValue`;
    - `itemName(item)` — `String(item.name ?? "")`;
    - `async select(item)` — `$emit("update:modelValue", item.id)`, `$emit("changed")`, `await this.$nextTick()`, `syncChecked()`;
    - `syncChecked()` — каждому `input` из `this.$el.querySelectorAll("input")` (порядок DOM = `itemList`) ставит `checked = this.isSelected(item)`. Комментарий: зачем сверка (Architecture, третий пункт).

  Разметка сетки — решения спеки §5.1 и §7, классы ровно такие:

```html
<div v-if="itemList.length > 0" role="radiogroup" :aria-labelledby="labelId" class="bb:mt-2 bb:grid bb:gap-3" :style="gridStyle">
    <label
        v-for="(item, index) in itemList"
        :key="index"
        :style="itemStyles[index]"
        class="bb:relative bb:flex bb:items-start bb:p-3 bb:border bb:rounded-md bb:cursor-pointer bb:select-none bb:transition bb:has-focus-visible:focus-ring"
        :class="isSelected(item) ? 'bb:border-indigo-500 bb:bg-indigo-50' : 'bb:border-gray-300 bb:bg-white bb:hover:bg-gray-50'"
    >
        <input type="radio" :name="groupName" :checked="isSelected(item)" class="bb:absolute bb:inset-0 bb:size-full bb:cursor-pointer bb:opacity-0" @change="select(item)"/>
        <span class="bb:pointer-events-none bb:cursor-default bb:shrink-0 bb:mt-0.5 bb:size-4 bb:rounded-full bb:border-2 bb:flex bb:items-center bb:justify-center" :class="isSelected(item) ? 'bb:border-indigo-600' : 'bb:border-gray-400'">
            <span v-if="isSelected(item)" class="bb:size-2 bb:rounded-full bb:bg-indigo-600"/>
        </span>
        <span class="bb:pointer-events-none bb:cursor-default bb:ml-3 bb:text-sm bb:font-medium bb:text-gray-700" v-text="itemName(item)"/>
    </label>
</div>
```

  Комментарии в разметке:
  - `:key="index"`: `id` бывают булевыми и повторяться, а `checked` всё равно задаёт проп;
  - `input` прозрачный и лежит на всей карточке: клик в любом месте попадает в него, а подсказка Vimlike и Vimari одна и стоит на всей карточке;
  - кружок и надпись — `cursor-default` и `pointer-events-none`, как содержимое кнопок пакета (README, «Клавиатурная навигация»).

  Комментарий над компонентом — в духе `SelectSingleForm.vue`: что это, `isRequired` только рисует точку, `class` и атрибуты — на корне.
- [ ] **Step 4: Экспорт, SSR, фокус.**
  - `src/index.js` — `export { default as SelectSingleCards } from './components/SelectSingleCards.vue'` после `SelectSingleForm`.
  - `tests/exports.test.js` — заголовок теста «ровно двадцать пять компонентов, плагин и downloadFile», `SelectSingleCards` в списке по алфавиту.
  - `tests/ssrFixtures.js` — `SelectSingleCards: { props: { label: 'Бренд', items: [{ id: 'rc', name: 'Royal Canin' }, { id: 'eukanuba', name: 'Eukanuba' }], modelValue: 'eukanuba', isRequired: true } }`.
  - `tests/focusRing.test.js`:
    - в `carriers` — `['SelectSingleCards.vue', 'bb:has-focus-visible:focus-ring', 1]`;
    - в `buildCss()` — класс `bb:has-focus-visible:focus-ring`;
    - новый тест: правило `.bb\\:has-focus-visible\\:focus-ring:has(:focus-visible)` (так его компилирует Tailwind 4.3.3) содержит все `LINE_AND_HALO`.
- [ ] **Step 5:** `npm test -- --dir tests` — PASS: всё, включая `ssr.test.js`, `hydration.test.js`, `utilityPrefix.test.js`, `focusRing.test.js`. Чистый вывод — `grep` из Global Constraints даёт `0`.
- [ ] **Step 6: Commit** — `git add -A src tests && git commit -m "feat: добавить SelectSingleCards"`.

---

### Task 3: `SelectMultipleList`

**Files:**
- Create: `src/components/SelectMultipleList.vue`, `tests/SelectMultipleList.test.js`
- Modify: `src/index.js` (экспорт после `SelectMultipleForm`), `tests/exports.test.js` (двадцать шесть), `tests/ssrFixtures.js`, `tests/focusRing.test.js`, `src/styles/index.css` (комментарий у `appearance: none`)

**Interfaces:**
- Consumes: `src/columns.js` (Task 1); строку подписи, `itemList`, `itemName`, `gridStyle`, `itemStyles`, `syncChecked` — так же, как в `SelectSingleCards` (Task 2).
- Produces: компонент `SelectMultipleList`. Разметка для Task 4 и 5:
  - корень `div.bb-dashboard-ui`;
  - сетка `div[role="group"][aria-labelledby]`;
  - пункт — `label`, в нём `input[type="checkbox"]` и надпись.

- [ ] **Step 1: Write the failing tests** `tests/SelectMultipleList.test.js`. Пункты — первые четыре участника russia: `future_owner` «Будущие владельцы», `doctor` «Ветеринарные врачи», `owner` «Владельцы», `volunteer` «Волонтёры». Тесты:
  - **подпись, точка, `label: null`, атрибуты на корне** — как в Task 2;
  - **группа:** `[role="group"]` с `aria-labelledby` на подпись, классы `bb:mt-1 bb:grid bb:gap-x-4 bb:gap-y-2`; у двух компонентов разные `id` подписей;
  - **вид:**
    - отмеченный пункт — `input` с классами `bb:border-indigo-600 bb:bg-indigo-600` и белой галочкой `svg` (`bb:fill-white`) рядом;
    - неотмеченный — `bb:border-gray-300 bb:bg-white`, галочки нет;
    - у каждого `input` — `bb:size-4 bb:rounded bb:border bb:bg-none bb:focus-visible:focus-ring`;
    - надпись — `bb:ml-3 bb:text-sm bb:font-medium bb:text-gray-700`;
  - **отметка:** `modelValue: ['doctor']`, клик по «Владельцы» → `[[['doctor', 'owner']]]`, затем `changed`;
  - **снятие:** клик по «Ветеринарные врачи» → `[[[]]]`;
  - **клик по надписи** отмечает так же;
  - **чужие `id` сохраняются:** `modelValue: ['gone', 'doctor']`, клик по «Владельцы» → `[[['gone', 'doctor', 'owner']]]`, снятие «Ветеринарные врачи» → `[[['gone']]]`;
  - **`modelValue: null`** — ничего не отмечено; клик → `[[['future_owner']]]`;
  - **родитель принял / не принял** — как в Task 2: принял — `checked` и галочка есть; не принял — `checked === false` и галочки нет;
  - **раскладка:** 4 пункта, `columns: 3` → места `1/1, 1/2, 2/1, 3/1`; по умолчанию `repeat(2, …)`;
  - **неверное `columns`, пустые `items`** — как в Task 2 (без пунктов нет `[role="group"]`).
- [ ] **Step 2:** `npm test -- tests/SelectMultipleList.test.js` — FAIL.
- [ ] **Step 3: Implement `src/components/SelectMultipleList.vue`.**
  - `selectedIds` — как в `SelectMultiple.vue` (не массив → `[]`).
  - `isChecked(item)` — `this.selectedIds.includes(item.id)`.
  - `async toggle(item)` — новый массив по правилу `SelectMultiple.itemClicked`: снятие — `filter`, отметка — `[...ids, item.id]`; затем `$emit("update:modelValue", …)`, `$emit("changed")`, `await this.$nextTick()`, `syncChecked()` (`checked = this.isChecked(item)`).
  - `setup()` — только `labelId: useId()`.

  Разметка пункта — решения спеки §6.1 и §8:

```html
<label v-for="(item, index) in itemList" :key="index" :style="itemStyles[index]" class="bb:flex bb:items-center">
    <span class="bb:relative bb:flex bb:shrink-0">
        <input type="checkbox" :checked="isChecked(item)" class="bb:size-4 bb:rounded bb:border bb:bg-none bb:focus-visible:focus-ring" :class="isChecked(item) ? 'bb:border-indigo-600 bb:bg-indigo-600' : 'bb:border-gray-300 bb:bg-white'" @change="toggle(item)"/>
        <svg v-if="isChecked(item)" class="bb:pointer-events-none bb:absolute bb:inset-0 bb:size-4 bb:fill-white" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"/>
        </svg>
    </span>
    <span class="bb:ml-3 bb:text-sm bb:font-medium bb:text-gray-700" v-text="itemName(item)"/>
</label>
```

  Комментарии:
  - `bb:bg-none` снимает галочку `@tailwindcss/forms` приложения у `:checked`: ресет пакета `background-image` не трогает;
  - галочка — та же, что у плагина (путь из `@tailwindcss/forms`).
- [ ] **Step 4: Экспорт, SSR, фокус, ресет.**
  - `src/index.js` — экспорт после `SelectMultipleForm`.
  - `tests/exports.test.js` — «ровно двадцать шесть компонентов…», `SelectMultipleList` в списке.
  - `tests/ssrFixtures.js` — `SelectMultipleList: { props: { label: 'Участники', items: [{ id: 'owner', name: 'Владельцы' }, { id: 'doctor', name: 'Ветеринарные врачи' }, { id: 'club', name: 'Клубы' }], modelValue: ['doctor'], columns: 2 } }`.
  - `tests/focusRing.test.js` — в `carriers` `['SelectMultipleList.vue', 'bb:focus-visible:focus-ring', 1]`.
  - `src/styles/index.css` — комментарий над `.bb-dashboard-ui input { appearance: none; }` говорит, что родной вид не нужен и галочкам с переключателями: их кружок, квадрат и галочку рисуют `SelectSingleCards` и `SelectMultipleList`. Правило не меняется.
- [ ] **Step 5:** `npm test -- --dir tests` — PASS, чистый вывод (`0`).
- [ ] **Step 6: Commit** — `git add -A src tests && git commit -m "feat: добавить SelectMultipleList"`.

---

### Task 4: Playground и браузерные тесты

**Files:**
- Modify: `playground/App.vue`
- Create: `e2e/selectCardsList.e2e.js`

**Interfaces:**
- Consumes: оба компонента (Task 2, 3), их разметку из блоков Produces; `test`, `expect`, `pages`, `openPlayground`, `expectColor` из `e2e/helpers.js`.

- [ ] **Step 1: Раздел Playground.** Сразу после раздела `FormInput` — `<section><h2>SelectSingleCards и SelectMultipleList</h2><div class="demo-form">…</div></section>`. Внутри по порядку:
  1. `form-input label="Название" v-model="eventName"`;
  2. `select-single-cards label="Бренд" :items="eventBrandItems" v-model="eventBrand" :is-required="eventBrand === null"`. Пункты `[{ id: 'rc', name: 'Royal Canin' }, { id: 'eukanuba', name: 'Eukanuba' }]`, значение `null`;
  3. `select-single-cards label="Способ валидации участника" :items="eventValidationItems" v-model="eventValidation"`. Пункты `[{ id: true, name: 'Самостоятельно через ввод кода СМС' }, { id: false, name: 'При помощи промо-персонала' }]`, значение `true`;
  4. `select-multiple-list label="Участники" :items="participantItems" v-model="eventParticipants" :is-required="eventParticipants.length === 0"`. Пункты — 14 участников russia в порядке `Create.vue` (`future_owner` … `referee`, подписи оттуда же), значение `[]`;
  5. `select-multiple-list label="Участники в три колонки" :items="participantItems" v-model="participantsThree" :columns="3"`;
  6. `select-multiple-list label="Четыре пункта в три колонки" :items="participantItems.slice(0, 4)" v-model="participantsFour" :columns="3"`;
  7. `<p>Выбрано: {{ JSON.stringify({ brand: eventBrand, validation: eventValidation, participants: eventParticipants }) }}</p>`.

  Компоненты регистрируются в `App.vue` так же, как остальные. Комментарий над разделом: копия формы мероприятия russia, «Название» стоит первым, чтобы Tab входил в карточки из поля.
- [ ] **Step 2: Write the browser tests** `e2e/selectCardsList.e2e.js` — цикл по `pages`, `openPlayground` в `beforeEach`.
  - Локаторы:
    - группа — `page.getByRole('radiogroup', { name: 'Бренд' })`, `getByRole('group', { name: 'Участники', exact: true })`;
    - пункт — `getByRole('radio' | 'checkbox', { name })`;
    - карточка — `page.locator('label', { has: <radio> })`;
    - строка значений — `page.getByText(/^Выбрано:/)`.
  - Тесты:
    1. Фокус в поле «Название» (`getByLabel('Название', { exact: true }).focus()`). Tab → фокус на «Royal Canin» (выбора нет — первая). Tab → на «Самостоятельно через ввод кода СМС» (выбранная). Tab → на «Будущие владельцы».
    2. Фокус на «Самостоятельно…», `ArrowDown` → «При помощи промо-персонала» отмечен и в фокусе; строка содержит `"validation":false`. Группа «Бренд» не изменилась (`"brand":null`).
    3. Tab из «Название» на «Royal Canin», `Space` → строка содержит `"brand":"rc"`, у карточки `expectColor(card, 'background-color', 'indigo-50')` и `expectColor(card, 'border-top-color', 'indigo-500')`.
    4. Фокус на «Будущие владельцы», `Space` → отмечен. Tab → фокус на «Ветеринарные врачи» (порядок массива), `Space`. Строка содержит `"participants":["future_owner","doctor"]`. `Space` ещё раз → `["future_owner"]`.
    5. Кольцо с клавиатуры: после Tab на «Royal Canin» у карточки `outline-style: solid`. После Tab на «Будущие владельцы» у `input` `outline-style: solid`.
    6. Мышь без кольца: после клика по надписи «Eukanuba» у этой карточки `outline-style: none`. После клика по надписи «Клубы» у её `input` `outline-style: none`, и он отмечен.
    7. Чужие стили не проступают: у отмеченного `input` «Клубы» `background-image: none` и `background-color` — `indigo-600` (`expectColor`). Тест идёт и в `host.html`, где подключён `@tailwindcss/forms`.
    8. Раскладка: у пунктов «Четыре пункта в три колонки» `boundingBox().x` трёх колонок различны. Второй пункт стоит под первым: `x` тот же, `y` больше. Третий и четвёртый стоят в строке первого: `y` тот же.
  - На то, что в Chromium и WebKit ведёт себя по-разному, тесты не опираются (спека §10): переход стрелкой с последней карточки, Shift+Tab в группу, фокус после клика.
- [ ] **Step 3:** `npm run test:browser` — новые тесты PASS в Chromium и WebKit на обеих страницах, прежние тоже. Консоль чистая: фикстура `consoleProblems`.
- [ ] **Step 4:** `npm test -- --dir tests` — PASS, чистый вывод.
- [ ] **Step 5: Commit** — `git add playground/App.vue e2e/selectCardsList.e2e.js && git commit -m "test: показать карточки и список галочек в Playground"`.

---

### Task 5: Приёмка — вид, расширения, Playground

Проверки идут в scratchpad сессии и в репозиторий не попадают. Если проверка выявила несоответствие спеке, исправление идёт в компонент с тестом, который сначала падает. Любое изменение решений спеки — отклонение: стоп и доклад.

- [ ] **Step 1: Сверка вида** (спека §14).
  - Стенд в scratchpad: vite с симлинком `node_modules` на пакет. CSS — `dist/style.css` пакета первым, затем Tailwind 4 с `@plugin '@tailwindcss/forms'`, как `playground/host.css`.
  - Рядом друг с другом:
    - разметка russia из спеки §2.1 и §2.2 в записи Tailwind 4: `shadow-sm` → `shadow-xs`, `flex-shrink-0` → `shrink-0`, `focus:ring-indigo-500` оставить;
    - `SelectSingleCards` и `SelectMultipleList` с теми же пунктами.
  - Состояния: карточки без выбора; с выбором; с надписью в две строки («Самостоятельно через ввод кода СМС» при ширине формы 36rem); под мышью. Список с отметками и без.
  - Playwright (`node_modules/@playwright/test` пакета), Chromium и WebKit. Сравнить:
    - `getBoundingClientRect` карточек, кружков, надписей, квадратов;
    - `getComputedStyle`: `border-color`, `background-color`, `color`, `font-size`, `line-height`, `padding`, `gap`;
    - снимки одного размера — посмотреть глазами.
  - Допустимы только сглаживание и кольцо фокуса. Затем снимок компонентов без `@tailwindcss/forms` и preflight должен совпасть со снимком с ними. Стенд удалить.
- [ ] **Step 2: Расширения** на собранном Playground (`npm run build && npx vite build --config vite.playground.config.js --outDir <scratchpad>/pg --emptyOutDir --base ./`, отдавать `python3 -m http.server`, не vite dev). Обе страницы, и ещё раз с добавленным стилем `button:not(:disabled) { cursor: pointer }`.
  - **Vimlike** (Playwright WebKit):
    - `page.addScriptTag({ content: <файл> })` с `/Applications/Vimlike.app/Contents/PlugIns/Vimlike Extension.appex/Contents/Resources/vimlike.min.js`;
    - кандидаты — `new GBLinkManager().x()`;
    - ошибка `Can't find variable: browser` на странице — это init Vimlike без API расширения, не пакет.
  - **Vimari** (WebKit):
    - `addStyleTag` с `injected.css`;
    - `addScriptTag` с `var settings = { linkHintCharacters: "sadfjklewcmpgh", detectByCursorStyle: false }; var currentZoomLevel = 100;` и `link-hints.js` из `/Applications/Vimari.app/Contents/PlugIns/Vimari Extension.appex/Contents/Resources/`;
    - кандидаты — `getVisibleClickableElements()`.
  - **Vimium 2.4.2** (Chromium): клон `philc/vimium` в scratchpad, `--load-extension`, режим подсказок `f`. Если с первого прогона подсказки не появились — повторить.
  - Ожидается:
    - у каждой карточки ровно один кандидат, его прямоугольник — вся карточка (Vimari — `input` на всю карточку, Vimlike — карточка);
    - у каждой галочки ровно один кандидат;
    - нажатие кандидата (`click()`, как у расширения) выбирает карточку или отмечает пункт — видно в строке «Выбрано».
  - Перед сверкой видимости меток ставить меткам и контейнеру `pointer-events: auto !important` и сверять по снимку экрана: у меток расширений `pointer-events: none`.
  - Если Vimari или Vimlike не находят карточку с прозрачным `input` на всю карточку — это отклонение: стоп, доклад с данными прогона.
- [ ] **Step 3: Playground в certificates.**
  - Выкладка: `npm run build && npx vite build --config vite.playground.config.js --outDir ~/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./`.
  - `curl -sk -o /dev/null -w "%{http_code}"` по `https://certificates.test/build/ui-playground/index.html` и `host.html` — `200`.
  - Chrome (chrome-devtools), 1280×900, обе страницы:
    - мышь и клавиатура — по спеке §5.2 и §6.2;
    - строка «Выбрано» показывает `true` / `false` без кавычек, участников — в порядке отметки;
    - раскладки 7 + 7, 5 + 5 + 4, 2 + 1 + 1;
    - консоль без ошибок и предупреждений.
- [ ] **Step 4:** Итог приёмки — короткий отчёт: что проверено, чем, результат. Исправления, если были, — отдельными коммитами `fix: …` с тестами.

---

### Task 6: README и версия

**Files:**
- Modify: `README.md`, `package.json`, `package-lock.json`

- [ ] **Step 1: README.**
  - Разделы `### SelectSingleCards` и `### SelectMultipleList` сразу после `### SelectMultipleForm`, в формате раздела `SelectSingleForm`:
    - абзац о виде;
    - пример: `<select-single-cards label="Бренд" :items="brands" v-model="brand" :is-required="markBrandRequired"/>` и `<select-multiple-list label="Участники" :items="participantTypes" v-model="participants" :columns="2"/>`;
    - таблица пропов по спеке §4.1;
    - раскладка — таблица `n` / `c` / колонки из спеки §4.3;
    - выбор и события;
    - родитель не принял значение;
    - клавиатура;
    - доступное имя (группа названа подписью);
    - `isRequired` и атрибуты на корне.
  - `## Компоненты`: «Пакет экспортирует двадцать шесть компонентов», `SelectSingleCards` и `SelectMultipleList` — в перечне после `SelectMultipleForm`.
  - «Клавиатурная навигация» — абзац: у карточки `SelectSingleCards` одна подсказка расширения на всей карточке, у галочки `SelectMultipleList` — одна на пункт. Ещё: Safari на Mac без настройки Tab по всем объектам пропускает переключатели и галочки, как кнопки пакета.
  - «Правила API пакета» не меняются: пункт о `required: true` приводит примеры («у `label` полей формы»), новые компоненты под него подпадают.
  - «Playground» — «со всеми двадцатью шестью компонентами».
- [ ] **Step 2:** `npm version 0.21.0 --no-git-tag-version` — `package.json` и `package-lock.json` на `0.21.0`.
- [ ] **Step 3:** `npm test -- --dir tests` (чистый вывод), `npm run test:browser`, `npm run build` — без ошибок и предупреждений.
- [ ] **Step 4: Commit** — `git add README.md package.json package-lock.json && git commit -m "chore: описать SelectSingleCards и SelectMultipleList и поднять версию до 0.21.0"`.

---

### Task 7: Выпуск `0.21.0`

- [ ] **Step 1:** Тиму — итог: что сделано и проверено, ссылка на Playground в certificates (перед ссылкой `200` у обеих страниц, при `404` — выложить заново). Вопрос: сливать в `main`, ставить тег `v0.21.0` и пушить?
- [ ] **Step 2:** Только после согласия: `git switch main && git merge --ff-only feature/select-cards-list && git tag v0.21.0 && git push origin main v0.21.0`.
- [ ] **Step 3:** GitHub Actions `Publish` по тегу зелёный (`gh run list --workflow publish.yml --limit 1`). `npm view @boobooking/dashboard-ui-components version` — `0.21.0`. Первый `E404` или старая версия — не провал: registry догоняет, повторять до совпадения.
- [ ] **Step 4:** Ветку `feature/select-cards-list` удалить локально (`git branch -d`).
