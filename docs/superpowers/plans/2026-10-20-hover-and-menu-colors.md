# Наведение мыши без фокуса и цветные пункты меню — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Наведение мыши в списках и меню пакета подсвечивает пункт, но фокус не меняет: фокус меняют клавиатура и клик.
- Цветные пункты меню получают фон своего цвета всегда.
- Всё входит в выпуск `0.20.0`.

**Architecture:**
- Из `src/menuFocus.js` уходит обработчик `mousemove`.
- Подсветку под мышью дают классы `hover` у `ListElement` и у пунктов `PopoverMenu`.
- `SelectSingle` сам ставит фокус на нажатый пункт перед закрытием, как `SelectMultiple`.
- Цвета пунктов меню — набор `menuItem` в `src/colors.js`.

**Tech Stack:** Vue 3.5 (Options API), vitest + happy-dom, Tailwind 4 с префиксом `bb`, chrome-devtools MCP, playwright-core (WebKit), если установлен.

**Spec:** `docs/superpowers/specs/2026-10-20-hover-and-menu-colors-design.md`.

## Global Constraints

- **Ветка:** основная рабочая копия, ветка `feature/select-filter-form`. Публикация — только в Task 5 плана `2026-10-20-select-filter-form.md`, с согласия владельца.
- **Мышь и фокус:** движение мыши фокус не ставит нигде. Стрелки, Tab, Escape, `findStops`, `findSelected`, `keepSize` и возврат фокуса работают как сейчас.
- **Классы:**
  - `ListElement` — `bb:hover:bg-indigo-100` рядом с `bb:focus:bg-indigo-100`;
  - пункт меню без цвета — `bb:hover:bg-gray-100 bb:hover:text-gray-900` рядом с фокусными;
  - `menuItem` каждого цвета — `bb:bg-<тон>-100 bb:text-<тон>-800 bb:hover:bg-<тон>-200 bb:focus:bg-<тон>-200`.
- **Код и коммиты:**
  - стиль, префикс `bb:` и литеральные `:class` — как в пакете;
  - комментарии по-русски;
  - коммиты — conventional по-русски, без `--no-verify`, без пуша.
- **Проверки:**
  - тесты `npm test -- --dir tests`, база 50 файлов / 1234 теста;
  - чистый вывод — grep из плана `2026-10-20-select-filter-form.md`, ожидается `0`;
  - обе сборки (`npm run build`, `npx vite build --config vite.playground.config.js`) без предупреждений.
- **Отклонения:** исполнитель: «If you cannot follow the plan or spec as written, stop and report the deviation with evidence; do not change the plan.»

## Review Focus

- **Фокус в поле поиска `SelectMultiple`, мышь над пунктами** — фокус остаётся в поле. Тест — Task 10.
- **Клик по пункту `SelectSingle…` без предварительного фокуса** (Safari) — выбор и возврат фокуса на кнопку. Тест — Task 10; приёмка — Task 12.
- **Стрелка после движения мыши над другим пунктом** — продолжение от пункта в фокусе. Тест — Task 10.
- **Мышь покинула меню** — под ней ничего не подсвечено, пункт в фокусе клавиатуры подсвечен. Приёмка — Task 12.
- **Красный пункт меню в покое** — фон `-100`, под мышью и в фокусе `-200`. Тест — Task 11.

---

### Task 10: наведение без фокуса

**Files:**
- Modify:
  - `src/menuFocus.js`
  - `src/components/ListElement.vue`, `src/components/PopoverMenu.vue` (пункт без цвета)
  - `src/components/SelectSingle.vue`
  - `src/components/PopoverPanel.vue` (комментарий у `arrows`), `src/components/SelectMultiple.vue` (комментарий у перенаправления набора)
- Test: `tests/menuFocus.test.js`, `tests/SelectMultiple.test.js`, `tests/SelectSingleWrappers.test.js` (или `SelectSingle.test.js`), тесты классов `ListElement` и `PopoverMenu`.

