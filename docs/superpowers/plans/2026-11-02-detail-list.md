# DetailList и DetailRow — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** публичные компоненты `DetailList` и `DetailRow`: строки карточки записи с чередованием, двумя колонками и скрытием через `v-if`.

**Architecture:** два компонента без логики: `DetailList` — `<dl>` со слотом, `DetailRow` — `<div>` с `<dt>` и `<dd>`. Чередование даёт CSS-вариант `bb:odd:` на строке, поэтому скрытые строки в счёт не входят.

**Tech Stack:** Vue 3.5 (Options API), vitest + happy-dom, Playwright 1.63 (Chromium, WebKit), Tailwind 4 с префиксом `bb`.

**Spec:** `docs/superpowers/specs/2026-11-02-detail-list-design.md`.

## Global Constraints

- **Ветка:** `feat/detail-list`, основная рабочая копия. Версия, тег, слияние и публикация — только по слову владельца.
- **Вид:** строка — три колонки с зазором 16 px, поля 24 px и 20 px; нечётные строки `gray-50`, чётные белые; название `text-sm leading-5 font-normal gray-500`; значение `text-sm leading-5 font-medium gray-900`, две колонки.
- **Без порогов ширины:** никаких `bb:sm:` и `bb:md:`.
- **Без `bb-dashboard-ui` на корнях:** в значении лежит разметка приложения.
- **Код:** классы литералами с префиксом `bb:`; комментарии по-русски и без истории изменений; комментарии шаблона не на корневом уровне, иначе корень станет фрагментом.
- **Коммиты:** conventional commits по-русски, без `--no-verify`.
- **Отклонения:** если план или спеку нельзя выполнить как написано — остановиться и сообщить об отклонении с доказательством; план не менять.
- **Проверка:** набор пакета — `npx vitest run --dir tests`, вывод чистый. Голый `npm test` подбирает чужой зонд из `.project-context`.

## Review Focus

1. Строки из `v-for` рядом со строками с `v-if`: чередование считает их вместе. Тест — Task 2.
2. Значение из текста и пилюли: пилюля стоит в той же строке текста, а не под ним. Тест — Task 2.
3. Длинное название в узком окне остаётся в своей колонке и не заходит на значение. Тест — Task 2.
4. `class` страницы на `<detail-list>` и `<detail-row>` ложится на корень: страница может добавить отступ. Тест — Task 1.
5. `DetailRow` вне списка не падает: разметка невалидна, но страница рисуется. Тест — Task 1, фикстура SSR.

---

### Task 1: Компоненты и экспорт

**Files:**
- Create: `src/components/DetailList.vue`, `src/components/DetailRow.vue`, `tests/DetailList.test.js`
- Modify: `src/index.js`, `tests/exports.test.js`, `tests/ssrFixtures.js`

**Interfaces:**
- Produces: экспорт `DetailList` без пропсов, со слотом по умолчанию; экспорт `DetailRow` с пропом `title: String`, обязательным, и слотом по умолчанию.

- [ ] **Step 1: Написать падающие тесты**

В `tests/DetailList.test.js`:

```js
describe('DetailRow', () => {
    it('название в dt, значение в dd', () => {
        const row = mount(DetailRow, { props: { title: 'Телефон' }, slots: { default: '+7 999' } })
        expect(row.element.tagName).toBe('DIV')
        expect([...row.element.children].map((child) => child.tagName)).toEqual(['DT', 'DD'])
        expect(row.get('dt').text()).toBe('Телефон')
        expect(row.get('dd').text()).toBe('+7 999')
    })

    it('значение — любая разметка страницы', () => { /* слот с <a> и <span>: оба в dd */ })

    it('две колонки и чередование, без порогов ширины', () => {
        const row = mount(DetailRow, { props: { title: 'Телефон' } })
        expect(row.classes()).toEqual(expect.arrayContaining(['bb:grid', 'bb:grid-cols-3', 'bb:gap-4', 'bb:px-6', 'bb:py-5', 'bb:bg-white', 'bb:odd:bg-gray-50']))
        expect(row.get('dd').classes()).toContain('bb:col-span-2')
        expect(row.html()).not.toMatch(/bb:(sm|md|lg|xl):/)
    })

    it('отступы браузера и начертание заданы самим компонентом', () => {
        const row = mount(DetailRow, { props: { title: 'Телефон' } })
        expect(row.get('dt').classes()).toEqual(expect.arrayContaining(['bb:m-0', 'bb:p-0', 'bb:font-normal', 'bb:text-gray-500']))
        expect(row.get('dd').classes()).toEqual(expect.arrayContaining(['bb:m-0', 'bb:p-0', 'bb:font-medium', 'bb:text-gray-900']))
    })

    it('колонки не раздвигает длинное значение', () => {
        /* dt и dd содержат bb:wrap-break-word */
    })

    it('без title — предупреждение Vue и без ошибок', () => { /* warnHandler ловит 'Missing required prop: "title"', errorHandler пуст */ })

    it('class страницы ложится на строку', () => {})

    it('вне списка не падает', () => {})
})

describe('DetailList', () => {
    it('строки лежат в dl прямыми дочерними элементами', () => { /* слот из двух h(DetailRow): dl > div */ })
    it('нижние углы скругляет и обрезает сам список', () => { /* bb:overflow-hidden, bb:rounded-b-lg, bb:m-0, bb:p-0 */ })
    it('пустой слот не падает', () => { /* find('dl') есть, детей нет */ })
    it('class страницы ложится на dl', () => {})
    it('на корнях нет класса сброса пакета', () => { /* у обоих компонентов нет bb-dashboard-ui */ })
})
```

В `tests/exports.test.js`: заголовок `ровно тридцать три компонента, плагин и downloadFile`, в перечень — `DetailList`, `DetailRow`.

В `tests/ssrFixtures.js`: `DetailList: { slots: { default: () => h(DetailRow, { title: 'Телефон' }, () => '+7 999') } }` и `DetailRow: { props: { title: 'Телефон' }, slots: { default: () => '+7 999' } }`, импорт `DetailRow`.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run --dir tests tests/DetailList.test.js tests/exports.test.js`
Expected: FAIL — нет `src/components/DetailList.vue`, в экспорте тридцать один компонент.

- [ ] **Step 3: Реализовать**

`DetailRow.vue`, корень `<div>`:
- корень: `bb:grid bb:grid-cols-3 bb:gap-4 bb:px-6 bb:py-5 bb:bg-white bb:odd:bg-gray-50`;
- `<dt v-text="title">`: `bb:m-0 bb:p-0 bb:text-sm bb:leading-5 bb:font-normal bb:text-gray-500 bb:wrap-break-word`;
- `<dd>` со слотом: `bb:col-span-2 bb:m-0 bb:p-0 bb:text-sm bb:leading-5 bb:font-medium bb:text-gray-900 bb:wrap-break-word`.

`DetailList.vue`, корень `<dl class="bb:m-0 bb:p-0 bb:overflow-hidden bb:rounded-b-lg"><slot></slot></dl>`.

Комментарии в `<script>` объясняют: чередование считает соседние элементы и поэтому в слоте только строки; углы обрезает список, потому что у `PageCard` нет `overflow-hidden`; корень без `bb-dashboard-ui`, потому что в значении разметка приложения. Экспорт в `src/index.js` рядом с `PageCard`.

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run --dir tests`
Expected: PASS всего набора, включая `utilityPrefix`, `ssr`, `hydration`, `exports`; вывод чистый.

- [ ] **Step 5: Закоммитить**

```bash
git add src tests
git commit -m "feat: добавить DetailList и DetailRow"
```

### Task 2: Playground, браузерные тесты, README

**Files:**
- Create: `e2e/detailList.e2e.js`
- Modify: `playground/App.vue`, `README.md`

