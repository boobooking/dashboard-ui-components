# Иконки действий и меню без переносов — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** необязательная иконка `icon: 'plus'` у действий `DropdownButtonWithAction` и `HamburgerMenu`, размер 16 px в одном месте; пункты меню в одну строку, меню по самому длинному пункту, со сдвигом вправо при нехватке места; выпуск `0.23.0`.

**Architecture:**
- Список иконок — `src/actionIcons.js`, размер — внутренний компонент `ActionIcon.vue`.
- Формат пункта расширяет `src/menuItems.js`, по образцу `color`.
- Вид пункта меняет `PopoverMenu.vue`, основной кнопки — `DropdownButtonWithAction.vue`.
- Сдвиг включает новый проп `shift` панели `PopoverPanel` и опция `shift` функций `placePopover` и `fitPopover`.

**Tech Stack:** Vue 3.5 (Options API), vitest + happy-dom, Playwright 1.63 (Chromium, WebKit), Tailwind 4 с префиксом `bb`.

**Spec:** `docs/superpowers/specs/2026-11-02-action-icons-design.md`.

## Global Constraints

- **Ветка:** `feat/action-icons`, основная рабочая копия. Слияние и тег — только по слову владельца.
- **Иконка:** 16 × 16 px, отступ до текста 8 px (`bb:gap-2`), цвет `currentColor`, `aria-hidden="true"`. Имя в списке одно: `plus`.
- **Меню:** не уже 224 px (`bb:min-w-56`); пункт в одну строку; край окна 8 px; `max-width` панели со сдвигом — ширина окна минус 16 px.
- **Без изменений:** клавиатура, фокус, закрытие меню, `TextPopover`, списки полей, календарь, `ActionPill`, перенос подписи основной кнопки.
- **Код:** классы литералами с префиксом `bb:`; содержимое кнопок и ссылок — с `bb:pointer-events-none bb:cursor-default`; комментарии по-русски и без истории изменений; существующие комментарии не удалять, если они не стали ложными.
- **Коммиты:** conventional commits по-русски, без `--no-verify`.
- **Отклонения:** если план или спеку нельзя выполнить как написано — остановиться и сообщить об отклонении с доказательством; план не менять.
- **Проверка:** вывод `npm test` чистый: без падений и без новых предупреждений.

## Review Focus

1. Неверное имя иконки рядом с верной: неверный пункт получает пустой блок и текст на общей линии, предупреждение валидатора одно. Тест — Task 3.
2. Иконки пропали из `actions` при открытом меню: пустые блоки исчезают, текст возвращается к левому полю. Тест — Task 3.
3. Меню открывали со сдвигом, затем то же меню открыли при достаточном месте: `right` снова по стрелке. Тест — Task 4.
4. Клик по самой иконке на основной кнопке срабатывает как клик по кнопке: `pointer-events` отдаёт его кнопке, рука-курсор остаётся у кнопки. Тест — Task 5.
5. Иконка в цветном пункте красится как текст пункта, в том числе при наведении: цвет вычисляется браузером. Тест — Task 5.

---

### Task 1: Список иконок и поле `icon`

**Files:**
- Create: `src/components/icons/Plus.vue`, `src/actionIcons.js`, `src/components/ActionIcon.vue`, `tests/ActionIcon.test.js`
- Modify: `src/menuItems.js`
- Test: `tests/ActionIcon.test.js`, `tests/DropdownButtonWithAction.test.js`, `tests/HamburgerMenu.test.js`

**Interfaces:**
- Produces:
  - `ACTION_ICONS: Record<string, Component>`, `isActionIcon(name: unknown): boolean` — `src/actionIcons.js`;
  - `ActionIcon` с пропом `name: String | null`, по умолчанию `null`; при `null` рисует пустой `<span>` того же размера;
  - `itemIcon(item): string | null` — `src/menuItems.js`.

- [ ] **Step 1: Написать падающие тесты**

В `tests/ActionIcon.test.js`:

```js
describe('ActionIcon', () => {
    it.each(Object.keys(ACTION_ICONS))('%s: svg 16 px без своего размера у самой иконки', (name) => {
        const icon = mount(ActionIcon, { props: { name } }).get('svg')
        expect(icon.classes()).toEqual(expect.arrayContaining([
            'bb:w-4', 'bb:h-4', 'bb:shrink-0', 'bb:pointer-events-none', 'bb:cursor-default',
        ]))
        expect(icon.attributes('aria-hidden')).toBe('true')
        expect(mount(ACTION_ICONS[name]).classes()).toEqual([])
    })

    it('без имени — пустой блок того же размера', () => {
        const wrapper = mount(ActionIcon)
        expect(wrapper.element.tagName).toBe('SPAN')
        expect(wrapper.classes()).toEqual(expect.arrayContaining(['bb:w-4', 'bb:h-4', 'bb:shrink-0']))
    })
})

describe('isActionIcon и itemIcon', () => {
    it.each(['pin', '', 'constructor', 'toString', 1, null, undefined, {}])('%s — не иконка', (value) => {
        expect(isActionIcon(value)).toBe(false)
        expect(itemIcon({ icon: value })).toBeNull()
    })

    it('plus — иконка', () => {
        expect(isActionIcon('plus')).toBe(true)
        expect(itemIcon({ icon: 'plus' })).toBe('plus')
    })
})
```

В таблицу «неверный пункт» `tests/HamburgerMenu.test.js:247` и такую же в `tests/DropdownButtonWithAction.test.js` добавить строку `{ name: 'неверный icon', item: { label: 'Удалить', icon: 'pin', onSelect: () => {} } }`. Допустимый пункт: `icon: 'plus'` и `icon: undefined` предупреждений не дают.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run tests/ActionIcon.test.js tests/HamburgerMenu.test.js tests/DropdownButtonWithAction.test.js`
Expected: FAIL — нет модуля `src/actionIcons.js`, нет предупреждения о неверном `icon`.

- [ ] **Step 3: Реализовать**

- `Plus.vue`: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`, путь `M12 4v16m8-8H4` со `stroke-linecap="round" stroke-linejoin="round" stroke-width="2"`. Класса размера нет, в комментарии — что размер задаёт `ActionIcon`.
- `actionIcons.js`: `ACTION_ICONS = { plus: Plus }`; `isActionIcon` — через `Object.hasOwn(ACTION_ICONS, name)`, для не строк `false`.
- `ActionIcon.vue`: один узел `<component :is="icon" class="bb:w-4 bb:h-4 bb:shrink-0 bb:pointer-events-none bb:cursor-default"/>`, вычисляемое `icon` — компонент из списка или `'span'`.
- `menuItems.js`: в `isMenuItem` после проверки `color` — `item.icon !== undefined && !isActionIcon(item.icon)` даёт `false`; `itemIcon(item)` рядом с `itemColor`; обновить верхние комментарии о полях пункта.

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run tests/ActionIcon.test.js tests/HamburgerMenu.test.js tests/DropdownButtonWithAction.test.js tests/utilityPrefix.test.js`
Expected: PASS.

- [ ] **Step 5: Закоммитить**

```bash
git add src tests
git commit -m "feat: добавить список иконок действий и поле icon"
```

### Task 2: Иконка на основной кнопке

**Files:**
- Modify: `src/components/DropdownButtonWithAction.vue:12-33`, прочие части того же файла по шагу 3
- Test: `tests/DropdownButtonWithAction.test.js`, `tests/keyboardNavigation.test.js`

**Interfaces:**
- Consumes: `ActionIcon`, `itemIcon` из Task 1.

- [ ] **Step 1: Написать падающие тесты**

В `tests/DropdownButtonWithAction.test.js`:

```js
describe('иконка основной кнопки', () => {
    it.each([
        { name: 'ссылка', tag: 'a', action: { label: 'Добавить', icon: 'plus', href: '#add' } },
        { name: 'кнопка', tag: 'button', action: { label: 'Добавить', icon: 'plus', onSelect: () => {} } },
    ])('$name: иконка слева от подписи', ({ tag, action }) => {
        const main = mount(DropdownButtonWithAction, { attachTo: document.body, props: { actions: [action] } }).get(tag)
        expect(main.element.firstElementChild.tagName.toLowerCase()).toBe('svg')
        expect(main.text()).toBe('Добавить')
        expect(main.classes()).toContain('bb:gap-2')
    })

    it('без icon и с неверным icon — svg нет', () => { /* обе формы; неверная — с подавленным предупреждением */ })
})
```

В `cases` `tests/keyboardNavigation.test.js` добавить `DropdownButtonWithAction — основная кнопка с иконкой`: одно действие `{ label: 'Добавить', icon: 'plus', onSelect: () => {} }`, `label: null`, `button` — первая кнопка компонента.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run tests/DropdownButtonWithAction.test.js tests/keyboardNavigation.test.js`
Expected: FAIL — нет `svg`, нет `bb:gap-2`.

