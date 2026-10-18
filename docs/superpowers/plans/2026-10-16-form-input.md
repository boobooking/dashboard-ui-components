# `FormInput` и выпуск `0.18.0` — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** публичный компонент `FormInput` — подпись над полем в рамке, красная точка по флагу `isRequired`, значение через `v-model`; выпуск `0.18.0` и перевод форм cashback, certificates и payments на него.

**Architecture:** один SFC `src/components/FormInput.vue` (Options API): `useId()` в `setup()` для `id` поля, нативный `v-model` поля на записываемом computed, `inheritAttrs: false` — `class` и `style` на корень, остальные атрибуты методом на `<input>`. Точка — существующий `Dot`. Вид сверяется с нынешними копиями во временном стенде с Tailwind 4 и `@tailwindcss/forms`.

**Tech Stack:** Vue 3.5 (Options API, SFC), vitest + happy-dom, @vue/test-utils 2, Vite (library mode), Tailwind 4 с префиксом `bb`, chrome-devtools MCP, playwright-core 1.63.0 (Chromium 1243, WebKit 2359), GitHub Actions, npm.

**Spec:** `docs/superpowers/specs/2026-10-16-form-input-design.md`

## Global Constraints

- Репозиторий `/Users/boobooking/Code/dashboard-ui-components`, ветка — текущая `main`, коммиты прямо в неё. Версия в `package.json` — `0.17.1` до Task 7, затем `0.18.0` последним коммитом.
- Публикация (пуш `main` и тега `v0.18.0`) — **только после явного согласия владельца на этом шаге** (Task 8). Проекты исполнитель коммитит, но не пушит.
- API (спека §4): пропы `modelValue: String = ""`, `label: String` (обязателен), `type: String = "text"` с `validator` по списку `text`, `email`, `password`, `tel`, `url`, `search`, `isRequired: Boolean = false`; единственное событие — `update:modelValue` со строкой как есть; ни `changed`, ни слотов, ни `lang`, ни текстов в `src/i18n.js`.
- `isRequired` только показывает точку: атрибутов `required` и `aria-*` он полю не ставит.
- Вид (спека §5): подпись `text-sm font-medium leading-5 text-gray-700`; `Dot` `color="red"` с `ml-2`; поле на `mt-1`, во всю ширину, рамка 1px `gray-300`, `rounded-md`, белый фон, `px-3 py-2`, `text-sm leading-5`, `shadow-xs`, высота 38px; фокус — рамка `blue-300`, кольцо 3px `blue-200/50`, без обводки браузера. Каждая утилита — `bb:`, без `bb:sm:` и других порогов ширины. У подписи нет `cursor: pointer`.
- Стиль: в `.vue` — как в других компонентах (двойные кавычки и точки с запятой в `<script>`, Options API); в `.js` тестов — одинарные кавычки без точек с запятой; отступ 4 пробела; комментарии по-русски, описывают код как он есть. Существующие комментарии сохраняются.
- Тесты — только каталог `tests/`: `npm test -- --dir tests` (в `.codex-advisor/` лежат копии ревьюера). База до Task 1 (2026-10-16, `5066ba5`): `Test Files 43 passed (43)`, `Tests 809 passed (809)`.
- Вывод тестов чистый: `npm test -- --dir tests --reporter=verbose > $W/<имя>.log 2>&1`, затем `grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/<имя>.log` — ожидается `0`.
- `W=/Users/boobooking/Code/dashboard-ui-components/.superpowers/sdd/2026-10-16-form-input` (`.superpowers/sdd` git-ignored, каталог создаётся в Task 1); `S=/private/tmp/claude-501/-Users-boobooking-Code-dashboard-ui-components/d8b10fb4-39a1-478e-b75b-ad6da1209cb3/scratchpad` — временные стенды.
- Коммиты — conventional commits: в библиотеке, cashback и certificates по-русски, в payments по-английски; повелительное наклонение, без служебных строк и упоминаний инструментов; `--no-verify` запрещён.
- Замечания итогового ревью всех уровней, включая Minor, исправляются (Task 6).
- Исполнитель-подагент: «If you cannot follow the plan or spec as written, stop and report the deviation with evidence; do not change the plan.» Отличия согласует с Codex только основная сессия.

## Review Focus