**Interfaces:**
- Consumes: `DetailList`, `DetailRow` из Task 1; `test`, `expect`, `pages`, `openPlayground`, `expectColor` из `e2e/helpers.js`.

- [ ] **Step 1: Дополнить Playground**

Раздел `<h2>DetailList</h2>` сразу за разделом с `PageCard`: `<page-card>` с шапкой и `DetailList`, данные вымышленные. Все строки завёрнуты в `<template v-if="detailRowsAreShown">`; семь строк, чтобы последняя была серой:

1. `Регистрация` — текст;
2. `Телефон` — `v-if="detailPhoneIsShown"`;
3. `Код` — текст и `<info-pill text="подтверждён" color="green"/>`;
4. две строки из `v-for` по `detailExtraRows`: `Согласие получать маркетинговые материалы` с пилюлей и `Адрес` со значением из 80 символов без пробелов;
5. `Породы` — два `<div>`: непрефиксного `.block` на голой странице нет;
6. `IP` — текст.

Под карточкой две кнопки `demo-button`: `Спрятать телефон` и `Спрятать все строки`, подписи меняются на «Показать…». Импорт и регистрация обоих компонентов.

- [ ] **Step 2: Написать браузерные тесты**

`e2e/detailList.e2e.js`, цикл по `pages`. `section` — `page.locator('section', { has: page.locator('h2', { hasText: 'DetailList' }) })`, `list` — его `dl`, `rows` — `list.locator('> div')`.

```js
test('первая строка серая, вторая белая, третья серая', async ({ page }) => {
    await expectColor(rows(page).nth(0), 'background-color', 'gray-50')
    await expectColor(rows(page).nth(1), 'background-color', 'white')
    await expectColor(rows(page).nth(2), 'background-color', 'gray-50')
})

test('строки из v-for идут в общем счёте, последняя серая', async ({ page }) => {
    await expect(rows(page)).toHaveCount(7)
    await expectColor(rows(page).nth(3), 'background-color', 'white')
    await expectColor(rows(page).nth(4), 'background-color', 'gray-50')
    await expectColor(rows(page).nth(6), 'background-color', 'gray-50')
})

test('спрятанная строка: чередование по видимым строкам', async ({ page }) => {
    await section(page).getByRole('button', { name: 'Спрятать телефон' }).click()
    await expect(rows(page)).toHaveCount(6)
    await expect(rows(page).nth(1)).toContainText('Код')
    await expectColor(rows(page).nth(1), 'background-color', 'white')
})

test('все строки спрятаны: высота списка 0', async ({ page }) => {
    await section(page).getByRole('button', { name: 'Спрятать все строки' }).click()
    await expect(rows(page)).toHaveCount(0)
    expect((await list(page).boundingBox()).height).toBe(0)
})

test('текст и пилюля в одной строке', async ({ page }) => {
    const text = await rows(page).nth(2).locator('dd').evaluate((dd) => {
        // В значении есть пустые текстовые узлы Vue: нужен узел с кодом.
        const code = [...dd.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '')
        const range = document.createRange()
        range.selectNode(code)
        const { right, bottom } = range.getBoundingClientRect()
        return { right, bottom }
    })
    const pill = await rows(page).nth(2).locator('dd > span').boundingBox()
    expect(pill.x).toBeGreaterThanOrEqual(text.right)
    expect(pill.y).toBeLessThan(text.bottom)
})

test('нулевые отступы и начертание', async ({ page }) => {
    for (const property of ['margin-top', 'margin-left', 'padding-left']) {
        await expect(rows(page).first().locator('dt')).toHaveCSS(property, '0px')
        await expect(rows(page).first().locator('dd')).toHaveCSS(property, '0px')
        await expect(list(page)).toHaveCSS(property, '0px')
    }
    await expect(rows(page).first().locator('dt')).toHaveCSS('font-weight', '400')
})

test('нижние углы обрезаны скруглением', async ({ page }) => {
    await list(page).scrollIntoViewIfNeeded()
    const clipped = await list(page).screenshot()
    await page.addStyleTag({ content: 'section dl { overflow: visible !important; border-radius: 0 !important }' })
    expect(clipped.equals(await list(page).screenshot())).toBe(false)
})
```