- [ ] **Step 3: Реализовать**

В `<a>` и `<button>` основной кнопки убрать `v-text`, добавить `bb:gap-2` в статические классы и содержимое:

```vue
<action-icon v-if="mainIcon !== null" :name="mainIcon"/>
<span class="bb:pointer-events-none bb:cursor-default" v-text="mainAction.label"></span>
```

Вычисляемое `mainIcon()` — как `mainColor`: `this.hasActions ? itemIcon(this.mainAction) : null`. Обновить комментарий к пропу `actions`: добавить `icon`. Подпись основной кнопки переносится как раньше: `truncate` здесь нет.

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run tests/DropdownButtonWithAction.test.js tests/keyboardNavigation.test.js tests/ssr.test.js tests/hydration.test.js`
Expected: PASS.

- [ ] **Step 5: Закоммитить**

```bash
git add src tests
git commit -m "feat: показывать иконку на основной кнопке"
```

### Task 3: Пункты меню: иконка, одна строка, общая линия

**Files:**
- Modify: `src/components/PopoverMenu.vue:27-46`, блок `computed` и `methods` того же файла; `src/components/HamburgerMenu.vue` (комментарий к `actions`); `tests/ssrFixtures.js`
- Test: `tests/HamburgerMenu.test.js`, `tests/DropdownButtonWithAction.test.js`, `tests/keyboardNavigation.test.js`

**Interfaces:**
- Consumes: `ActionIcon`, `itemIcon` из Task 1.
- Produces: разметка пункта — иконка или пустой блок, затем `<span>` подписи с `bb:truncate`.

- [ ] **Step 1: Написать падающие тесты**

В `tests/HamburgerMenu.test.js` и в `tests/DropdownButtonWithAction.test.js` одной таблицей на `it.each`, для меню каждого компонента (`mountMenu` — их помощник, у `DropdownButtonWithAction` пункты идут со второго действия):

```js
const blanks = (menu) => menu.findAll('[role="menuitem"] > span:first-child:not(:last-child)')

it('иконка у перехода и у действия', () => { /* оба пункта с icon: 'plus': в каждом svg перед подписью, текст равен label */ })

it('иконка у одного пункта: у остальных пустой блок', () => {
    const menu = mountMenu([{ label: 'A', icon: 'plus', onSelect }, { label: 'B', href: '#b' }, { label: 'C', onSelect }])
    expect(menu.findAll('svg')).toHaveLength(1)
    expect(blanks(menu)).toHaveLength(2)
})

it('без иконок — ни svg, ни пустых блоков', () => { /* blanks пуст */ })

it('неверное имя рядом с верной иконкой — пустой блок и одно предупреждение', () => {})

it('неверное имя без других иконок — без пустых блоков', () => {})

it('иконки пропали из actions — пустых блоков нет', async () => { /* setProps при открытом меню */ })

it('подпись пункта — span с bb:truncate и bb:min-w-0', () => {})
```

Только в `tests/DropdownButtonWithAction.test.js`: `it('иконка первого действия не даёт пустых блоков в меню', ...)`.

В `cases` `tests/keyboardNavigation.test.js` добавить `PopoverMenu — пункт с иконкой` и `PopoverMenu — пункт с пустым блоком`: открыть `HamburgerMenu`, `button` — кнопка `[role="menuitem"]`. Первый вариант — пункт с `icon`, второй — пункт без неё в том же меню.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run tests/HamburgerMenu.test.js tests/DropdownButtonWithAction.test.js tests/keyboardNavigation.test.js`
Expected: FAIL — нет `svg` и пустых блоков.

- [ ] **Step 3: Реализовать**

У `<a>` и `<button>` пункта: `bb:block` → `bb:flex bb:items-center bb:gap-2`, убрать `v-text`, содержимое:

