# FormTextarea — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** публичный `FormTextarea` в виде `FormInput` (заголовок, точка, подпись) и внутренний `CharacterCounter`, который поле включает пропом `characterLimit`.

**Architecture:**
- `CharacterCounter.vue` считает code points и рисует `N / M` плюс скрытый текст для скринридера; о textarea ничего не знает.
- `FormTextarea.vue` повторяет устройство `FormInput` (`useId`, `inheritAttrs: false`, `withFieldDescription`) и держит локальную копию текста поля: её читает счётчик, к ней привязана `<textarea>`.
- Ресет `src/styles/index.css` распространяется на `textarea`.

**Tech Stack:** Vue 3.5 (Options API), vitest + happy-dom, Playwright (Chromium, WebKit), Tailwind 4 с префиксом `bb`.

**Spec:** `docs/superpowers/specs/2026-11-04-form-textarea-design.md` (Codex PASS на `be52668`).

## Global Constraints

- **Ветка:** `feat/form-textarea` от локального `main` (`be52668` или новее), основная рабочая копия. Создать перед Task 1: `git switch -c feat/form-textarea`.
- **Слова:** заголовок — `label` над полем; подпись — `description` под полем.
- **Счётчик:** только показывает, `maxlength` от пропа не ставится; место — справа в строке заголовка, напротив первой строки заголовка; `12px`, высота строки `16px`, `gray-500`, `tabular-nums`; сверх лимита (строго больше) первое число `bb:text-red-600`.
- **Подсчёт:** `Array.from(text).length` (как `mb_strlen`), без параметра способа подсчёта.
- **Скринридер:** «Символов: N из M» / «Characters: N of M», `id` = `<id поля>-counter`, без `aria-live`; видимый `N / M` — `aria-hidden="true"`.
- **Поле:** `rows` по умолчанию `6`; `resize` только по высоте (`bb:resize-y`); классы рамки — как у `<input>` в `FormInput`.
- **Код:** классы литералами с префиксом `bb:`; комментарии по-русски, без истории изменений; существующие комментарии не удалять, если они не стали ложными. `CharacterCounter` не экспортируется.
- **Коммиты:** conventional commits по-русски, без `--no-verify`.
- **Отклонения:** если план или спеку нельзя выполнить как написано — остановиться и сообщить об отклонении с доказательством; план не менять.
- **Проверка:** набор пакета — `npx vitest run --dir tests`, вывод чистый (без `--dir` vitest подхватывает зонды из `.project-context`).

## Review Focus

1. Страница без `v-model`: счётчик идёт за текстом, ввод не стирается при перерисовке. Тест — Task 2.
2. Родитель не принимает новое значение (молчит на `update:modelValue`): текст в поле и счётчик остаются набранными. Тест — Task 2.
3. Набор через IME: счётчик меняется во время composition, событие — только по `compositionend`. Тест — Task 2.
4. `modelValue` с `\r\n` из базы: число сразу то же, что после ввода, и SSR без расхождения. Тест — Task 2, фикстура SSR.
5. Длинный заголовок со счётчиком: счётчик в одну строку, напротив первой строки. Тест — Task 3.

---

### Task 1: CharacterCounter и тексты

**Files:**
- Create: `src/components/CharacterCounter.vue`, `tests/CharacterCounter.test.js`
- Modify: `src/i18n.js`

**Interfaces:**
- Produces: `CharacterCounter` — пропсы `text: String` (по умолчанию `''`, `null` — пустая строка), `limit: Number` (обязателен; проверку значения делает вызывающее поле), `id: String` (объявленный проп, ставится на скрытый текст), `lang` из `withLang`. Ключи `src/i18n.js`: `characterCount` (`'Символов'` / `'Characters'`), `characterCountOf` (`'из'` / `'of'`).

- [ ] **Step 1: Написать падающие тесты**

`tests/CharacterCounter.test.js`, happy-dom, сбор `errors`/`warnings` как в `tests/FormInput.test.js`; в каждом тесте `errors` и `warnings` пусты.

