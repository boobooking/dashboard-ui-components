# fieldClass — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** проп `fieldClass` у `FormInput` и `FormTextarea`: классы приложения только на `<input>` / `<textarea>`.

**Architecture:** `:class="fieldClass"` на поле рядом со статическим `class` пакета; сторож классов пропускает этот идентификатор в двух файлах.

**Tech Stack:** Vue 3.5 (Options API), Tailwind 4 с префиксом `bb`, vitest + happy-dom, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-04-field-class-design.md`.

## Global Constraints

- **Ветка:** `feat/field-class` от `main` (`342930f`). Версия, тег, слияние — по слову владельца.
- **Проп:** `fieldClass: { type: [String, Array, Object], default: null }`; классы только на поле; `class`/`style` — на корне, как сейчас.
- **Код:** классы пакета литералами с префиксом `bb:`; комментарии по-русски, без истории; существующие не удалять.
- **Коммиты:** conventional commits по-русски, без латиницы внутри русских слов, без `--no-verify`.
- **Отклонения:** остановиться и сообщить с доказательством; план не менять.
- **Проверка:** `npx vitest run --dir tests`, вывод чистый.

## Review Focus

1. Классы приложения не попадают на подпись, описание, счётчик. Тест — Task 1.
2. Смена `fieldClass` после монтирования. Тест — Task 1.
3. Утилита приложения сильнее ресета `font: inherit` на странице с Tailwind. Тест — Task 2.
4. Значение не того типа — без падения. Тест — Task 1.
5. Сторож не пропускает `:class="fieldClass"` в других файлах. Тест — Task 1.

---

### Task 1: Проп, сторож, unit-тесты

**Files:**
- Modify: `src/components/FormInput.vue`, `src/components/FormTextarea.vue`, `tests/FormInput.test.js`, `tests/FormTextarea.test.js`, `tests/utilityPrefix.test.js`

- [ ] **Step 1: Написать падающие тесты**

В обоих файлах тестов одна таблица (`it.each`) по значениям `'font-mono'`, `['font-mono', 'text-xs']`, `{ 'font-mono': true, 'text-xs': false }`:

```js
// монтирование с description (и characterLimit у FormTextarea), чтобы описание и счётчик были в DOM;
// поле: содержит ожидаемые классы приложения и bb:field-frame; корень, label,
// FieldDescription (и CharacterCounter у FormTextarea) — без 'font-mono'
it.each(cases)('fieldClass %j — только на поле', ...)
it.each([[null], [''], [[]], [{}]])('fieldClass %j — на поле только классы пакета', ...)
it('смена fieldClass после монтирования', ...)        // setProps 'font-mono' → 'text-xs': новый класс есть, прежнего нет
it('class со страницы — на корне, не на поле', ...)   // attrs: { class: 'mt-4' }
it.each([[5], [true]])('fieldClass %j — предупреждение о типе, без ошибок', ...)
```

`tests/utilityPrefix.test.js`: тест, что шаблон `<input :class="fieldClass">` с именем файла `FormInput.vue` / `FormTextarea.vue` принимается, а с другим именем (например, `Search.vue`) — ошибка «форма Identifier».

- [ ] **Step 2: Запустить — падают**

Run: `npx vitest run --dir tests tests/FormInput.test.js tests/FormTextarea.test.js tests/utilityPrefix.test.js`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

Проп `fieldClass` в обоих компонентах (комментарий: классы приложения для самого поля; подпись — стиль пакета). На `<input>` / `<textarea>` — `:class="fieldClass"`. В `classLiterals` (`tests/utilityPrefix.test.js`, ветка `Identifier`) — исключение `fieldClass` для `FormInput.vue` и `FormTextarea.vue` с комментарием по образцу `panelClass` и `$attrs.class`.

- [ ] **Step 4: Запустить — проходят**

Run: `npx vitest run --dir tests` — всё зелёное, вывод чистый. `npm run build` — без предупреждений.

- [ ] **Step 5: Закоммитить**

```bash
git add src/components/FormInput.vue src/components/FormTextarea.vue tests
git commit -m "feat: добавить проп fieldClass полям FormInput и FormTextarea"
```

### Task 2: Playground, браузерная проверка, README

**Files:**
- Modify: `playground/App.vue`, `playground/bare.css` (если нужно), `e2e/formTextarea.e2e.js`, `README.md`

- [ ] **Step 1: Playground** — в разделе `FormTextarea` поле «Ключи» с `field-class="font-mono"` (и с классом из `bare.css` для голой страницы, если `font-mono` там не собирается — тогда демо передаёт оба класса).
- [ ] **Step 2: e2e** — в `e2e/formTextarea.e2e.js`, обе страницы: у `<textarea>` «Ключи» `font-family` содержит `monospace` (или моноширинное семейство темы), у его подписи `font-family` равен `font-family` подписи поля «Комментарий».
- [ ] **Step 3: Запустить** — `npm run test:browser`: всё проходит в Chromium и WebKit, `consoleProblems` пуст.
- [ ] **Step 4: README** — по разделу 6 спеки: строка `fieldClass` в таблицах `FormInput` и `FormTextarea`, абзац о `class` на корне и `fieldClass` на поле с примером `font-mono`, правило в «Правила API пакета».
- [ ] **Step 5: Закоммитить**

```bash
git add playground e2e/formTextarea.e2e.js README.md
git commit -m "docs: описать fieldClass и показать в Playground"
```

### Task 3: Приёмка

- [ ] Выложить Playground (`npm run build`, сборка в `~/Code/mars/certificates/src/public/build/ui-playground`, `200` на обе страницы); Chrome — исполнитель, Safari — владелец. Версию не трогать.