```vue
<action-icon v-if="hasIcons" :name="icon(item)"/>
<span class="bb:min-w-0 bb:truncate bb:pointer-events-none bb:cursor-default" v-text="item.label"></span>
```

Вычисляемое `hasIcons()` — `this.actionItems.some((item) => itemIcon(item) !== null)`; метод `icon(item)` — как `color(item)`. Комментарии к пропу `actions` в `PopoverMenu` и `HamburgerMenu` дополнить полем `icon`. В `tests/ssrFixtures.js` первым двум действиям `DropdownButtonWithAction` и пункту `HamburgerMenu` добавить `icon: 'plus'`.

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run tests/HamburgerMenu.test.js tests/DropdownButtonWithAction.test.js tests/keyboardNavigation.test.js tests/menuFocus.test.js tests/ssr.test.js tests/hydration.test.js`
Expected: PASS.

- [ ] **Step 5: Закоммитить**

```bash
git add src tests
git commit -m "feat: показывать иконки в пунктах меню и держать подпись в одну строку"
```

### Task 4: Ширина меню и сдвиг вправо

**Files:**
- Modify: `src/popover.js`, `src/components/PopoverPanel.vue:71-75` и `:281-292`, `src/components/PopoverMenu.vue:2-16`
- Test: `tests/popover.test.js`, `tests/DropdownButtonWithAction.test.js:169-185`, `tests/TextPopover.test.js`

**Interfaces:**
- Produces:
  - `placePopover(anchor, popover, { maxWidth, align, fitsBelow, fitsRight, shift = false, popoverWidth = 0 })`;
  - `fitPopover(anchor, popover, options)`, опция `shift`;
  - проп `PopoverPanel`: `shift: Boolean`, по умолчанию `false`.

- [ ] **Step 1: Написать падающие тесты**

В `tests/popover.test.js`, окно 1000 × 800, кнопка `{ top: 100, bottom: 120, left: 120, right: 140 }`. Помощник `withWidth(popover, width)` подменяет `getBoundingClientRect` панели: `{ width }` или функцию.

```js
it('shift: max-width — окно минус 16 px, right — по кнопке', () => {
    placePopover(anchor, popover, { shift: true })
    expect(popover.style.maxWidth).toBe('984px')
    expect(popover.style.right).toBe('860px')
})

it('shift: меню шире места слева — левый край в 8 px', () => {
    withWidth(popover, 300)
    placePopover(anchor, popover, { shift: true })
    fitPopover(anchor, popover, { shift: true })
    expect(popover.style.right).toBe('692px')
})

it('shift: меню помещается слева — right по кнопке', () => { /* кнопка right: 920, ширина 300: right 80px */ })

it('shift: меню во всё окно — right 8 px', () => { /* ширина 984: right 8px */ })

it('shift: ширина после разворота вверх', () => {
    // Панель не поместилась снизу; после разворота (style.top === 'auto') ширина 300, до него 315.
    fitPopover(anchorAt({ top: 700, bottom: 720, left: 120, right: 140 }), popover, { shift: true })
    expect(popover.style.top).toBe('auto')
    expect(popover.style.right).toBe('692px')
})

it('shift: следующее открытие возвращает right к кнопке', () => {
    /* после сдвига вызвать placePopover с кнопкой right: 920 и { shift: true }: right 80px */
})

it('без shift fitPopover ширину не меряет и right не меняет', () => { /* getBoundingClientRect панели — шпион, не вызван */ })
```

Тест `tests/DropdownButtonWithAction.test.js:169` заменить на `у стрелки возле левого края окна меню сдвигается вправо`: панели подменить `getBoundingClientRect` с шириной 300; после `settle()` дождаться кадра `await new Promise(requestAnimationFrame)`; `maxWidth` — `984px`, `right` — `692px`.

В `tests/TextPopover.test.js` добавить тест: кнопка у левого края, окно 1000 × 800, `right: 140` — `max-width` панели `132px`, `right` `860px`.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run tests/popover.test.js tests/DropdownButtonWithAction.test.js tests/TextPopover.test.js`
Expected: FAIL в тестах `shift` и в заменённом тесте; тест `TextPopover` проходит сразу: он сторожит прежнее поведение.