**Interfaces:**
- `moveMenuFocus(menu, findSelected, findStops)` — сигнатура прежняя. Слушателя `mousemove` нет, функция снятия снимает только `keydown`.
- `SelectSingle.itemClicked(item)` — до закрытия списка синхронно ставит фокус на кнопку нажатого пункта (`focus({ preventScroll: true })`), как `SelectMultiple.itemClicked`.

- [ ] **Step 1: Тесты (падают):**
  - `menuFocus.test.js`: тесты «движение мыши ставит фокус…» (строки ~98, ~109, ~128, ~203) заменяются тестами «движение мыши по пункту фокус не ставит», «…вне пунктов фокус не трогает», «после снятия — тоже»; стрелки без изменений;
  - `SelectMultiple.test.js`:
    - «ластик поля вне стрелок и мыши» (~852) без опоры на `mousemove`;
    - новый тест: список открыт, фокус в поле поиска, `mousemove` по пункту — фокус в поле.
  - `SelectSingleFilter` и `SelectSingleForm`: список открыт, `document.body.focus()`, клик по пункту — выбор `b`, `document.activeElement` — кнопка списка;
  - стрелка после `mousemove` над другим пунктом — фокус на соседе пункта в фокусе, а не пункта под мышью;
  - Tab после `mousemove` над другим пунктом — следующая остановка после пункта в фокусе, а не после пункта под мышью;
  - классы `hover` у `ListElement` и у пункта меню без цвета.

  Ошибки и предупреждения Vue пустые.
- [ ] **Step 2: Запуск** — FAIL.
- [ ] **Step 3: Код** — как в Interfaces и Global Constraints. Комментарии в `menuFocus.js`, `PopoverMenu.vue` («hover-стилей нет»), `PopoverPanel.vue`, `SelectMultiple.vue` переписываются под новое поведение.
- [ ] **Step 4: Прогон** — тесты зелёные, чистый вывод `0`, обе сборки.
- [ ] **Step 5: Commit** — `git commit -m "fix: не переводить фокус наведением мыши"`.

### Task 11: фон цветных пунктов меню

**Files:**
- Modify: `src/colors.js`
- Test: `tests/colors.test.js`, `tests/DropdownButtonWithAction.test.js`, `tests/HamburgerMenu.test.js`

**Interfaces:**
- `COLORS.<тон>.menuItem` = `bb:bg-<тон>-100 bb:text-<тон>-800 bb:hover:bg-<тон>-200 bb:focus:bg-<тон>-200` для `gray`, `green`, `yellow`, `red`, `indigo`, `purple`. Комментарий в `colors.js` о `menuItem` обновляется.

- [ ] **Step 1: Тесты (падают):**
  - `colors.test.js` — новая строка схемы `menuItem`;
  - `DropdownButtonWithAction.test.js` и `HamburgerMenu.test.js`:
    - цветной пункт имеет `bb:bg-red-100`, `bb:text-red-800`, `bb:hover:bg-red-200`, `bb:focus:bg-red-200` и не имеет `bb:bg-red-400`;
    - `it.each` по цветам — через `colorClass(color, 'menuItem')`;
    - прежние ожидания `bb:focus:bg-yellow-100` и `bb:focus:bg-red-100` заменяются новыми классами.
- [ ] **Step 2: Запуск** — FAIL.
- [ ] **Step 3: Код** — `src/colors.js`.
- [ ] **Step 4: Прогон** — тесты зелёные, чистый вывод `0`, обе сборки.
- [ ] **Step 5: Commit** — `git commit -m "fix: дать цветным пунктам меню фон своего цвета"`.

### Task 12: README и приёмка

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README** — по спеке §6:
  - таблица цветов;
  - разделы `SelectSingleFilter`, `SelectMultipleFilter` (и поиск), `DropdownButtonWithAction`, `HamburgerMenu`: наведение подсвечивает, фокус меняют клавиатура и клик, две подсветки возможны;
  - «Обновление с 0.19» — две строки: наведение без фокуса; фон цветных пунктов меню, например красный «Удалить» / «Delete».
