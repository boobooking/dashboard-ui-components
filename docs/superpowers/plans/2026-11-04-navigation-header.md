# NavigationHeader — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** публичный `NavigationHeader` — шапка дашборда из `NavigationMenuElement` (пункты) и `HamburgerMenu` (меню профиля) с логотипом в слоте.

**Architecture:** компонент-композиция по образцу `PageTabs`: проверка `items` без падений, `activeKey` от страницы, `aria-label` из `i18n.js`. Существующие компоненты не меняются; `aria-current` уходит на `<a>` пункта через наследование атрибутов.

**Tech Stack:** Vue 3.5 (Options API), Tailwind 4 с префиксом `bb`, vitest + happy-dom, Playwright (Chromium, WebKit).

**Spec:** `docs/superpowers/specs/2026-11-04-navigation-header-design.md` (Codex PASS, правки SPEC-001/002 в `b732ef5`).

## Global Constraints

- **Ветка:** `feat/form-textarea`; версия уже `0.25.0` (`320d5b9`), нового коммита версии нет.
- **API:** `items: [{ key, name, url }]` (по умолчанию `[]`), `activeKey: String` (`null`), `actions: Array` (`[]`, уходит в `HamburgerMenu` как есть), `lang`, слот `logo`. Событий и `v-model` нет.
- **Вид:** `<nav>` белый, `shadow-sm`, строка `h-16` (64px), `px-8`, без порогов ширины; логотип в `shrink-0 flex items-center`, 32px до первого пункта; пункты через 32px на всю высоту строки; меню профиля справа.
- **Доступность:** `aria-label` шапки — «Разделы» / «Sections»; активный пункт — `aria-current="page"`.
- **Не трогать:** `NavigationMenuElement.vue`, `HamburgerMenu.vue`.
- **Код:** классы литералами с префиксом `bb:`; комментарии по-русски, без истории; тексты только в `src/i18n.js`.
- **Коммиты:** conventional commits по-русски, без латиницы внутри русских слов, без `--no-verify`.
- **Отклонения:** если план или спеку нельзя выполнить как написано — остановиться и сообщить с доказательством; план не менять.
- **Проверка:** `npx vitest run --dir tests`, вывод чистый.

## Review Focus

1. Страница передаёт `items` с ключом, которого нет, или `activeKey` от другого раздела — ни один пункт не выделен, ошибок нет. Тест — Task 1.
2. Пункт администратора появляется и исчезает при смене `items` — шапка перерисовывается без предупреждений. Тест — Task 1.
3. Пустые `actions` — кнопки меню нет, высота шапки та же. Тест — Task 1 (кнопки нет), Task 2 (высота).
4. Узкое окно десктопа (1024px) — пункты видны в одну строку. Тест — Task 2.
5. Цвет подчёркивания активного пункта проверяется без фокуса (в фокусе он `indigo-700`). Тест — Task 2.

---

### Task 1: Компонент

**Files:**
- Create: `src/components/NavigationHeader.vue`, `tests/NavigationHeader.test.js`
- Modify: `src/i18n.js`, `src/index.js`, `tests/exports.test.js`, `tests/ssrFixtures.js`

**Interfaces:**
- Produces: `NavigationHeader` (экспорт из `src/index.js` рядом с `NavigationMenuElement`); ключ `src/i18n.js` для `aria-label` шапки (`ru` «Разделы», `en` «Sections»).

- [ ] **Step 1: Написать падающие тесты**

`tests/NavigationHeader.test.js` по образцу `tests/PageTabs.test.js` (монтирование, сбор `errors`/`warnings`, плагин с `navigate`):

```js
it('пункты по порядку: href из url, подпись из name', ...)          // три пункта → три NavigationMenuElement
it('активный по activeKey: isActive и aria-current="page" только у него', ...)
it.each([['missing'], [null]])('activeKey %j — ни одного активного, aria-current нет', ...)
it('числовой ключ не равен строковому activeKey', ...)              // { key: 1 } и activeKey '1'
it.each([[null], ['строка'], [{}]])('items %j — пунктов нет, без ошибок', ...) // предупреждение Vue о типе допустимо, errors пуст
it('элементы-не-объекты пропускаются', ...)                          // [null, 'x', { key, name, url }] → один пункт
it('смена items: пункт администратора появляется и исчезает', ...)    // setProps, без warnings
it('actions уходят в HamburgerMenu', ...)                             // findComponent(HamburgerMenu).props('actions')
it('без actions кнопки меню нет', ...)
it('слот logo перед пунктами; без слота блока логотипа нет', ...)
it('aria-label: «Разделы» по умолчанию, «Sections» с lang en и с плагином en', ...)
it('lang доходит до HamburgerMenu', ...)
it('class и data-* — на корне nav', ...)
it('клик по пункту уходит в navigate плагина', ...)
```

`tests/exports.test.js`: `'NavigationHeader'` в списке; заголовок теста — тридцать шесть компонентов.
`tests/ssrFixtures.js`: `NavigationHeader: { props: { items: [{ key: 'a', name: 'Ордера', url: '/orders' }, { key: 'b', name: 'Группы', url: '/groups' }], activeKey: 'b', actions: [{ label: 'Выйти', href: '#' }] }, slots: { logo: '<img alt="Логотип" src="/logo.png">' } }` — если фикстуры не поддерживают слоты, без слота (см. формат файла).