- [ ] **Step 3: Реализовать `popover.js`**

В `placePopover` ветка ширины получает случай `shift` перед `maxWidth`: `Math.max(0, viewportWidth - 2 * VIEWPORT_MARGIN)`. Значение `right`:

```js
const rightOffset = shift
    ? Math.max(VIEWPORT_MARGIN, Math.min(right, viewportWidth - VIEWPORT_MARGIN - popoverWidth))
    : right
```

`fitPopover`:

```js
export function fitPopover(anchor, popover, options = {}) {
    const fitsBelow = popover.scrollHeight <= popover.clientHeight + 1
    const fitsRight = popover.scrollWidth <= popover.clientWidth + 1

    if (!fitsBelow || !fitsRight) {
        placePopover(anchor, popover, { ...options, fitsBelow, fitsRight })
    }

    // Ширина меряется после разворота: он меняет высоту, и полоса прокрутки
    // могла исчезнуть.
    if (options.shift) {
        placePopover(anchor, popover, { ...options, fitsBelow, fitsRight, popoverWidth: popover.getBoundingClientRect().width })
    }
}
```

Обновить комментарии над `placePopover` и `fitPopover` и заменить строку «Меню без maxWidth ширину задаёт себе само (bb:w-56)».

- [ ] **Step 4: Подключить проп и классы**

`PopoverPanel`: проп `shift` с комментарием, `options = { maxWidth: this.maxWidth, align: this.align, shift: this.shift }`. `PopoverMenu`: убрать `:max-width="224"`, добавить `shift`, в `panel-class` заменить `bb:w-56` на `bb:w-max bb:min-w-56`, верхний комментарий переписать под новую ширину и сдвиг.

- [ ] **Step 5: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS всего набора, вывод чистый.

- [ ] **Step 6: Закоммитить**

```bash
git add src tests
git commit -m "feat: подстраивать ширину меню под пункты и сдвигать его у края окна"
```

### Task 5: Playground, браузерные тесты, README

**Files:**
- Create: `e2e/actionIcons.e2e.js`, `e2e/menuScrollbar.e2e.js`
- Modify: `playground/App.vue`, `README.md`
- Test: `e2e/actionIcons.e2e.js`, `e2e/menuScrollbar.e2e.js`

**Interfaces:**
- Consumes: `test`, `expect`, `pages`, `openPlayground`, `buttonAfterHeading`, `openPanel`, `menuItem`, `openMenuByClick`, `scrollToTrigger` из `e2e/helpers.js`.

- [ ] **Step 1: Дополнить Playground**

- После строки «Выбрано действий: …» раздела `DropdownButtonWithAction` — блок `<h3>С иконками: на кнопке и в пунктах меню</h3>` и `demo-row` из трёх кнопок:
  - `[{ label: 'Добавить ключи', icon: 'plus', href: '#keys' }]`;
  - `iconActions`: `Добавить ключи` с `plus` и `href: '#keys'`, `Добавить группу` с `plus` и `countSelection`, `Поменять пароль` с `href: '#password'`, `Удалить` с `color: 'red'` и `countSelection`;
  - `[{ label: 'Добавить', icon: 'plus', color: 'green', onSelect: countSelection }, { label: 'Добавить в чёрный список', icon: 'plus', color: 'red', onSelect: countSelection }]`.
- В разделе `HamburgerMenu` — вторая полоса `demo-header` с `<span>Шапка с иконкой</span>` и `<hamburger-menu :actions="[{ label: 'Добавить администратора', icon: 'plus', onSelect: countProfileSelection }, { label: 'Выйти', onSelect: countProfileSelection }]"/>`. `profileActions` и `menuActions` по составу не менять: их используют браузерные тесты.
- Комментарий у `menuActions`: «Длинный пункт показывает одну строку и рост меню» вместо фразы о переносе в `w-56`.

- [ ] **Step 2: Написать браузерные тесты**

`e2e/actionIcons.e2e.js`, цикл по `pages`, как в `e2e/menuFocus.e2e.js`. `iconsArrow` — `buttonAfterHeading(page, 'h3', 'С иконками')`; `longArrow` — `buttonAfterHeading(page, 'h3', 'Несколько действий')`; `retryArrow` — `buttonAfterHeading(page, 'h3', 'Несколько действий', 5)`; `colorMainButton` и `colorArrow` — `buttonAfterHeading(page, 'h3', 'С иконками', 4)` и `5`. Номера считают и кнопки закрытых меню, поэтому в начале каждого локатора-теста стоит `await expect(locator).toBeVisible()`. Панель — `openPanel(page)`.

