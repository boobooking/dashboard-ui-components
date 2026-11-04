# Рамка фильтров RussianMobileFilter и Search — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `RussianMobileFilter` и `Search` сами рисуют высоту 72px и рамку `gray-200`, как остальные фильтры.

**Architecture:** три класса на корне двух компонентов; тесты, демо в «Панели фильтров», README.

**Tech Stack:** Vue 3.5, Tailwind 4 с префиксом `bb`, vitest + happy-dom, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-04-filter-frame-design.md`.

## Global Constraints

- **Ветка:** `fix/filter-frame` от `main` (`0e553e8`). Версия, тег, слияние — по слову владельца.
- **Корень обоих:** `bb-dashboard-ui bb:flex bb:flex-none bb:h-18 bb:border bb:border-gray-200`; остальное не трогать.
- **Код:** классы литералами с префиксом `bb:`; комментарии по-русски, без истории.
- **Коммиты:** conventional commits по-русски, без латиницы внутри русских слов, без `--no-verify`.
- **Отклонения:** остановиться и сообщить с доказательством.
- **Проверка:** `npx vitest run --dir tests`, вывод чистый; `npm run test:browser`.

## Review Focus

1. Страница с классами `h-18 border border-gray-200` (и `ml-2`) — без предупреждений, вид прежний. Тест — Task 1 Step 1.
2. Высота и рамка совпадают с `SelectSingleFilter` в одном ряду. Тест — Task 1 Step 3.
3. Классы приложения на корне `Search` перекрывают цвет рамки (payments). Покрыто правилом каскада; отдельного теста нет — README.

---

### Task 1: Рамка, тесты, Playground, README

**Files:**
- Modify: `src/components/RussianMobileFilter.vue`, `src/components/Search.vue`, `tests/RussianMobileFilter.test.js`, `tests/Search.test.js`, `playground/App.vue`, `README.md`
- Create: `e2e/filterFrame.e2e.js`

- [ ] **Step 1: Падающие unit-тесты** — в обоих файлах:

```js
it('корень — высота и рамка фильтра', ...)   // wrapper.classes() содержит bb:h-18, bb:border, bb:border-gray-200
it('классы страницы — на корне вместе с рамкой пакета', ...) // attrs { class: 'ml-2 h-18 border border-gray-200' }; errors и warnings пусты
```

Run: `npx vitest run --dir tests tests/RussianMobileFilter.test.js tests/Search.test.js` — FAIL.

- [ ] **Step 2: Реализация** — классы на корне по Global Constraints. Run: `npx vitest run --dir tests` — всё зелёное.

- [ ] **Step 3: Playground и e2e** — в «Панели фильтров» (`playground/App.vue`, раздел `<h2>Панель фильтров</h2>`) добавить `<russian-mobile-filter header="Телефон">` и `<search header="Поиск">` в ряд; обновить комментарий раздела (число фильтров). `e2e/filterFrame.e2e.js`, цикл по `pages`: у каждого прямого потомка ряда (`.demo-row > .bb-dashboard-ui`) высота 72px (`boundingBox`), `border-top-width` `1px`, `expectColor(…, 'border-top-color', 'gray-200')`. Run: `npm run test:browser` — всё проходит в Chromium и WebKit, `consoleProblems` пуст.

- [ ] **Step 4: README** — по разделу 6 спеки.

- [ ] **Step 5: Коммит**

```bash
git add src/components/RussianMobileFilter.vue src/components/Search.vue tests playground/App.vue e2e/filterFrame.e2e.js README.md
git commit -m "fix: рисовать рамку фильтра у RussianMobileFilter и Search"
```

### Task 2: Приёмка

- [ ] Выложить Playground (`npm run build`, сборка в `~/Code/mars/certificates/src/public/build/ui-playground`, `200` на обе страницы); Chrome — исполнитель, Safari — владелец. Версию не трогать.
