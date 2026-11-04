# Общая рамка поля — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** вид рамки поля формы задан одной утилитой `field-frame` в `src/styles/index.css`; 13 узлов переходят на неё; `ListSearchField` получает тень, лишний `leading-5` снимается.

**Architecture:** `@utility field-frame` рядом с `focus-ring` и `choice-border`; компоненты оставляют себе размеры, отступы, раскладку, `text-sm`, кольцо фокуса. Сторож в Vitest не даёт компоненту собрать рамку из классов.

**Tech Stack:** Vue 3.5, Tailwind 4 с префиксом `bb`, vitest, Playwright (Chromium, WebKit).

**Spec:** `docs/superpowers/specs/2026-11-04-field-frame-design.md` (Codex PASS, правки SPEC-001/002 в `eaf9766`).

## Global Constraints

- **Ветка:** `feat/form-textarea` (содержит принятый `FormTextarea`), версия пока `0.24.0`.
- **Утилита:** рамка 1px `gray-300`, `rounded-md` (0.375rem), белый фон, `shadow-xs`, `--bb-field-radius` равен скруглению рамки (одно значение, а не копия). `text-sm` в утилиту не входит.
- **Носители (узлов с `bb:field-frame`):** `FormInput` 1, `FormTextarea` 1, `AmountForm` 2, `AmountIntervalForm` 3, `SelectDateForm` 1, `SelectDateIntervalForm` 2, `SelectSingleForm` 1, `SelectMultipleForm` 1, `ListSearchField` 1.
- **Экран:** меняется только `ListSearchField` (появляется тень). Однострочные поля — 38px, `FormTextarea` — прежняя высота при том же `rows`.
- **Вне рамок:** кнопки, фильтры, панели, карточки и галочки.
- **Код:** классы литералами с префиксом `bb:`; комментарии по-русски, без истории; существующие комментарии не удалять, если они не стали ложными.
- **Коммиты:** conventional commits по-русски, без `--no-verify`.
- **Отклонения:** если план или спеку нельзя выполнить как написано — остановиться и сообщить с доказательством; план не менять.
- **Проверка:** `npx vitest run --dir tests`, вывод чистый.

## Review Focus

1. Поле суммы `AmountForm`/`AmountIntervalForm` и даты: кольцо фокуса внутри рамки скругляется по `--bb-field-radius`, как раньше. Тест — Task 2 (существующие e2e + вид рамок).
2. `FormTextarea` после снятия `leading-5`: высота при `rows=6` и `rows=10` прежняя (138/218). Тест — Task 2 (существующий `e2e/formTextarea.e2e.js`).
3. Поле поиска в панели в фокусе: тень и кольцо складываются, кольцо видно. Тест — Task 2.
4. Окружение приложения с `@tailwindcss/forms`: рамка, фон и тень полей не уступают плагину. Тест — Task 2, обе страницы.
5. Новый компонент пишет рамку классами в обход утилиты. Тест — Task 1, сторож.

---

### Task 1: Утилита, перевод носителей, сторож

**Files:**
- Modify: `src/styles/index.css`, `src/components/{FormInput,FormTextarea,AmountForm,AmountIntervalForm,SelectDateForm,SelectDateIntervalForm,SelectSingleForm,SelectMultipleForm,ListSearchField}.vue`
- Create: `tests/fieldFrame.test.js`
- Modify tests (без перевода падают ровно эти семь файлов — проба Codex): `tests/AmountForm.test.js` (`FRAME_CLASSES`), `tests/AmountInterval.test.js` (`FRAME_CLASSES`, строка ~435 `formClasses`), `tests/SelectCurrency.test.js` (~219), `tests/SelectSingleWrappers.test.js` (~291, ~301, ~310), `tests/SelectMultipleWrappers.test.js` (~244, ~254, ~263), `tests/SelectDateWrappers.test.js` (~216), `tests/SelectDateIntervalWrappers.test.js` (~320, ~355). `tests/FormInput.test.js` и `tests/FormTextarea.test.js` классы рамки не проверяют — не трогать.