```js
const visible = (wrapper) => wrapper.get('[aria-hidden="true"]')
const hidden = (wrapper) => wrapper.get('#c-counter')

it.each([
    ['', 0],
    ['привет', 6],
    ['а\nб', 3],
    ['👍', 1],
    ['👨‍👩‍👧', 5],
])('%j — %i символов', (text, count) => {
    const wrapper = mountCounter({ text, limit: 279, id: 'c-counter' })
    expect(visible(wrapper).text()).toBe(`${count} / 279`)
    expect(hidden(wrapper).text()).toBe(`Символов: ${count} из 279`)
})

it.each([[9, false], [10, false], [11, true]])('%i символов при лимите 10 — красный: %s', (length, isRed) => {
    const wrapper = mountCounter({ text: 'я'.repeat(length), limit: 10, id: 'c-counter' })
    expect(wrapper.find('.bb\\:text-red-600').exists()).toBe(isRed)
    if (isRed) expect(wrapper.get('.bb\\:text-red-600').text()).toBe('11')
})

it('null — 0', ...)                       // text: null → «0 / 10», без ошибок
it('en: Characters: 3 of 10', ...)        // lang: 'en'
it('язык плагина en без пропа lang', ...) // global.plugins: [[dashboardUi, { lang: 'en' }]]
it('скрытый текст — bb:sr-only, без aria-live', ...)
it('новый text — новые числа', ...)       // setProps({ text }) → обе надписи обновились
```

- [ ] **Step 2: Запустить — падают**

Run: `npx vitest run --dir tests tests/CharacterCounter.test.js`
Expected: FAIL — модуля `CharacterCounter.vue` нет.

- [ ] **Step 3: Реализовать**

`src/i18n.js`: ключи из Interfaces в `ru` и `en`, с комментарием «CharacterCounter: текст счётчика для скринридера, «Символов: 112 из 279»».

`src/components/CharacterCounter.vue`, миксин `withLang`. Корень `<span>` с классами `bb:text-xs bb:leading-4 bb:font-normal bb:text-gray-500 bb:tabular-nums bb:whitespace-nowrap`; внутри `<span aria-hidden="true">` с числом (`:class="isOverLimit ? 'bb:text-red-600' : null"`, отдельный `<span>`), ` / ` и лимитом; рядом `<span :id="id" class="bb:sr-only">` с `` `${texts.characterCount}: ${count} ${texts.characterCountOf} ${limit}` ``. `count` — `Array.from(this.text ?? '').length`; `isOverLimit` — `count > limit`. Комментарий у компонента: что считает (code points, как `mb_strlen` в Laravel), что внутренний и вид задан только здесь.

- [ ] **Step 4: Запустить — проходят**

Run: `npx vitest run --dir tests`
Expected: всё проходит, в том числе `tests/i18n.test.js` (ключи `ru`/`en` совпадают) и `tests/utilityPrefix.test.js`; вывод чистый.

- [ ] **Step 5: Закоммитить**

```bash
git add src/components/CharacterCounter.vue src/i18n.js tests/CharacterCounter.test.js
git commit -m "feat: добавить внутренний счётчик символов"
```

### Task 2: FormTextarea

**Files:**
- Create: `src/components/FormTextarea.vue`, `tests/FormTextarea.test.js`
- Modify: `src/index.js`, `src/styles/index.css`, `tests/exports.test.js`, `tests/ssrFixtures.js`, `tests/focusRing.test.js`, `tests/fieldDescription.test.js`

**Interfaces:**
- Consumes: `CharacterCounter` (Task 1); `withFieldDescription` (`descriptionId(id)`, `hasDescription()`), `withLang`, `Dot`, `FieldDescription`.
- Produces: `FormTextarea` — пропсы `modelValue: String` (`''`), `label: String` (обязателен), `isRequired: Boolean` (`false`), `rows: Number` (`6`), `characterLimit: Number` (`null`), `description`, `lang`; событие `update:modelValue`; слот `description`. Экспорт `FormTextarea` из `src/index.js` после `FormInput`.

- [ ] **Step 1: Написать падающие тесты**

`tests/FormTextarea.test.js` — копия устройства `tests/FormInput.test.js` (`mountTextarea`, сбор `errors`/`warnings`, пустые в конце каждого теста, кроме тестов на предупреждения). Перенести из FormInput с заменой `input` → `textarea`: заголовок/`for`/`id`; две копии — разные `id`; `id` страницы; `modelValue` в поле; ввод — событие со строкой как есть; новое значение родителя без события; composition; `isRequired` — точка без `required`/`aria-required`; атрибуты и слушатели на `<textarea>` (слушатель проверять на включённом поле), `class`/`style` на корне; атрибуты после монтирования; `label: null`. Новые:

```js
it('rows по умолчанию 6, переданное — в атрибут', ...)          // '6'; rows: 10 → '10'
it.each([[0], [-1], [1.5], ['10']])('rows %j — предупреждение и 6', ...) // warnings не пусты, rows === '6'
it('rows null — 6 без предупреждения', ...)
it('resize только по высоте', ...)  // класс bb:resize-y на textarea
it('без characterLimit и с null — счётчика и -counter нет', ...)
it.each([[0], [-5], [2.5], ['279']])('characterLimit %j — предупреждение, счётчика нет', ...)
it('characterLimit не ставит maxlength; maxlength страницы — на поле', ...)
it('счётчик в строке заголовка: label и счётчик — в одном ряду', ...) // findComponent(CharacterCounter) — потомок того же блока, что label
it('aria-describedby: страница, подпись, счётчик', ...)
// mount с attrs { 'aria-describedby': 'page-hint' }, description, characterLimit:
// значение === `page-hint ${id}-description ${id}-counter`; без каждого — без его id
it('lang поля доходит до счётчика', ...)  // lang: 'en' → «Characters: 0 of 10»

it('без v-model счётчик идёт за полем и ввод не стирается', async () => {
    const { wrapper } = mountTextarea({ characterLimit: 10 })
    const textarea = wrapper.get('textarea')
    textarea.element.value = 'абв'
    await textarea.trigger('input')
    await nextTick()
    expect(textarea.element.value).toBe('абв')
    expect(wrapper.get('[aria-hidden="true"]').text()).toBe('3 / 10')
})

it('родитель молчит на update:modelValue — текст и счётчик остаются', ...) // modelValue: 'а', без обработчика; ввод 'аб' → поле 'аб', «2 / 10»

it('composition: счётчик меняется сразу, событие — по compositionend', async () => {
    // как тест composition у FormInput, плюс characterLimit: 10
    // после compositionstart + input('при'): updates === [], счётчик «3 / 10»
    // после compositionend('привет'): updates === ['привет'], счётчик «6 / 10»
})

it.each([['а\r\nб'], ['а\rб']])('modelValue %j — счётчик 3, поле «а\\nб», событий нет', ...)
it('смена modelValue родителем на значение с \\r\\n — 3, событий нет', ...)
```

`tests/exports.test.js`: `'FormTextarea'` в списке после `'FormInput'`; `CharacterCounter` в экспортах отсутствует (если в файле нет такой проверки — добавить `expect(Object.keys(pkg)).not.toContain('CharacterCounter')`).
`tests/ssrFixtures.js`: `FormTextarea: { props: { label: 'Комментарий', modelValue: 'Первая\r\nвторая', isRequired: true, characterLimit: 10, description: 'Подпись' } }`.
`tests/focusRing.test.js`: в `carriers` строка `['FormTextarea.vue', 'bb:focus:focus-ring', 1]`.
`tests/fieldDescription.test.js`: в `fields` строка `{ name: 'FormTextarea', component: FormTextarea, props: { label: 'Комментарий' }, carrier: (wrapper) => wrapper.find('textarea') }`; если в файле есть отдельный блок «FormInput: связь описания» с `aria-describedby` страницы — такой же для `FormTextarea` не нужен, это покрывает `tests/FormTextarea.test.js`.

- [ ] **Step 2: Запустить — падают**

Run: `npx vitest run --dir tests`
Expected: FAIL в новых и дополненных тестах — `FormTextarea.vue` нет.

- [ ] **Step 3: Реализовать**

`src/components/FormTextarea.vue` по образцу `FormInput.vue`; миксины `withFieldDescription`, `withLang`; `inheritAttrs: false`; `setup()` с `generatedId: useId()`; методы `textareaId()`, `textareaDescribedBy()`, `textareaAttrs()` — как `inputId()`, `inputDescribedBy()`, `inputAttrs()` у FormInput, в `textareaDescribedBy()` третьим идёт `` `${id}-counter` `` при `hasCounter`.

Текст поля:

```js
// Так переносы приводит сам <textarea>: счётчик до первого ввода
// показывает то же число, что после.
const normalizeLineBreaks = (value) => (value ?? '').replace(/\r\n?/g, '\n')
```