Отдельный `test.describe` на окно 360 × 800:

```js
test('две колонки: название и значение на одной линии', async ({ page }) => {
    const dt = await rows(page).first().locator('dt').boundingBox()
    const dd = await rows(page).first().locator('dd').boundingBox()
    expect(dd.y).toBeCloseTo(dt.y, 0)
    expect(dd.x).toBeGreaterThan(dt.x + dt.width)
})

test('длинное значение и название в своих колонках', async ({ page }) => {
    for (const [index, cell] of [[4, 'dd'], [3, 'dt']]) {
        const fits = await rows(page).nth(index).locator(cell).evaluate((element) => {
            const range = document.createRange()
            range.selectNodeContents(element)
            return range.getBoundingClientRect().right <= element.getBoundingClientRect().right + 0.5
        })
        expect(fits).toBe(true)
    }
})
```

Здесь номера: четвёртая строка (индекс 3) — согласие с длинным названием, пятая (индекс 4) — адрес.

- [ ] **Step 3: Запустить браузерные тесты**

Run: `npm run test:browser -- e2e/detailList.e2e.js`
Expected: все тесты проходят в Chromium и WebKit, `consoleProblems` пуст.

- [ ] **Step 4: Провести отрицательную проверку**

Run: временно убрать `bb:overflow-hidden` из `DetailList.vue` и `bb:wrap-break-word` из `DetailRow.vue`, `npm run test:browser -- e2e/detailList.e2e.js --project=chromium`, вернуть код через `git checkout src/components/DetailList.vue src/components/DetailRow.vue`.
Expected: падают `нижние углы обрезаны скруглением` и `длинное значение и название в своих колонках`. Если тест не падает — остановиться и сообщить об отклонении.

- [ ] **Step 5: Обновить README**

- За разделом `### PageCard` — разделы `### DetailList` и `### DetailRow`: пример из раздела 4.1 спеки; таблица пропа `title`; в слоте только строки, `v-if`, `v-for`, `<template v-if>` и `<template v-for>` чередованию не мешают, `v-show` и обёртка вокруг строки мешают; первая видимая строка серая; всегда две колонки; нижние углы скругляет список; блок страницы стоит над списком; внутри `.prose` не поддерживается.
- Раздел `PageCard`, пример «Страница просмотра»: `<div class="overflow-hidden rounded-b-lg">…строки…</div>` заменить на `<detail-list>…строки…</detail-list>`.
- «Пакет экспортирует тридцать один компонент» — «тридцать три», в перечень `DetailList` и `DetailRow`; «со всеми тридцатью одним компонентом» — «тридцатью тремя».

- [ ] **Step 6: Запустить всё**

Run: `npx vitest run --dir tests && npm run test:browser`
Expected: всё проходит, вывод чистый.

- [ ] **Step 7: Закоммитить**

```bash
git add playground/App.vue e2e/detailList.e2e.js README.md
git commit -m "docs: показать DetailList в Playground и описать в README"
```

### Task 3: Приёмка

**Files:** нет.

- [ ] **Step 1: Выложить Playground**

Run: `npm run build`, затем `npx vite build --config vite.playground.config.js --outDir ~/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./`, затем `curl -sk -o /dev/null -w "%{http_code}" https://certificates.test/build/ui-playground/index.html` и то же для `host.html`.
Expected: `200` на обе страницы.

- [ ] **Step 2: Принять**

Chrome — исполнитель, Safari — владелец: вид строк как на образце russia, чередование при скрытии, длинные значения, узкое окно. Версию не поднимать.