- Форма меняет атрибуты после монтирования — `disabled` на время запроса, другой `class`: поле и корень получают новые значения (`$attrs` не реактивен для computed — поэтому метод). Тест — Task 1, «атрибуты, изменённые после монтирования».
- Форма сбрасывает значение после отправки в `""` или `null`: поле пустеет, события нет. Тест — Task 1, «новое modelValue от родителя».
- Форма ловит Enter в поле (`@keydown.enter="submit"`): слушатель на `<input>`. Тест — Task 1, «атрибуты и слушатели — на поле».
- Клик по подписи в настоящем браузере ставит курсор в своё поле, в том числе у второго и третьего поля формы (ошибка `for="name"`). Проверка — Task 4, шаг 1; Task 5, приёмка в проектах.
- Набор с composition (IME, удержание клавиши для диакритики в Safari): форма видит только итог. Тест — Task 1, «composition».

---

### Task 1: Компонент `FormInput`

**Files:**
- Create: `src/components/FormInput.vue`
- Create: `tests/FormInput.test.js`
- Modify: `src/index.js` — экспорт после `ErrorMessages`
- Modify: `tests/exports.test.js` — «ровно восемнадцать», `FormInput` в отсортированном списке после `ErrorMessages`
- Modify: `tests/ssrFixtures.js` — фикстура после `ErrorMessages`

**Interfaces:**
- Consumes: `src/components/Dot.vue` (`color`, `withPulse`).
- Produces: `export { default as FormInput } from './components/FormInput.vue'` в `src/index.js`; контракт — Global Constraints «API».

- [ ] **Step 1: База ревью**

```bash
W=/Users/boobooking/Code/dashboard-ui-components/.superpowers/sdd/2026-10-16-form-input
mkdir -p "$W" && git rev-parse HEAD > "$W/base-sha" && cat "$W/base-sha"
```

Полный SHA `HEAD` до Task 1 (коммит этого плана) — база итогового ревью (Task 6).

- [ ] **Step 2: Тесты**

`tests/FormInput.test.js` — по образцу `tests/PageTabs.test.js`: `// @vitest-environment happy-dom`, `enableAutoUnmount(afterEach)`, помощник монтирования собирает `errors` (`errorHandler`) и `warnings` (`warnHandler`):

```js
const mountInput = (props = {}, attrs = {}) => {
    const errors = []
    const warnings = []
    const wrapper = mount(FormInput, {
        props: { label: 'Имя', ...props },
        attrs,
        global: { config: { errorHandler: (error) => errors.push(error), warnHandler: (message) => warnings.push(message) } },
    })

    return { wrapper, errors, warnings }
}
```

Если не сказано иное, каждый тест проверяет `errors` и `warnings` — `[]`. Тесты и их утверждения:

| Тест | Утверждения |
| --- | --- |
| подпись — текст `label`, `for` подписи — `id` поля | `label` с текстом `Имя`; `id` поля непустой; `label.attributes('for') === input.attributes('id')` |
| у двух полей разные `id` | `mount({ render: () => [h(FormInput, { label: 'Имя' }), h(FormInput, { label: 'Email' })] })`: `id` полей различны, `for` каждой подписи равен `id` своего поля |
| `id` от формы — в поле и в `for` | `attrs: { id: 'user-email' }`: у поля и в `for` — `user-email`; у корня атрибута `id` нет |
| поле показывает `modelValue` | `modelValue: 'Анна'` → `input.element.value === 'Анна'` |
| `modelValue` `null` / `undefined` — пустое поле (`it.each`) | `value === ''`, `warnings` `[]` |
| ввод — `update:modelValue` со строкой как есть | `setValue('  Анна  ')` → `emitted('update:modelValue')` `[['  Анна  ']]`; `emitted('changed')` `undefined` |
| новое `modelValue` от родителя — в поле, без событий | `setProps({ modelValue: 'Пётр' })` → `value === 'Пётр'`; затем `setProps({ modelValue: null })` → `''`; `emitted('update:modelValue')` `undefined` |
| composition — событие только по `compositionend` | родитель `h(FormInput, { label: 'Имя', modelValue: name.value, 'onUpdate:modelValue': (value) => { updates.push(value); name.value = value } })` на `ref('')`; `value = 'при'`, `compositionstart`, `input` → `updates` `[]`; `value = 'привет'`, `compositionend` → `updates` `['привет']`; после `nextTick` поле показывает `привет` |
| `type` по умолчанию `text`; каждый допустимый — в атрибуте (`it.each` по шести) | `input.attributes('type')` равен переданному, без пропа — `text` |
| `type` вне списка — предупреждение и `type="text"` (`it.each(['number', 'checkbox', 'date'])`) | `warnings.some((m) => m.includes('Invalid prop: custom validator check failed for prop "type"'))`; `input.attributes('type') === 'text'` |
| `isRequired` — точка | `findComponent(Dot).element.style.display`: без флага `'none'`, `setProps({ isRequired: true })` → `''`, обратно → `'none'`; у `Dot` пропы `color: 'red'`; у поля нет `required`, `aria-required`, `aria-invalid` ни в одном состоянии |
| атрибуты и слушатели — на поле, `class` и `style` — на корне | `attrs: { placeholder: 'Иван', autocomplete: 'new-password', name: 'password', disabled: true, required: true, class: 'w-1/3', style: 'margin-top: 4px', onBlur, onKeydown }` (`vi.fn()`): у поля — `placeholder`, `autocomplete`, `name`, `disabled`, `required`; у корня их нет; классы корня содержат `bb-dashboard-ui` и `w-1/3`, у поля `w-1/3` нет; `margin-top: 4px` — в стиле корня, не поля; затем `await setProps({ disabled: false })` (VTU не шлёт `trigger()` в поле с `disabled`) — `trigger('blur')` и `trigger('keydown', { key: 'Enter' })` на поле вызывают `onBlur` и `onKeydown` по одному разу |
| атрибуты, изменённые после монтирования | `setProps({ disabled: true, class: 'w-1/2' })` → поле `disabled`, корень с `w-1/2`; `setProps({ disabled: false })` → атрибута `disabled` нет |
| `label: null` — пустая подпись | `warnings.some((m) => m.includes('Invalid prop: type check failed for prop "label"'))`; `errors` `[]`; текст подписи `''` |