- `data()`: `text: normalizeLineBreaks(this.modelValue)`; `watch.modelValue`: `this.text = normalizeLineBreaks(value)`.
- computed `value` { get → `this.text`; set → `$emit('update:modelValue', value)` }; `<textarea v-model="value" @input="text = $event.target.value">`. Привязка к `text`, а не к пропу: иначе перерисовка от счётчика стирает ввод страницы без `v-model` (проба Codex). Нативный `v-model` откладывает `set` до `compositionend`, `@input` обновляет `text` и во время composition.
- `rows`: `validator: (value) => Number.isInteger(value) && value > 0`; computed `textareaRows` — значение или `6`.
- `characterLimit`: такой же `validator`; computed `hasCounter` — `Number.isInteger(this.characterLimit) && this.characterLimit > 0`.

Разметка:

```html
<div class="bb-dashboard-ui" :class="$attrs.class" :style="$attrs.style">
    <div class="bb:flex bb:items-start bb:justify-between bb:gap-3">
        <div class="bb:flex bb:items-center"><!-- label и dot как у FormInput --></div>
        <!-- h-5 — высота строки заголовка: счётчик по центру первой строки,
             и строка со счётчиком не выше строки без него. -->
        <div v-if="hasCounter" class="bb:flex bb:h-5 bb:shrink-0 bb:items-center">
            <character-counter :id="`${textareaId()}-counter`" :text="text" :limit="characterLimit" :lang="lang"/>
        </div>
    </div>
    <textarea ... :rows="textareaRows" class="<классы input из FormInput> bb:resize-y"/>
    <field-description .../>
</div>
```

Комментарий у компонента: что повторяет `FormInput`, что счётчик считает текст в поле, что `isRequired` только рисует точку.

`src/styles/index.css`, слой `components`: `.bb-dashboard-ui textarea` — в блок с `font: inherit` (рядом с `.bb-dashboard-ui input`) и в блок `appearance: none`; `.bb-dashboard-ui textarea:focus` — в блок `box-shadow: none`. Комментарии блоков дополнить словом «textarea», если они перечисляют поля.

`src/index.js`: `export { default as FormTextarea } from './components/FormTextarea.vue'` после `FormInput`.

- [ ] **Step 4: Запустить — проходят**

Run: `npx vitest run --dir tests`
Expected: всё проходит, включая `ssr.test.js`, `hydration.test.js` (фикстура с `\r\n`), `utilityPrefix.test.js`, `focusRing.test.js`, `fieldDescription.test.js`; вывод чистый.

- [ ] **Step 5: Собрать**

Run: `npm run build`
Expected: сборка без ошибок и предупреждений.

- [ ] **Step 6: Закоммитить**

```bash
git add src/components/FormTextarea.vue src/index.js src/styles/index.css tests/
git commit -m "feat: добавить компонент FormTextarea"
```

### Task 3: Playground, браузерные тесты, README

**Files:**
- Create: `e2e/formTextarea.e2e.js`
- Modify: `playground/App.vue`, `e2e/fieldDescription.e2e.js`, `README.md`

**Interfaces:**
- Consumes: `FormTextarea` (Task 2); `test`, `expect`, `pages`, `openPlayground`, `expectColor`, `expectFocusRing` из `e2e/helpers.js`.

- [ ] **Step 1: Дополнить Playground**

Раздел `<h2>FormTextarea</h2>` сразу после раздела `FormInput`, в `.demo-form`:
- `label="Комментарий"`, `description="Видит только администратор"`;
- `label="Текст сообщения"`, `:is-required="reminderText.trim() === ''"`, `:character-limit="279"`, `v-model="reminderText"` (пустая строка);
- `label="Сверх лимита"`, `:character-limit="279"`, `v-model` на `'Напоминаем о приёме у ветеринара. '.repeat(9)` (306 символов);
- `label="Десять строк"`, `:rows="10"`;
- `label="Заблокировано"`, `disabled`, со значением и `:character-limit="279"`;
- `label="Очень длинный заголовок поля, который не помещается в одну строку и переносится"`, `:character-limit="279"`.

В раздел «Описание поля» после `select-multiple-list` — `<form-textarea label="FormTextarea" description="Описание под полем"/>`.

- [ ] **Step 2: Написать браузерные тесты**

`e2e/formTextarea.e2e.js`, цикл по `pages`; `section` — по заголовку `FormTextarea`; поле — `section.getByLabel(<заголовок>)`; счётчик поля — родитель `[id="<id поля>-counter"]`.