**Interfaces:**
- Produces: класс `bb:field-frame`; `--bb-field-radius` на каждом узле-носителе.

- [ ] **Step 1: Написать падающие тесты**

`tests/fieldFrame.test.js` (`@vitest-environment node`):

```js
// Вывод утилиты — как tests/choiceBorder.test.js: compile(index.css).build(['bb:field-frame']).
it('утилита: рамка, скругление, фон, тень, --bb-field-radius', ...)
// css содержит .bb\:field-frame, border-width 1px (или border-style + width),
// border-color var(--bb-color-gray-300), border-radius var(--bb-radius-md),
// background-color var(--bb-color-white), box-shadow с --tw-shadow,
// --bb-field-radius со значением, связанным со скруглением (то же выражение, что у border-radius)

const carriers = [
    ['FormInput.vue', 1], ['FormTextarea.vue', 1], ['AmountForm.vue', 2], ['AmountIntervalForm.vue', 3],
    ['SelectDateForm.vue', 1], ['SelectDateIntervalForm.vue', 2], ['SelectSingleForm.vue', 1],
    ['SelectMultipleForm.vue', 1], ['ListSearchField.vue', 1],
]
it.each(carriers)('%s: bb:field-frame на %i узлах', ...)
// строки статического class="…" шаблона, в которых есть bb:field-frame; на них нет
// bb:rounded-md, bb:border, bb:border-gray-300, bb:bg-white, bb:shadow-xs, bb:[--bb-field-radius:…, bb:leading-5

it('сторож: ни в одном статическом class компонентов нет bb:border-gray-300', ...)
// все src/components/*.vue, только атрибуты class="…" (не :class): /(?<![:\w-])class="([^"]*)"/g
it('сторож: bb:[--bb-field-radius: нет ни в одном компоненте', ...)
```

Перевести существующие проверки: в `FRAME_CLASSES` и подобных списках классы рамки (`bb:rounded-md`, `bb:border`, `bb:border-gray-300`, `bb:bg-white`, `bb:shadow-xs`, `bb:[--bb-field-radius:0.375rem]`) заменяются одним `bb:field-frame`; остальные классы узла (`bb:h-9.5`, `bb:text-sm`, `bb:flex`, …) остаются. Проверки `bb:rounded-[var(--bb-field-radius,0)]` у вложенных узлов не меняются.

- [ ] **Step 2: Запустить — падают**

Run: `npx vitest run --dir tests tests/fieldFrame.test.js`
Expected: FAIL — утилиты и носителей нет.

- [ ] **Step 3: Реализовать**

`src/styles/index.css`, после `@utility choice-border`: `@utility field-frame` с комментарием (что задаёт, носители — поля форм и поле поиска панелей, что остаётся у компонентов, зачем `--bb-field-radius`). Скругление и `--bb-field-radius` — одно значение (например, тема `--radius-md`: `border-radius` и переменная через одно выражение).

В 13 узлах заменить классы рамки на `bb:field-frame`, снять `bb:leading-5` с рамок `FormInput`, `FormTextarea` и суммы `AmountForm`. Остальные классы узлов не трогать. Комментарии компонентов, упоминающие `--bb-field-radius` рамки, остаются верными (переменную по-прежнему задаёт рамка).

- [ ] **Step 4: Запустить — проходят**

Run: `npx vitest run --dir tests`
Expected: всё проходит, включая `utilityPrefix.test.js`, `focusRing.test.js`, `fieldDescription.test.js`; вывод чистый.

- [ ] **Step 5: Собрать**

Run: `npm run build`
Expected: без ошибок и предупреждений.

- [ ] **Step 6: Закоммитить**

```bash
git add src/styles/index.css src/components tests
git commit -m "refactor: вынести рамку поля в утилиту field-frame"
```