`tests/exports.test.js`: название теста и список — восемнадцать компонентов. `tests/ssrFixtures.js`:

```js
    FormInput: { props: { label: 'Имя', modelValue: 'Анна', isRequired: true } },
```

- [ ] **Step 3: Тесты падают**

Run: `npm test -- --dir tests tests/FormInput.test.js tests/exports.test.js`
Expected: FAIL — `FormInput.vue` не найден, в экспортах нет `FormInput`.

- [ ] **Step 4: `src/components/FormInput.vue`**

Шаблон — формы привязок фиксированы `tests/utilityPrefix.test.js`: на корне `:class="$attrs.class"` (разрешённое исключение), на поле — `v-bind="{ ...inputAttrs() }"`, как `forwardedAttrs()` у `PageCard` (вызов функции в `v-bind` без объекта тест отклоняет).

```html
<template>
    <div class="bb-dashboard-ui" :class="$attrs.class" :style="$attrs.style">
        <div class="bb:flex bb:items-center">
            <label :for="inputId()" class="bb:block bb:text-sm bb:font-medium bb:leading-5 bb:text-gray-700" v-text="label"/>
            <dot v-show="isRequired" color="red" class="bb:ml-2"/>
        </div>
        <input
            v-model="value"
            v-bind="{ ...inputAttrs() }"
            :id="inputId()"
            :type="inputType"
            class="bb:mt-1 bb:block bb:w-full bb:rounded-md bb:border bb:border-gray-300 bb:bg-white bb:px-3 bb:py-2 bb:text-sm bb:leading-5 bb:shadow-xs bb:focus:border-blue-300 bb:focus:ring-3 bb:focus:ring-blue-200/50 bb:focus:outline-hidden"
        />
    </div>
</template>
```

Классы поля — отправная точка; окончательный набор задаёт сверка в Task 3.

`<script>`:
- `inheritAttrs: false`; `components: { Dot }`; `emits: ["update:modelValue"]`; пропы — Global Constraints «API»; список типов — константа модуля, ею же пользуется `validator`.
- `setup()` возвращает `generatedId: useId()` — с комментарием, как у `ConfirmationModal`.
- computed `value`: `get` — `this.modelValue ?? ""`, `set(value)` — `this.$emit("update:modelValue", value)`. Нативный `v-model` даёт отложенное обновление при composition.
- computed `inputType` — `type` из списка, иначе `"text"`.
- методы (не computed: `$attrs` не реактивен для computed, метод в рендере видит новые атрибуты): `inputId()` — `this.$attrs.id ?? this.generatedId`; `inputAttrs()` — `$attrs` без `class`, `style` и `id`.

- [ ] **Step 5: Экспорт**

`src/index.js`: `export { default as FormInput } from './components/FormInput.vue'` после строки `ErrorMessages`.

- [ ] **Step 6: Весь набор**

```bash
npm test -- --dir tests --reporter=verbose > $W/t1-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests " $W/t1-suite.log
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t1-suite.log
npm run build > $W/t1-build.log 2>&1; echo "build exit $?"
```