- [ ] **Step 2: Проверки** — тесты, чистый вывод, обе сборки.
- [ ] **Step 3: Commit** — `git commit -m "docs: описать наведение без фокуса и цвета пунктов меню"`.
- [ ] **Step 4: Приёмка в браузере** — выполняет основная сессия, по спеке §7, в обоих окружениях Playground (статическая сборка в `~/Code/mars/certificates/src/public/build/ui-playground`). Возврат фокуса после выбора мышью — дополнительно в WebKit через playwright, если он есть в `node_modules`; иначе отметить непроверенным.

---

## Дополнение: возврат фокуса меню и браузерные тесты (спека §9, §10)

Тим после приёмки: исправить потерю фокуса меню в Safari в этом выпуске,
тесты обязательны, Safari проверяется автоматически, браузерные тесты —
только локально, без GitHub Actions. База — `cbfd8e0`.

**Global Constraints дополнения** (вместе с прежними):

- **Версия Playwright:** `@playwright/test` точно `1.63.0` (devDependency, без `^`).
- **Проверки:**
  - unit-тесты и чистый вывод — как прежде, база 50 файлов / 1242 теста;
  - браузерные — `npm run test:browser`: все тесты зелёные в `chromium` и `webkit`, вывод без ошибок; `npx playwright test --list` находит тесты из `e2e/*.e2e.js`.
- **Красный до исправления:**
  - unit: новые тесты §9, кроме теста «чужой фокус сохраняется», падают в Task 13 Step 2 — до правки `src`; лог этого прогона — в отчёт Task 13. Исходники не подменяются;
  - браузер: тесты возврата фокуса меню в `webkit` падают на `src` из `cbfd8e0`. Проверка — только в Task 14, после коммита Task 13 и при чистых `src/components/PopoverMenu.vue` и `src/components/PopoverPanel.vue`: `git checkout cbfd8e0 -- src/components/PopoverMenu.vue src/components/PopoverPanel.vue`, `npm run test:browser -- e2e/menuFocus.e2e.js --project=webkit` (сборка `dist` для Playground — внутри скрипта), затем `git checkout HEAD -- src/components/PopoverMenu.vue src/components/PopoverPanel.vue` и `git status` чистый по этим файлам. Лог — в отчёт Task 14.
- **Отклонения:** исполнитель: «If you cannot follow the plan or spec as written, stop and report the deviation with evidence; do not change the plan.»

**Review Focus дополнения:**

- **Модалка из пункта меню, кадр модалки раньше `toggle`** — после закрытия модалки фокус на кнопке меню. Тест — Task 13.
- **`onSelect` перевёл фокус на элемент страницы** — фокус не забирается. Тест — Task 13.
- **Ссылка-пункт с `navigate`** — `navigate` вызывается как прежде, фокус на кнопке меню. Тест — Task 13.
- **WebKit на macOS** — браузерные тесты меню падают на старом коде и проходят на новом. Проверка — Task 14.
- **Тест без ожиданий-задержек** — ни одного `waitForTimeout` в `e2e/`. Ревью — Task 14.

### Task 13: возврат фокуса меню

**Files:**
- Modify: `src/components/PopoverMenu.vue`, `src/components/PopoverPanel.vue`, `README.md`
- Test: `tests/DropdownButtonWithAction.test.js`, `tests/HamburgerMenu.test.js` (общий помощник модели Safari — в `tests/`, если нужен обоим)

**Interfaces:**
- `PopoverMenu`: `<popover-panel … close-on-click return-focus …>`; ссылка `@click="linkClicked($event, item.href)"`, кнопка `@click="select(item, $event)"`.
- `PopoverMenu.linkClicked(event, href)`: `event.currentTarget.focus({ preventScroll: true })`, затем `this.followLink(event, href)`.
- `PopoverMenu.select(item, event)`: сначала тот же `focus`, затем прежнее тело с `return item.onSelect()`.
- `PopoverPanel.onClick()`: при `closeOnClick` — `this.close(); this.restoreFocus(this.$refs.panel);`.
- Комментарии по-русски, вечнозелёные: зачем фокус на пункт перед закрытием (Safari), зачем возврат сразу после `close()` (модалка запоминает фокус в кадре).