- `рамка как у FormInput`: у `textarea` «Комментарий» и `input` «Имя» раздела FormInput совпадают `border-top-color`, `border-top-width`, `border-radius`, `background-color`, `padding-left`, `padding-top`, `font-family`, `font-size`, `line-height`, `box-shadow`; после `focus()` — `expectFocusRing(textarea)`.
- `счётчик: место и вид` («Текст сообщения»): правый край счётчика = правый край поля (±0,5); центр счётчика по вертикали = центр первой строки заголовка (`Range.getClientRects()[0]`, ±1); `textarea.top − корень.top` одинаков у «Текст сообщения» и «Комментарий» (±0,5); `font-size` `12px`, `line-height` `16px`, `expectColor(..., 'color', 'gray-500')`; текст `0 / 279`.
- `сверх лимита первое число red-600` («Сверх лимита»): `expectColor(первое число, 'color', 'red-600')`, текст `306 / 279`.
- `ввод меняет счётчик`: `fill('абв')` в «Текст сообщения» → `3 / 279`.
- `длинный заголовок`: высота счётчика ≤ 16,5 (одна строка); центр счётчика = центр первой строки заголовка (±1); у заголовка больше одной строки (`getClientRects().length > 1`).
- `растягивание по высоте`: `toHaveCSS('resize', 'vertical')`; перетаскивание мышью от точки (right − 3, bottom − 3) на (+60, +40): высота выросла, ширина та же (±0,5).
- `rows`: высота «Десять строк» − высота «Комментарий» = 80 (4 строки × 20px, ±1).

`e2e/fieldDescription.e2e.js`: `toHaveCount(13)` → `14`, `descriptions(page).nth(11)` → `nth(12)`.

- [ ] **Step 3: Запустить браузерные тесты**

Run: `npm run test:browser -- e2e/formTextarea.e2e.js e2e/fieldDescription.e2e.js`
Expected: всё проходит в Chromium и WebKit, `consoleProblems` пуст.

- [ ] **Step 4: Обновить README**

- Список экспортов (около строки 134): «тридцать пять», `FormTextarea` после `FormInput`.
- `### FormTextarea` после `### FormInput`: пример из раздела 4.1 спеки; таблица пропов из 4.2; событие, IME, без модификаторов, `null`; `rows` и недопустимые значения; счётчик — место, вид, подсчёт как `mb_strlen` в Laravel (составной эмодзи — несколько символов), строго больше лимита — красный, ввод не ограничен, решение по длине за формой, переносы `\r\n` приводятся к `\n`, считается текст в поле; растягивание по высоте; атрибуты, `id`, `aria-describedby`; точка как у FormInput.
- «Описание поля»: `FormTextarea` в списке полей.
- «Языки»: строка `| \`FormTextarea\` — текст счётчика для скринридера | Символов: N из M | Characters: N of M |`.
- «Playground»: «тридцатью пятью».

- [ ] **Step 5: Запустить всё**

Run: `npx vitest run --dir tests && npm run test:browser`
Expected: всё проходит, вывод чистый.

- [ ] **Step 6: Закоммитить**

```bash
git add playground/App.vue e2e/formTextarea.e2e.js e2e/fieldDescription.e2e.js README.md
git commit -m "docs: описать FormTextarea и показать в Playground"
```

### Task 4: Приёмка и версия

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Выложить Playground**

Run: `npm run build`, затем `npx vite build --config vite.playground.config.js --outDir ~/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./`, затем `curl -sk -o /dev/null -w "%{http_code}"` по `https://certificates.test/build/ui-playground/index.html` и `host.html`.
Expected: `200` на обе страницы (при `404` выложить заново).

- [ ] **Step 2: Принять**

Chrome — исполнитель, Safari — владелец: раздел FormTextarea на обеих страницах — счётчик, красное число, длинный заголовок, растягивание, фокус.

- [ ] **Step 3: Поднять версию после итогового ревью**

Run: `npm version 0.25.0 --no-git-tag-version`
Expected: `0.25.0` в `package.json` и `package-lock.json`, других изменений нет.

```bash
git add package.json package-lock.json
git commit -m "chore: поднять версию до 0.25.0"
```

Слияние в `main` и тег `v0.25.0` — только по слову владельца.