Expected: `tests exit 0`; `Test Files 44 passed (44)`, тестов больше 809, все passed — в том числе `ssr.test.js`, `hydration.test.js` и `utilityPrefix.test.js` для `FormInput`; `0`; `build exit 0`.

- [ ] **Step 7: Коммит**

```bash
git add src/components/FormInput.vue src/index.js tests/FormInput.test.js tests/exports.test.js tests/ssrFixtures.js
git commit -m "feat: добавить компонент FormInput"
```

---

### Task 2: Playground и README

**Files:**
- Modify: `playground/App.vue` — раздел после `Search`
- Modify: `playground/shell.css` — класс `.demo-form`
- Modify: `README.md`

**Interfaces:**
- Consumes: `FormInput` из `../dist/index.js` (Task 1).
- Produces: раздел `<h2>FormInput</h2>` — по нему Task 4 находит поля.

- [ ] **Step 1: Playground**

`playground/App.vue`: `FormInput` в импорт из `../dist/index.js` и в `components`; раздел после `Search`:

```html
<section>
    <h2>FormInput</h2>
    <div class="demo-form">
        <form-input v-model="adminName" label="Имя" :is-required="markAdminName"/>
        <form-input v-model="adminEmail" label="Email" type="email" :is-required="markAdminEmail"/>
        <form-input v-model="adminPassword" label="Пароль" type="password" autocomplete="new-password" :is-required="markAdminPassword"/>
        <div class="demo-row">
            <button type="button" class="demo-button" @click="createAdmin">Создать</button>
        </div>
        <p>Значения: «{{ adminName }}», «{{ adminEmail }}», «{{ adminPassword }}»</p>
        <form-input v-model="documentNumber" label="Номер закрывающего документа" :is-required="documentNumber.trim() === ''"/>
    </div>
</section>
```

`data()`: `adminName`, `adminEmail`, `adminPassword`, `documentNumber` — `''`; `markAdminName`, `markAdminEmail`, `markAdminPassword` — `false`. `watch` (нового раздела в компоненте ещё нет): на каждое из трёх полей — `mark… = value.length === 0`. Метод `createAdmin()` ставит все три `mark…` по той же проверке. Комментарий над разделом: основной способ — точки после «Создать», ввод снимает; номер — способ «сразу».

`playground/shell.css`: `.demo-form` в перечисление `box-sizing` в начале файла и правило `.demo-form { display: flex; flex-direction: column; gap: 16px; max-width: 36rem; }` — ширина карточки форм `max-w-xl`.

- [ ] **Step 2: README**

- Раздел `### FormInput` между `### Search` и `### SelectDateInterval`: назначение (поле формы с подписью; значение забирает форма); пример из трёх полей (спека §4); таблица пропов (как у `Search`); событие `update:modelValue` со строкой как есть, пробелы не обрезаются, значение от родителя — без события, набор через IME — по окончании; допустимые `type` и запасной `text`; атрибуты — `class`/`style` на корень, остальные и слушатели на `<input>`; `id` создаётся сам, `for` подписи указывает на поле, `id` от формы заменяет созданный; точка — «не заполнено», когда её показывать, решает форма: основной способ (пример: watcher `name() { this.markNameRequired = this.name.length === 0 }` и та же проверка в обработчике кнопки) и «сразу» (`:is-required="number.trim() === ''"`); `isRequired` не ставит `required`.
- «Компоненты»: «семнадцать» → «восемнадцать», `FormInput` в списке после `ErrorMessages`.
- «Playground»: «семнадцатью» → «восемнадцатью».

- [ ] **Step 3: Проверка и коммит**

```bash
npm test -- --dir tests --reporter=verbose > $W/t2-suite.log 2>&1; echo "tests exit $?"
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t2-suite.log
npm run build > $W/t2-build.log 2>&1 && npx vite build --config vite.playground.config.js --outDir $S/playground-check --emptyOutDir --base ./ > $W/t2-playground.log 2>&1; echo "build exit $?"
grep -nE "(^|[^о])семнадцат" README.md
git add playground/App.vue playground/shell.css README.md
git commit -m "docs: показать FormInput в Playground и описать в README"
```

Expected: `tests exit 0`, `0`, `build exit 0`; `grep` пуст — ни «семнадцать», ни «семнадцатью» не осталось («восемнадцать» содержит «семнадцат», поэтому шаблон исключает предшествующую «о»).

---

### Task 3: Сверка вида с нынешними копиями

**Files:** временно — `$S/parity/`, `$S/pw/`. В репозитории меняется только `src/components/FormInput.vue`, если сверка покажет расхождение.