```js
test('длинный пункт в одну строку, меню шире 224 px', async ({ page }) => {
    await openMenuByClick(page, longArrow(page))
    expect((await menuItem(page, 'Отправить письмо').boundingBox()).height).toBe(36)
    expect((await openPanel(page).boundingBox()).width).toBeGreaterThan(224)
})

test('короткое меню — 224 px, правый край по стрелке', async ({ page }) => {
    await openMenuByClick(page, iconsArrow(page))
    const panel = await openPanel(page).boundingBox()
    const arrow = await iconsArrow(page).boundingBox()
    expect(panel.width).toBe(224)
    expect(panel.x + panel.width).toBeCloseTo(arrow.x + arrow.width, 0)
})

test('иконка 16 × 16 px, текст пунктов на одной линии', async ({ page }) => {
    await openMenuByClick(page, iconsArrow(page))
    const lefts = await openPanel(page).locator('[role="menuitem"] > span:last-child')
        .evaluateAll((labels) => labels.map((label) => label.getBoundingClientRect().left))
    expect(new Set(lefts).size).toBe(1)
    const icon = await openPanel(page).locator('svg').first().boundingBox()
    expect([icon.width, icon.height]).toEqual([16, 16])
})

test('иконка красится как текст цветного пункта, в том числе при наведении', async ({ page }) => {
    await openMenuByClick(page, colorArrow(page))
    const item = menuItem(page, 'Добавить в чёрный список')
    const colors = () => item.evaluate((node) => [getComputedStyle(node).color, getComputedStyle(node.querySelector('svg')).color])
    const [text, icon] = await colors()
    expect(icon).toBe(text)
    await item.hover()
    const [hoverText, hoverIcon] = await colors()
    expect(hoverIcon).toBe(hoverText)
})

test('клик по иконке основной кнопки — клик по кнопке', async ({ page }) => {
    const counter = page.locator('p', { hasText: /^Выбрано действий: \d+, последний переход/ })
    const before = await counter.textContent()
    await colorMainButton(page).scrollIntoViewIfNeeded()
    const icon = await colorMainButton(page).locator('svg').boundingBox()
    await page.mouse.click(icon.x + 8, icon.y + 8)
    await expect(counter).not.toHaveText(before)
})
```

Отдельный `test.describe` на окно 360 × 800:

```js
test('мало места слева: меню в окне, левый край 8 px, подпись целиком', async ({ page }) => {
    await openMenuByClick(page, retryArrow(page))
    const panel = await openPanel(page).boundingBox()
    const arrow = await retryArrow(page).boundingBox()
    expect(arrow.x + arrow.width - 8).toBeLessThan(panel.width)
    expect(panel.x).toBeCloseTo(8, 0)
    expect(await labelIsCut(menuItem(page, 'Зафиксировать'))).toBe(false)
})

test('меню шире окна: 8 px с обеих сторон, подпись обрезана', async ({ page }) => {
    await openMenuByClick(page, longArrow(page))
    const panel = await openPanel(page).boundingBox()
    expect(panel.x).toBeCloseTo(8, 0)
    expect(panel.width).toBeCloseTo(344, 0)
    expect(await labelIsCut(menuItem(page, 'Отправить письмо'))).toBe(true)
})
```

`labelIsCut(item)` — `scrollWidth > clientWidth` у `span` подписи.

Отдельный файл `e2e/menuScrollbar.e2e.js` только для Chromium: `launchOptions` разрешены лишь на верхнем уровне файла (Playwright: `Cannot use({ launchOptions }) in a describe group`), а остальные браузерные тесты должны идти с настройками по умолчанию.

```js
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } })
test.skip(({ browserName }) => browserName !== 'chromium')
```

Перед каждым тестом: `page.addStyleTag({ content: '[popover]::-webkit-scrollbar { width: 15px }' })`. Помощник `scrollbarWidth(panel)` — `offsetWidth - clientWidth` панели.