- [ ] **Step 2: Запустить — падают**

Run: `npx vitest run --dir tests tests/NavigationHeader.test.js`
Expected: FAIL — компонента нет.

- [ ] **Step 3: Реализовать**

`src/components/NavigationHeader.vue`, миксин `withLang`; `items` — `{ type: Array, default: () => [] }`, вычисляемое `itemList` как `tabList` у `PageTabs`; `actions` — `{ type: Array, default: () => [] }`.

```html
<nav class="bb-dashboard-ui bb:bg-white bb:shadow-sm" :aria-label="texts.<ключ>">
    <div class="bb:flex bb:h-16 bb:justify-between bb:px-8">
        <div class="bb:flex">
            <div v-if="$slots.logo" class="bb:flex bb:shrink-0 bb:items-center bb:mr-8"><slot name="logo"/></div>
            <div class="bb:flex bb:gap-8">
                <navigation-menu-element v-for="item in itemList" :key="item.key" :name="item.name" :url="item.url"
                    :is-active="item.key === activeKey" :aria-current="item.key === activeKey ? 'page' : null"/>
            </div>
        </div>
        <div class="bb:flex bb:items-center"><hamburger-menu :actions="actions" :lang="lang"/></div>
    </div>
</nav>
```

Комментарий у компонента: что собирает, что `activeKey` приносит страница, что Inertia пакет не импортирует. `src/index.js` — экспорт; `src/i18n.js` — ключ в `ru` и `en` с комментарием.

- [ ] **Step 4: Запустить — проходят**

Run: `npx vitest run --dir tests`
Expected: всё проходит, включая `ssr.test.js`, `hydration.test.js`, `utilityPrefix.test.js`, `i18n.test.js`; вывод чистый.

- [ ] **Step 5: Собрать и закоммитить**

Run: `npm run build` — без предупреждений.

```bash
git add src/components/NavigationHeader.vue src/i18n.js src/index.js tests
git commit -m "feat: добавить компонент NavigationHeader"
```

### Task 2: Playground, браузерные тесты, README

**Files:**
- Create: `e2e/navigationHeader.e2e.js`
- Modify: `playground/App.vue`, `README.md`

**Interfaces:**
- Consumes: `NavigationHeader` (Task 1); `test`, `expect`, `pages`, `openPlayground`, `expectColor` из `e2e/helpers.js`.

- [ ] **Step 1: Дополнить Playground**

Раздел `<h2>NavigationHeader</h2>` рядом с `NavigationMenuElement`: шапка с логотипом (любая картинка из `playground/public` или inline SVG), четыре пункта на `#`-адреса, активный второй, меню профиля из двух пунктов; шапка без логотипа и без `actions`; шапка с `activeKey` вне списка. Каждой шапке — `data-demo`-атрибут или подпись для локаторов.

- [ ] **Step 2: Написать браузерные тесты**

`e2e/navigationHeader.e2e.js`, цикл по `pages`:

- высота шапки 64px, `background-color` белый, `box-shadow` не `none` — у шапки с меню и у шапки без меню (одинаковая высота);
- активный пункт: `aria-current="page"`, `expectColor(link, 'border-bottom-color', 'indigo-400')` до фокуса; у остальных `aria-current` нет;
- кнопка меню справа: правый край кнопки на 32px левее правого края шапки (±1);
- логотип слева: левый край в 32px от края шапки, первый пункт в 32px от правого края логотипа (±1);
- шапка с `activeKey` вне списка — ни у одной ссылки нет `aria-current`;
- `page.setViewportSize({ width: 1024, height: 768 })`: все пункты видны, `top` у них одинаковый (одна строка).

- [ ] **Step 3: Запустить**

Run: `npm run test:browser`
Expected: всё проходит в Chromium и WebKit, `consoleProblems` пуст.

- [ ] **Step 4: Обновить README**

- `### NavigationHeader` рядом с `### NavigationMenuElement`: пример раздела 4.1 спеки (с `activeKey` по `$page.component` и несколькими страницами на раздел, пункт администратора), таблица пропов и слота, поведение раздела 4.2, вид раздела 5. Абзац о переводе с `$page.url`-префиксов (belarus): список имён страниц раздела должен покрывать те же страницы.
- Список экспортов: тридцать шесть, `NavigationHeader`; «Playground»: тридцатью шестью.
- «Языки»: строка `NavigationHeader` — имя шапки для скринридера «Разделы» / «Sections».

- [ ] **Step 5: Закоммитить**

```bash
git add playground/App.vue e2e/navigationHeader.e2e.js README.md
git commit -m "docs: описать NavigationHeader и показать в Playground"
```

### Task 3: Приёмка

- [ ] **Step 1:** `npm run build`, выложить Playground в `~/Code/mars/certificates/src/public/build/ui-playground` (`--emptyOutDir --base ./`), `200` на `index.html` и `host.html`.
- [ ] **Step 2:** Chrome — исполнитель, Safari — владелец: раздел `NavigationHeader` на обеих страницах. Версию не менять; слияние и тег `v0.25.0` — по слову владельца.