**Interfaces:**
- Consumes: `dist/` после `npm run build` (Task 1–2).
- Produces: `$W/acceptance.md` — раздел «Сверка вида» (размеры, итог просмотра, пути снимков).

- [ ] **Step 1: Стенд**

```bash
P=$S/parity && mkdir -p $P && ln -sfn /Users/boobooking/Code/dashboard-ui-components/node_modules $P/node_modules
```

- `$P/vite.config.js` — `vue()`, `tailwindcss()`, `resolve.alias` `@pkg` → `/Users/boobooking/Code/dashboard-ui-components/dist`.
- `$P/index.html` — `<div id="app">` и `main.js`.
- `$P/main.js` — `@pkg/style.css` первым, затем `./app.css`; `createApp(App).mount('#app')`.
- `$P/app.css` — окружение потребителя, как `playground/host.css`: `@import 'tailwindcss' source(none);`, `@source './App.vue';`, `@plugin '@tailwindcss/forms';`, `body { font-family: ui-sans-serif, system-ui, sans-serif; color: #111827; }`.
- `$P/App.vue` — четыре блока `<div :data-case="…" style="width: 520px; padding: 8px">` в столбик: `copy-rest`, `input-rest` (без точки) и `copy-dot`, `input-dot` (с точкой). Копия — разметка поля Email из `~/Code/mars/cashback/resources/js/Pages/Users/Create.vue` дословно, с `Dot` из `@pkg`, только `id`/`for` — свои для каждого блока; рядом `<form-input label="Email" :is-required="…"/>` из `@pkg`.

```bash
cd $P && node_modules/.bin/vite build > $W/t3-stand-build.log 2>&1; echo "stand build exit $?"
```

Затем `node_modules/.bin/vite preview --port 4317 --strictPort` из `$P` — в фоне. Если песочница не даёт слушать порт — тот же запуск вне песочницы.

- [ ] **Step 2: Снимки**

```bash
mkdir -p $S/pw && npm install --prefix $S/pw playwright-core@1.63.0 > $S/pw/install.log 2>&1; echo "install exit $?"
```

`$S/pw/parity.mjs`: для `chromium` и `webkit` из `playwright-core` — страница 1280×900 на `http://localhost:4317/`; восемь сравнений — в каждом браузере пары `copy-rest`/`input-rest` и `copy-dot`/`input-dot`, каждая в покое и в фокусе (`focus()` поля в блоке, снимок, затем следующий блок). Снимок блока — `locator.screenshot()` (каретка скрыта по умолчанию), файлы `$S/parity-shots/<браузер>-<случай>-<покой|фокус>.png`; печатается размер каждого снимка.

```bash
node $S/pw/parity.mjs > $W/t3-parity.log 2>&1; echo "parity exit $?"; cat $W/t3-parity.log
```

Expected: `parity exit 0`; в каждом из восьми сравнений размеры снимков равны. Снимки каждой пары просмотреть рядом глазами (Read): рамка, скругление, тень, отступы, шрифт, кольцо фокуса, точка совпадают; допустимы только отличия сглаживания. Если песочница не даёт запустить браузер — тот же запуск вне песочницы.

- [ ] **Step 3: Расхождение — исправление классов**

Если Step 2 не прошёл: поправить классы в `FormInput.vue` (спека §5 оставляет точный набор исполнителю), `npm run build`, повторить Step 2; затем весь набор, как в Task 1 Step 6, и коммит `fix: выровнять вид FormInput по полям проектов`. Расхождение, которое не устраняется классами, — остановиться и сообщить.

- [ ] **Step 4: Запись и уборка**

Итог (по браузерам и парам) — в `$W/acceptance.md`. Остановить `vite preview`. Стенд `$S/parity` и снимки остаются до Task 10.

---

### Task 4: Приёмка Playground в Chrome

**Files:** нет. Временно: `~/Code/mars/certificates/src/public/build/ui-playground/`.

- [ ] **Step 1: Выложить и проверить**

```bash
npm run build > $W/t4-build.log 2>&1 && npx vite build --config vite.playground.config.js --outDir ~/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./ > $W/t4-playground.log 2>&1; echo "exit $?"
for p in index.html host.html; do curl -sk -o /dev/null -w "$p %{http_code}\n" https://certificates.test/build/ui-playground/$p; done
```

Expected: `exit 0`, оба `200` (сборка certificates стирает папку — при `404` выложить заново).

chrome-devtools, 1280×900, сначала `index.html`, затем `host.html`; раздел `FormInput`. Состояние — `evaluate_script`: `document.activeElement.id`, для каждого поля раздела — текст подписи, `for`, `id` поля, `style.display` точки; строка «Значения: …». Шаги (спека §12):