- [ ] **Step 1: Тесты (падают)** — список спеки §9 для обоих меню. Модель Safari:
  - фокус до открытия на body;
  - клик через `element.click()` фокус не ставит;
  - при скрытии панели фокус с пункта снимается (`blur`).
  Образец — проба Codex `.codex-advisor/sessions/2026-10-20-select-filter-form/menu-modal-order-probe-source.txt`: `installPopoverStub`/`flushToggles` из `tests/popoverStub.js`, `requestAnimationFrame` через `vi.stubGlobal`, два порядка — `toggle-first` и `frame-first`. Ошибки и предупреждения Vue пустые.
- [ ] **Step 2: Запуск** — новые тесты FAIL (кроме «чужой фокус сохраняется»).
- [ ] **Step 3: Код** — как в Interfaces.
- [ ] **Step 4: README** — по спеке §9: разделы `DropdownButtonWithAction` и `HamburgerMenu`, строка в «Обновление с 0.19».
- [ ] **Step 5: Прогон** — тесты зелёные, чистый вывод `0`, обе сборки. В отчёт — лог красного прогона Step 2 и зелёного прогона.
- [ ] **Step 6: Commit** — `git commit -m "fix: возвращать фокус на кнопку меню после закрытия в Safari"`.

### Task 14: браузерные тесты в Chromium и WebKit

**Files:**
- Create: `playwright.config.js`, `e2e/menuFocus.e2e.js`, `e2e/hover.e2e.js` (общие помощники — `e2e/helpers.js`)
- Modify: `package.json`, `package-lock.json`, `.gitignore`, `README.md`
- Не меняются: `.github/workflows/*` — браузерные тесты только локальные (решение Тима).

**Interfaces:**
- `playwright.config.js`, значения из спеки §10: `testDir`, `testMatch`, проекты, `webServer`, `baseURL`.
- `package.json`:
  - `"test:browser": "npm run build && playwright test"`;
  - `"@playwright/test": "1.63.0"` в devDependencies.
- `e2e/helpers.js`:
  - фикстура или функция, которая до `goto` собирает `console` error/warning и `pageerror`, а после теста ожидает пустой список;
  - локаторы примеров Playground по заголовкам: `h2`/`h3` и подпись «Шапка», как в приёмочных скриптах `.superpowers/sdd/2026-10-20-hover-and-menu-colors/hover-accept.mjs` и `menu-focus-trace.mjs` (в git не входят; там же логи трасс до и после прототипа);
  - сравнение цвета с токеном `--bb-color-<имя>` через пробный элемент, как там же.
- Страница — параметр: `for (const file of ['index.html', 'host.html'])` вокруг `test.describe`.

- [ ] **Step 1: Зависимость и конфигурация:**
  - `npm install --save-dev --save-exact @playwright/test@1.63.0`;
  - `playwright.config.js`, `.gitignore`, скрипт;
  - `npx playwright test --list` до тестов — «No tests found» или пустой список без ошибок конфигурации.
- [ ] **Step 2: Тесты** — содержание спеки §10:
  - `menuFocus.e2e.js` — для `DropdownButtonWithAction` («Несколько действий») и `HamburgerMenu`, модалка — меню в разделе `ConfirmationModal`;
  - `hover.e2e.js` — приёмка §7.
  Ожидания только через `expect(...)` Playwright, без `waitForTimeout`.
- [ ] **Step 3: Прогон:**
  - `npx playwright test --list` находит оба файла в обоих проектах;
  - `npm run test:browser` — всё зелёное;
  - красный прогон на `src` из `cbfd8e0` — ровно последовательность из Global Constraints дополнения: падают тесты возврата фокуса меню в `webkit`; затем `src` возвращён из `HEAD` (там уже коммит Task 13).
- [ ] **Step 4: README** — раздел «Playground»: `npm run test:browser` и установка браузеров, по спеке §10.
- [ ] **Step 5: Проверки:**
  - `npm test -- --dir tests` и чистый вывод `0`;
  - обе сборки;
  - `npm run test:browser`;
  - `git status` чистый: `test-results` и `playwright-report` в `.gitignore`.
- [ ] **Step 6: Commit** — `git commit -m "test: проверять Playground в Chromium и WebKit"`.