- `полоса исчезает при развороте вверх: левый край по окончательной ширине`, окно 360 × 800:
  - `retryArrow.evaluate((arrow) => { arrow.scrollIntoView({ block: 'end' }); window.scrollBy(0, 30) })`, затем `scrollToTrigger` и `openMenuByClick`: снизу остаётся 18 px, меньше высоты пункта;
  - панель открылась вверх: `style.top === 'auto'`, `scrollbarWidth` равен 0, `panel.x` близок к 8;
  - полоса до разворота была: панели временно поставить `style.maxHeight = '18px'`, `scrollbarWidth` больше 0, вернуть прежнее значение.
- `полоса остаётся в коротком узком окне: горизонтальной прокрутки нет`, окно 360 × 120: `scrollToTrigger` и `openMenuByClick` для `longArrow`; `scrollbarWidth` больше 0, `scrollWidth <= clientWidth`.

- [ ] **Step 3: Провести отрицательную проверку**

Run: временно перенести измерение ширины в `fitPopover` до разворота, `npm run test:browser -- e2e/menuScrollbar.e2e.js --project=chromium` (Playground берёт `dist`, поэтому нужна сборка), вернуть код через `git checkout src/popover.js`.
Expected: тест `полоса исчезает при развороте вверх` падает на `panel.x`. Если не падает — остановиться и сообщить об отклонении: сценарий не проверяет то, ради чего написан.

- [ ] **Step 4: Запустить браузерные тесты**

Run: `npm run test:browser`
Expected: все тесты проходят в Chromium и WebKit, включая `menuFocus` и `hover`; `consoleProblems` пуст.

- [ ] **Step 5: Обновить README**

- `DropdownButtonWithAction`: в пример — `icon: 'plus'` у первого действия; строка таблицы полей `` | `icon` | `String` | Имя иконки из списка, сейчас `plus`; без поля — без иконки | ``; после абзаца о цвете — абзац: иконка 16 px слева от подписи, цвет иконки — цвет текста, в меню с иконками текст всех пунктов на одной линии, неверное имя — предупреждение и пункт без иконки; абзац «Меню открывается в верхнем слое браузера»: фразу о сужении заменить на «меню не уже 224 px и растёт по самому длинному пункту; подпись пункта всегда в одну строку. Если слева от стрелки не хватает места, меню сдвигается вправо и стоит в 8 px от края окна; меню шире окна занимает окно с отступом 8 px, и конец подписи обрезается многоточием».
- `HamburgerMenu`: в перечень полей пункта — `icon`; абзац «Меню открывается…» — та же ширина и сдвиг.
- `TextPopover`: «У левого края окна подсказка сужается до места слева от иконки.» — без «как и меню».
- Над «## Обновление с 0.19» — раздел:

```markdown
## Обновление с 0.22

Меню `DropdownButtonWithAction` и `HamburgerMenu` больше не переносят подписи
пунктов: меню шире 224 px, если этого требует самый длинный пункт, а у края окна
сдвигается вправо, а не сужается. Страницам ничего менять не нужно. Иконка
действия — необязательное поле `icon: 'plus'`.
```

- [ ] **Step 6: Закоммитить**

```bash
git add playground/App.vue e2e/actionIcons.e2e.js e2e/menuScrollbar.e2e.js README.md
git commit -m "docs: показать иконки действий в Playground и описать ширину меню"
```

### Task 6: Приёмка и выпуск

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Проверить ветку**

Run: `npm test && npm run test:browser`
Expected: всё проходит, вывод чистый.

- [ ] **Step 2: Принять в Playground**

Chrome — исполнитель, Safari — владелец: иконка на кнопке и в меню в трёх цветах; длинные подписи; меню у левого края; клавиатура в меню с иконками; подсказки Vimium на основной кнопке с иконкой. Адрес для владельца — `npm run playground`.

- [ ] **Step 3: Поднять версию после итогового ревью и приёмки владельца**

Run: `npm version 0.23.0 --no-git-tag-version`
Expected: `0.23.0` в `package.json` и `package-lock.json`.

- [ ] **Step 4: Закоммитить**

```bash
git add package.json package-lock.json
git commit -m "chore: поднять версию до 0.23.0"
```

Слияние, тег `v0.23.0` и публикация — только по слову владельца.