1. клик (`click` по uid из `take_snapshot`) по каждой из четырёх подписей → `activeElement.id` равен её `for`;
2. фокус в «Имя», `press_key` Tab ×3 → Email, Пароль, «Создать»;
3. «Создать» с пустыми полями → три точки видны; `type_text` «а» в «Имя» → её точка скрыта, две другие видны; стереть (Backspace) → точка снова видна;
4. стереть «Имя» и набрать `  Анна  ` → в строке значений `«  Анна  »`, пробелы сохранены (Email не годится: у `type="email"` браузер обрезает пробелы в `value`);
5. «Номер закрывающего документа»: пусто — точка видна, ввести «1» — скрыта, стереть — видна;
6. `list_console_messages` — ни ошибок, ни предупреждений.

Каждый шаг с результатом — строка в `$W/acceptance.md`. Расхождение с ожиданием — остановиться и сообщить.

---

### Task 5: Перевод форм проектов (до публикации)

| Проект | Каталог | Файлы (`resources/js/Pages/`) |
| --- | --- | --- |
| cashback | `/Users/boobooking/Code/mars/cashback` | `Users/Create.vue`, `Users/Edit.vue`, `Users/ChangePassword.vue`, `Users/ChangeMyPassword.vue` |
| certificates | `/Users/boobooking/Code/mars/certificates/src` | те же четыре и `Groups/Complete.vue` |
| payments | `/Users/boobooking/Code/payments` | те же четыре и `PaymentAgents/Create.vue`, `PaymentAgents/Edit.vue` |

Тесты проектов — команды из спеки §11 (п. 4).

- [ ] **Step 1: Архив пакета**

```bash
npm run build > $W/t5-build.log 2>&1 && npm pack --pack-destination $W > $W/t5-pack.log 2>&1; echo "pack exit $?"; ls $W/*.tgz
```

Expected: `pack exit 0`, `$W/boobooking-dashboard-ui-components-0.17.1.tgz` (версия прежняя, содержимое — с `FormInput`).

- [ ] **Step 2: По каждому проекту — чистое дерево, база тестов, архив**

```bash
cd <каталог> && git status -s && git log --oneline -1
<тесты> > $W/t5-<проект>-before.log 2>&1; echo "before exit $?"
npm install --no-save $W/boobooking-dashboard-ui-components-0.17.1.tgz > $W/t5-<проект>-install.log 2>&1; echo "install exit $?"
grep -c "FormInput" node_modules/@boobooking/dashboard-ui-components/dist/index.js
git status -s
```

Expected: первый `git status -s` пуст (иначе проект не трогается — вопрос владельцу); `before exit 0`, итоговая строка тестов — база; `install exit 0`; `grep` больше 0; второй `git status -s` пуст.

Снимок «до»: приложение отдаёт собранные файлы (`public/build`, у cashback — `public/dashboard/build`; `public/hot` нет), поэтому до Step 4 оно показывает прежние формы. chrome-devtools, `https://<проект>.test`, 1280×900, страница создания пользователя (адрес — `docker exec <backend> php artisan route:list --name=user` или навигацией) → `take_screenshot` в `$W/t5-<проект>-before.png`. Сеанс просрочен (редирект на `/login`) — остановиться и попросить владельца войти в этом Chrome.

- [ ] **Step 3: Правка форм**

В каждом файле таблицы каждый блок поля — внешний `<div>` с подписью, `<dot>` и обёрткой `<input>` — заменяется одной строкой `<form-input v-model="<переменная v-model поля>" label="<текст подписи без пробелов по краям>" :is-required="<выражение v-show точки>"/>`; у поля с `type="password"` добавляется `type="password"`, остальные (`type="text"`, в том числе Email) — без `type`. Соседние комментарии остаются. В импорте из пакета и в `components` `Dot` заменяется на `FormInput`. Данные, watchers, методы, подсказки и `<error-messages>` не меняются; `Auth/Login.vue` не трогается.

```bash
for f in <файлы проекта>; do echo "$f dot=$(grep -c '<dot' resources/js/Pages/$f) input=$(grep -c '<input' resources/js/Pages/$f) form-input=$(grep -c '<form-input' resources/js/Pages/$f) Dot=$(grep -cw 'Dot' resources/js/Pages/$f)"; done
git diff --stat
```

Expected: в каждом файле `dot=0 input=0 Dot=0`, `form-input` — число полей из спеки §11 (Create — 3, Edit — 2, остальные — 1); меняются только файлы таблицы.