### Task 2: Браузерные проверки и README

**Files:**
- Create: `e2e/fieldFrame.e2e.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: `bb:field-frame` (Task 1); `test`, `expect`, `pages`, `openPlayground`, `expectColor`, `expectFocusRing` из `e2e/helpers.js`; открытие панели с поиском — как в `e2e/amount.e2e.js` «список с поиском» (`SelectSingleForm` «Вендор с поиском»).

- [ ] **Step 1: Написать браузерные тесты**

`e2e/fieldFrame.e2e.js`, цикл по `pages`:

- `все видимые рамки полей`: `page.locator('[class~="bb:field-frame"]:visible')` — поля поиска закрытых панелей остаются в DOM со `display: none`, `:visible` отсекает их до обхода; прокрутка для проверок computed style не нужна. У каждой `border-top-width` `1px`, `expectColor(..., 'border-top-color', 'gray-300')`, `border-top-left-radius` `6px`, `background-color` `rgb(255, 255, 255)`, `box-shadow` не `none`, `getComputedStyle(el).getPropertyValue('--bb-field-radius').trim()` непустая и строго равна `getPropertyValue('--bb-radius-md').trim()` того же элемента (собранный CSS пишет `.375rem` без ведущего нуля — сравнивается связь, а не строка; 6px проверяет `border-top-left-radius`; отклонение D-1, согласовано с Codex); число видимых больше 20 (защита от пустой выборки; полноту миграции проверяет таблица носителей Task 1).
- `поле поиска в панели` — отдельный сценарий: открыть панель «Вендор с поиском», затем её поле поиска — рамка, фон, скругление как выше, `box-shadow` не `none`; после фокуса — `expectFocusRing`.

- [ ] **Step 2: Запустить**

Run: `npm run test:browser`
Expected: всё проходит в Chromium и WebKit, включая существующие `amount.e2e.js` (высота 38px, вид поля суммы, кольцо), `formTextarea.e2e.js` (рамка как у `FormInput`, высоты `rows`), `fieldDescription.e2e.js`; `consoleProblems` пуст.

- [ ] **Step 3: Обновить README**

- После абзаца «Фокус у всех компонентов пакета выглядит одинаково…»: абзац о рамке — у полей форм одна рамка (1px `gray-300`, скругление 6px, белый фон, тень), задана утилитой `field-frame` в `src/styles/index.css`; поля: `FormInput`, `FormTextarea`, `SelectSingleForm`, `SelectCurrencyForm`, `SelectMultipleForm`, `SelectDateForm`, `SelectDateIntervalForm`, `AmountForm`, `AmountIntervalForm`, поле поиска в панелях списков.
- «Правила API пакета»: пункт — поле формы берёт рамку утилитой `bb:field-frame`, а не классами; сторож — `tests/fieldFrame.test.js`.

- [ ] **Step 4: Закоммитить**

```bash
git add e2e/fieldFrame.e2e.js README.md
git commit -m "docs: описать общую рамку поля, проверить в браузере"
```

### Task 3: Приёмка и версия

Общая с Task 4 плана `docs/superpowers/plans/2026-11-04-form-textarea.md`: одна выкладка Playground и одна приёмка владельца на `FormTextarea` и рамку.

- [ ] **Step 1: Выложить Playground** — как в том плане: `npm run build`, сборка Playground в `~/Code/mars/certificates/src/public/build/ui-playground`, `200` на `index.html` и `host.html`.
- [ ] **Step 2: Принять** — Chrome исполнитель, Safari владелец: поля форм не изменились, поле поиска в панели с тенью; раздел `FormTextarea`.
- [ ] **Step 3: Версия после итогового ревью и приёмки** — `npm version 0.25.0 --no-git-tag-version`, коммит `chore: поднять версию до 0.25.0`. Слияние и тег `v0.25.0` — только по слову владельца.