- [ ] **Step 4: Сборка**

```bash
npm run build > $W/t5-<проект>-build.log 2>&1; echo "build exit $?"; grep -E "built in|rror" $W/t5-<проект>-build.log
```

Expected: `build exit 0`, `✓ built in …`, без ошибок и предупреждений Vue. Сборка certificates стирает выложенный Playground — Task 4 к этому моменту пройден.

- [ ] **Step 5: Приёмка в приложении**

chrome-devtools, `https://<проект>.test`, 1280×900; адреса страниц — `route:list` или навигацией. Записей и данных не создавать: кнопки отправки нажимать только с пустыми или неверными полями.

- создание пользователя: «Создать» с пустыми полями → три точки и красная строка; ввод в поле снимает его точку; клик по второй и третьей подписи ставит курсор в своё поле; неверный email (`abc`) и Email из одних пробелов при заполненных остальных полях → точки нет, запрос уходит, ошибка сервера в `ErrorMessages` — как до перевода;
- редактирование, смена пароля пользователя, смена своего пароля → стереть поле — точка и красная строка, ввод — снимается;
- certificates, закрытие группы → точка видна, пока номер пуст;
- payments, создание и редактирование агента → точка у Name как выше;
- вид полей — как на снимке `$W/t5-<проект>-before.png` (снимок «после» той же страницы — `$W/t5-<проект>-after.png`, сравнить глазами); консоль без ошибок.

Изменения проекта остаются незакоммиченными до Task 9. Результаты — в `$W/acceptance.md`.

Решение владельца 2026-10-18: снимки «до» и «после» (Step 2, Step 5) и приёмка в приложениях (Step 5) не выполняются — в Chrome chrome-devtools нет входа в приложения. Сборки (Step 4) выполняются.

---

### Task 6: Итоговое ревью

**Files:** только файлы исправлений.

- [ ] **Step 1: Пакет ревью**

```bash
BASE=$(cat $W/base-sha) && git log --oneline $BASE..HEAD
for p in /Users/boobooking/Code/mars/cashback /Users/boobooking/Code/mars/certificates/src /Users/boobooking/Code/payments; do git -C $p diff; done > $W/consumers.diff
```

Пакет — скриптом superpowers `subagent-driven-development/scripts/review-package docs/superpowers/plans/2026-10-16-form-input.md $BASE HEAD`.

- [ ] **Step 2: Ревьюер**

Свежий ревьюер на самой сильной доступной модели (указывается явно) по `superpowers:requesting-code-review`: пакет ревью, `$W/consumers.diff`, спека, этот план, раздел Review Focus дословно, `$W/acceptance.md`, решения из журнала исполнения. Тесты ревьюер запускает только `npm test -- --dir tests`.

- [ ] **Step 3: Исправления**

Замечания всех уровней — исправления, каждое отдельно. В библиотеке: тест, который сначала падает (документы — без теста), исправление, весь набор (как в Task 1 Step 6) с `0` в проверке чистоты, коммит `fix:` на каждое. В проектах: правка остаётся в незакоммиченном переводе до Task 9, после неё — сборка проекта (Task 5 Step 4) и заново `$W/consumers.diff` (Step 1) для проверки. Исправление, меняющее вид или поведение, — повторить затронутые шаги Task 3–5 (для проектов — новый архив `npm pack` тем же путём). Замечание, которое нельзя исправить без отхода от спеки, — согласовать до правки.

---

### Task 7: Версия `0.18.0`

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1: Версия и проверка**

```bash
npm version 0.18.0 --no-git-tag-version && git diff | grep -E "^[-+].*\"version\""
npm test -- --dir tests --reporter=verbose > $W/t7-suite.log 2>&1; echo "tests exit $?"; grep -E "Test Files|Tests " $W/t7-suite.log
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t7-suite.log
npm run build > $W/t7-build.log 2>&1; echo "build exit $?"
```

Expected: три строки `0.17.1` → `0.18.0` (одна в `package.json`, две в `package-lock.json`); `tests exit 0`, всё passed; `0`; `build exit 0`.

- [ ] **Step 2: Коммит**

```bash
git add package.json package-lock.json && git commit -m "chore: поднять версию пакета до 0.18.0" && git status -s
```

Expected: `git status -s` пуст.

---

### Task 8: Публикация — после согласия владельца

- [ ] **Step 1: Согласие** — остановиться и спросить владельца: публикуется `0.18.0` — пуш `main` и тега `v0.18.0`, коммиты `$(cat $W/base-sha)..HEAD`. Без явного согласия дальше не идти.

- [ ] **Step 2: `main` и `Test`**

```bash
git fetch origin && git status -sb | head -n 1
```

Expected: `## main...origin/main [ahead N]` — только впереди. Позади — остановиться и сообщить владельцу.

Запуск workflow выбирается по полному SHA версионного коммита: он появляется не сразу после пуша.

```bash
SHA=$(git rev-parse HEAD)
git push origin main
for attempt in $(seq 1 24); do
    TEST_ID=$(gh run list --workflow Test --commit "$SHA" --json databaseId --jq '.[0].databaseId')
    [ -n "$TEST_ID" ] && break
    sleep 5
done
echo "Test run: $TEST_ID"
gh run watch "$TEST_ID" --exit-status; echo "test exit $?"
```

Expected: номер не пуст; `test exit 0` — джобы `test` и `vue-floor` успешны. Если оболочка не даёт `sleep` в переднем плане — цикл в фоне или через Monitor. Пустой номер после двух минут или `test exit` не `0` — остановиться, тег не ставить.

- [ ] **Step 3: Тег и публикация**

```bash
git tag v0.18.0 "$SHA" && git push origin v0.18.0
for attempt in $(seq 1 24); do
    PUBLISH_ID=$(gh run list --workflow Publish --commit "$SHA" --json databaseId --jq '.[0].databaseId')
    [ -n "$PUBLISH_ID" ] && break
    sleep 5
done
echo "Publish run: $PUBLISH_ID"
gh run watch "$PUBLISH_ID" --exit-status; echo "publish exit $?"
npm view @boobooking/dashboard-ui-components@0.18.0 version --prefer-online
npm view @boobooking/dashboard-ui-components dist-tags.latest --prefer-online
```

Expected: номер не пуст; `publish exit 0`; оба `npm view` — `0.18.0`. `E404` сразу после публикации — задержка registry: повторять, пока не совпадут.

---

### Task 9: Проекты на `^0.18.0`

Для каждого проекта таблицы Task 5:

- [ ] **Step 1: Установка, сборка, тесты**

```bash
cd <каталог>
npm install @boobooking/dashboard-ui-components@^0.18.0 > $W/t9-<проект>-install.log 2>&1; echo "install exit $?"
grep '"@boobooking/dashboard-ui-components"' package.json
node -p "require('./node_modules/@boobooking/dashboard-ui-components/package.json').version"
npm run build > $W/t9-<проект>-build.log 2>&1; echo "build exit $?"
<тесты> > $W/t9-<проект>-after.log 2>&1; echo "after exit $?"
git status -s
```

Expected: `install exit 0`; `"^0.18.0"`; `0.18.0`; `build exit 0`; `after exit 0` и та же итоговая строка тестов, что в Task 5 Step 2; `git status -s` — файлы Task 5, `package.json`, `package-lock.json`; в lock-файле меняются только записи `@boobooking/dashboard-ui-components`.

- [ ] **Step 2: Коммит**

```bash
git add <файлы Task 5> package.json package-lock.json
git commit -m "<сообщение>" && git status -s && git log --oneline -1
```

Сообщения: cashback и certificates — `refactor: перевести поля форм на FormInput из пакета 0.18.0`; payments — `refactor: switch form fields to FormInput from dashboard-ui-components 0.18.0`. Expected: `git status -s` пуст. Пушит владелец.

---

### Task 10: Уборка и отчёт

- [ ] **Step 1: Временные файлы**

```bash
rm -rf ~/Code/mars/certificates/src/public/build/ui-playground $S/parity $S/parity-shots $S/playground-check $S/pw
git -C /Users/boobooking/Code/dashboard-ui-components status -s
```

Expected: `git status -s` пуст. Вкладки chrome-devtools приёмки закрыть.

- [ ] **Step 2: Отчёт**

Сообщение Codex о конце реализации (что сделано и проверено, согласованные отличия, что не проверялось), затем отчёт владельцу: коммиты библиотеки, строки тестов, сверка вида, приёмка Playground и проектов, запуски `Test` и `Publish`, `npm view`, коммиты трёх проектов (их пушит владелец). Каталог `$W` удалить после отчёта.

---

## Отличия от спеки

- Тесты запускаются с `--dir tests` (спека §10 пишет `npm test`): в `.codex-advisor/` лежат копии ревьюера, на CI папки нет.
- `playground/shell.css` меняется (класс `.demo-form` — столбец полей шириной карточки); в списке файлов спеки §14 его нет.
- Базовые тесты проектов снимаются до правок (Task 5 Step 2) и сравниваются после установки `0.18.0` (Task 9).
