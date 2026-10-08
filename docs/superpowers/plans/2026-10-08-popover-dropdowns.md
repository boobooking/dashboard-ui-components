# Выпадающие части на Popover API: PopoverPanel — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** список `SelectSingle` и календарь `PickDay` открываются на Popover API через общий приватный `PopoverPanel`, на котором стоит и меню `PopoverMenu`; `Popup` и `Overlay` удалены; выпуск `0.15.0`.

**Architecture:** механика выпадающей панели (кнопка со слотом `trigger`, панель `popover="auto"`, `v-model` с гашением ответного события, место у кнопки, закрытие прокруткой и размером окна, стрелки) переносится из `PopoverMenu` в `PopoverPanel.vue`. Меню, список и календарь задают над ним свою кнопку, содержимое и вид панели (`panelClass`). `placePopover` получает выравнивание по левому краю кнопки с разворотом у края окна.

**Tech Stack:** Vue 3.5 (Options API, SFC), Tailwind v4 с префиксом `bb:`, Vite 8 (library mode), vitest 5 + happy-dom + @vue/test-utils, Popover API (в тестах — `tests/popoverStub.js`), Pikaday.

**Spec:** `docs/superpowers/specs/2026-10-08-popover-dropdowns-design.md`

## Global Constraints

- Ветка `feat/hamburger-menu`; версия в `package.json` — `0.14.0` до последней задачи, затем `0.15.0` последним коммитом. Слияние и публикация — только по слову владельца.
- `PopoverPanel` — пропы ровно: `modelValue` (`Boolean`, `false`), `hasContent` (`Boolean`, `true`), `align` (`String`, `"end"`, валидатор `["start", "end"]`), `maxWidth` (`Number`, `null`), `arrows` (`Boolean`, `false`), `findSelected` (`Function`, `() => null`), `closeOnClick` (`Boolean`, `false`), `panelClass` (`String`, `""`), `panelRole` (`String`, `null`); с Task 5 — ещё `returnFocus` (`Boolean`, `false`). Событие `update:modelValue`. Слоты `trigger` (`{ id, popovertarget }`) и по умолчанию.
- Кнопка в слоте `trigger` получает атрибуты явно: `:id="trigger.id" :popovertarget="trigger.popovertarget"`; `v-bind="trigger"` запрещён.
- В `panelClass` (атрибут `panel-class`) нет утилит отображения: `bb:block`, `bb:inline-block`, `bb:inline`, `bb:flex`, `bb:inline-flex`, `bb:grid`, `bb:inline-grid`, `bb:table`, `bb:contents`, `bb:flow-root`, `bb:hidden`.
- `:class="panelClass"` проверка префикса принимает только в файле `PopoverPanel.vue`.
- Классы вида меню, стрелки, ☰, пунктов меню, `ListElement` и поля `PickDay` не меняются, кроме названных в задачах.
- Код переносится, а не пишется заново: комментарии сохраняются; меняются только те, что после правки стали бы ложными.
- Каждый класс в шаблоне — с префиксом `bb:` (кроме `bb-dashboard-ui`), `:class` — только литералы; это проверяет `tests/utilityPrefix.test.js`.
- Стиль кода: в `.vue` — двойные кавычки и точки с запятой; в `.js` (и `src`, и тестах) — одинарные кавычки без точек с запятой; отступ 4 пробела; комментарии по-русски, описывают код как он есть.
- Вывод `npm test` чистый: ни одного предупреждения или ошибки; ожидаемые предупреждения перехватываются в тестах.
- Логи — в рабочую папку плана `W=.superpowers/sdd/2026-10-08-popover-dropdowns` (git-ignored, создаётся в Task 1: `mkdir -p "$W"`). Полный набор — один прогон с логом и кодом завершения: `npm test > $W/<имя>.log 2>&1; echo "exit $?"`, итоги и шум — `grep` по логу. Не строить цепочки `npm test | grep … && …`.
- Коммиты — conventional commits по-русски, повелительное наклонение, без служебных строк; `--no-verify` запрещён.

## Review Focus

- Safari: по клику фокус на кнопку не ставится, а при закрытии popover браузер уводит его на body раньше, чем приходит `toggle`. После Escape или выбора пункта с клавиатуры фокус должен вернуться на кнопку списка. Тест, повторяющий это поведение, — Task 5.
- Клик по соседнему полю при открытом списке: список закрывается, а фокус остаётся в соседнем поле — возврат фокуса его не забирает. Тест — Task 5.
- Классы, переданные на `<popover-menu>` (`DropdownButtonWithAction` → `PopoverMenu` → `PopoverPanel`), доходят до обёртки стрелки сквозь два компонента. Тест — Task 4.
- Пункты `SelectSingle` пропали при открытом списке и вернулись: список возвращается закрытым, стрелки на странице не перехвачены, новое открытие ходит по новому списку. Тест (существующий, на заглушке) — Task 5.
- Клик по самому полю `PickDay` — по тексту даты, подсказке, пустому месту — открывает календарь, хотя поле лежит в `<label>` внутри кнопки. Заглушка это не проверит; тест класса — Task 6, клик настоящей мышью — Task 10.

---

### Task 1: Снимки нынешних списка и календаря

До любых правок: эталон для сравнения в Task 10.

**Files:**
- Временно: `/Users/boobooking/Code/mars/certificates/src/public/build/ui-playground/` (удаляется в конце задачи)
- Снимки: `$W/before-*.png`, `$W/before-geometry.md`

**Interfaces:**
- Consumes: —
- Produces: снимки и размеры нынешних списка `SelectSingle` и календаря `SelectDateInterval` в Playground и окружении приложения.

- [ ] **Step 1: Сборка и выкладка**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
mkdir -p "$W"
npm run build > $W/t1-build.log 2>&1 && npx vite build --config vite.playground.config.js --outDir /Users/boobooking/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./ >> $W/t1-build.log 2>&1; echo "build exit $?"
```

Expected: `build exit 0`.

- [ ] **Step 2: Снимки в Chrome (chrome-devtools MCP)**

На `https://certificates.test/build/ui-playground/index.html` и `…/host.html` (окно 800×600):

1. Раздел `SelectSingle`: прокрутить к нему, кликнуть по полю «Вендор», снять экран в `$W/before-select-index.png` (и `-host.png`), записать в `$W/before-geometry.md` `getBoundingClientRect()` кнопки поля и списка (`left`, `top`, `width`, `height`) и зазор между ними. Escape.
2. Раздел `SelectDateInterval`: кликнуть по полю «от», снять `$W/before-calendar-index.png` (и `-host.png`), записать размеры кнопки поля и календаря. Клик вне.
3. `list_console_messages` — записать, есть ли сообщения.

Expected: четыре снимка и размеры записаны.

- [ ] **Step 3: Убрать сборку**

```bash
rm -rf /Users/boobooking/Code/mars/certificates/src/public/build/ui-playground && /bin/ls /Users/boobooking/Code/mars/certificates/src/public/build
```

Expected: `assets`, `manifest.json`. Коммитов нет.

---

### Task 2: `placePopover` с `align: "start"`

**Files:**
- Modify: `src/popover.js` (функция `placePopover` и комментарий над ней)
- Test: `tests/popover.test.js`

**Interfaces:**
- Consumes: —
- Produces: `placePopover(anchor, popover, { maxWidth = null, align = 'end' } = {})`. `align: 'end'` — как сейчас; `maxWidth` ставится всегда: `''`, если не задан, иначе `min(maxWidth, место слева)`. `align: 'start'` — левый край по кнопке, если справа места не меньше, чем слева, иначе правый край по кнопке; `maxWidth` — место с той стороны, куда панель растёт, и заданный `maxWidth`.

- [ ] **Step 1: Тесты**

В `tests/popover.test.js` в `describe('placePopover', …)` после теста `'в крошечном окне ширина и высота не уходят ниже нуля'` вставить:

```js
    it('align start: левый край по кнопке, ширина — местом справа', () => {
        viewport(1000, 800)
        const popover = document.createElement('div')

        placePopover(anchorAt({ top: 100, bottom: 140, left: 100, right: 320 }), popover, { align: 'start' })

        expect(popover.style.left).toBe('100px')
        expect(popover.style.right).toBe('auto')
        expect(popover.style.top).toBe('144px')
        expect(popover.style.maxWidth).toBe('892px')
    })

    it('align start: у правого края окна — правым краем по кнопке, ширина — местом слева', () => {
        viewport(1000, 800)
        const popover = document.createElement('div')

        placePopover(anchorAt({ top: 100, bottom: 140, left: 700, right: 920 }), popover, { align: 'start' })

        expect(popover.style.left).toBe('auto')
        expect(popover.style.right).toBe('80px')
        expect(popover.style.maxWidth).toBe('912px')
    })

    it('align start: maxWidth ограничивает ширину вместе с местом', () => {
        viewport(300, 800)
        const popover = document.createElement('div')

        placePopover(anchorAt({ top: 100, bottom: 140, left: 100, right: 200 }), popover, { align: 'start', maxWidth: 224 })
        expect(popover.style.maxWidth).toBe('192px')

        viewport(1000, 800)
        placePopover(anchorAt({ top: 100, bottom: 140, left: 100, right: 200 }), popover, { align: 'start', maxWidth: 224 })
        expect(popover.style.maxWidth).toBe('224px')
    })

    it('повторное размещение другой стороной не оставляет старых координат', () => {
        viewport(1000, 800)
        const popover = document.createElement('div')

        placePopover(anchorAt({ top: 100, bottom: 140, left: 900, right: 920 }), popover, { maxWidth: 224 })
        placePopover(anchorAt({ top: 100, bottom: 140, left: 100, right: 320 }), popover, { align: 'start' })
        expect(popover.style.right).toBe('auto')
        expect(popover.style.left).toBe('100px')
        expect(popover.style.maxWidth).toBe('892px')

        placePopover(anchorAt({ top: 100, bottom: 140, left: 900, right: 920 }), popover)
        expect(popover.style.left).toBe('auto')
        expect(popover.style.right).toBe('80px')
        expect(popover.style.maxWidth).toBe('')
    })
```

- [ ] **Step 2: Тесты падают**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npx vitest run tests/popover.test.js > $W/t2-red.log 2>&1; echo "exit $?"
grep -E "×|Tests " $W/t2-red.log
```

Expected: `exit 1`; падают ровно четыре новых теста, старые проходят.

- [ ] **Step 3: Реализация**

В `src/popover.js` заменить комментарий над `placePopover` и саму функцию на:

```js
// Место элемента у кнопки. align "end" — правый край элемента по правому
// краю кнопки: кнопки меню стоят у правого края строк и ячеек, и элемент
// растёт влево, к середине страницы. align "start" — левый край по левому
// краю кнопки, как у списка и календаря поля; если справа места меньше, чем
// слева, элемент прижимается правым краем: у правого края окна он ушёл бы
// за экран, а верхний слой не прокручивается. По вертикали — туда, где
// больше места; высота ограничена этим местом. Ширина у "start" ограничена
// местом с той стороны, куда элемент растёт, и у обоих — maxWidth, если он
// задан. Размер самого элемента для расчёта не нужен, поэтому функцию зовут
// в beforetoggle, до его появления: он открывается сразу на своём месте.
// Координаты ставятся все каждый раз: прошлое открытие могло быть у другой
// кнопки или другой стороной.
export function placePopover(anchor, popover, { maxWidth = null, align = 'end' } = {}) {
    const rect = anchor.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth
    const viewportHeight = document.documentElement.clientHeight

    const left = Math.max(VIEWPORT_MARGIN, rect.left)
    const right = Math.max(VIEWPORT_MARGIN, viewportWidth - rect.right)
    const spaceRight = Math.max(0, viewportWidth - left - VIEWPORT_MARGIN)
    const spaceLeft = Math.max(0, viewportWidth - right - VIEWPORT_MARGIN)
    const growsRight = align === 'start' && spaceRight >= spaceLeft
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom - GAP - VIEWPORT_MARGIN)
    const spaceAbove = Math.max(0, rect.top - GAP - VIEWPORT_MARGIN)
    const opensBelow = spaceBelow >= spaceAbove

    // Меню без maxWidth ширину задаёт себе само (bb:w-56).
    let width = ''
    if (align === 'start') {
        const space = growsRight ? spaceRight : spaceLeft
        width = `${maxWidth === null ? space : Math.min(maxWidth, space)}px`
    } else if (maxWidth !== null) {
        width = `${Math.min(maxWidth, spaceLeft)}px`
    }

    Object.assign(popover.style, {
        top: opensBelow ? `${rect.bottom + GAP}px` : 'auto',
        bottom: opensBelow ? 'auto' : `${viewportHeight - rect.top + GAP}px`,
        right: growsRight ? 'auto' : `${right}px`,
        left: growsRight ? `${left}px` : 'auto',
        maxHeight: `${opensBelow ? spaceBelow : spaceAbove}px`,
        maxWidth: width,
    })
}
```

- [ ] **Step 4: Тесты проходят**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npx vitest run tests/popover.test.js tests/DropdownButtonWithAction.test.js tests/HamburgerMenu.test.js > $W/t2-green.log 2>&1; echo "exit $?"
grep -E "Test Files|Tests |×" $W/t2-green.log
```

Expected: `exit 0`, все три файла проходят (меню на `align: 'end'` не изменились).

- [ ] **Step 5: Весь набор и коммит**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npm test > $W/t2-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t2-suite.log
grep -ciE "warn|error|stderr" $W/t2-suite.log
git add src/popover.js tests/popover.test.js
git commit -m "feat: прижимать выпадающую панель к левому краю кнопки с разворотом у края окна"
```

Expected: `tests exit 0`, `Test Files  31 passed (31)`, `Tests  439 passed (439)`, `0`.

---

### Task 3: Исключение `panelClass` в проверке префикса

**Files:**
- Modify: `tests/utilityPrefix.test.js`

**Interfaces:**
- Consumes: —
- Produces: `classTokens(source, fileName)`; `:class="panelClass"` принимается только при `fileName === 'PopoverPanel.vue'`.

- [ ] **Step 1: Тесты исключения**

В конец `tests/utilityPrefix.test.js` добавить:

```js
describe('исключение для panelClass', () => {
    const panel = '<template><div class="bb:m-0" :class="panelClass"></div></template>'

    it('в PopoverPanel.vue :class="panelClass" принимается', () => {
        expect(classTokens(panel, 'PopoverPanel.vue')).toEqual(['bb:m-0'])
    })

    it('в другом файле то же отклоняется', () => {
        expect(() => classTokens(panel, 'DropdownButton.vue')).toThrow('форма Identifier в :class не проверяется')
    })

    it('утилита без префикса в panel-class вызывающего компонента находится', () => {
        const caller = '<template><popover-panel panel-class="bb:border flex"></popover-panel></template>'

        expect(classTokens(caller, 'PickDay.vue')).toEqual(['bb:border', 'flex'])
    })
})
```

- [ ] **Step 2: Тест падает**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npx vitest run tests/utilityPrefix.test.js > $W/t3-red.log 2>&1; echo "exit $?"
grep -E "×|Tests |Identifier" $W/t3-red.log | head
```

Expected: `exit 1`; падает `в PopoverPanel.vue :class="panelClass" принимается` («форма Identifier в :class не проверяется»); два других проходят.

- [ ] **Step 3: Реализация**

В `tests/utilityPrefix.test.js`:

1. Сигнатура и рекурсия `classLiterals` получают имя файла, а перед `default:` добавляется ветка `Identifier`:

```js
function classLiterals(node, fileName) {
    switch (node.type) {
        case 'ObjectExpression':
            return node.properties.map((property) => {
                if (property.type !== 'ObjectProperty' || property.key.type !== 'StringLiteral') {
                    throw new Error(`ключ в :class должен быть строковым литералом, а не ${property.key?.type ?? property.type}`)
                }
                return property.key.value
            })
        case 'ConditionalExpression':
            return [...classLiterals(node.consequent, fileName), ...classLiterals(node.alternate, fileName)]
        case 'ArrayExpression':
            return node.elements.flatMap((element) => classLiterals(element, fileName))
        case 'StringLiteral':
            return [node.value]
        case 'MemberExpression':
            // $attrs.class — классы приложения на корне компонента: это
            // утилиты приложения, а не пакета, и префикса у них нет.
            if (node.object.type === 'Identifier' && node.object.name === '$attrs'
                && node.property.type === 'Identifier' && node.property.name === 'class' && !node.computed) {
                return []
            }
            throw new Error('форма MemberExpression в :class не проверяется — запишите классы литералами')
        case 'Identifier':
            // panelClass в PopoverPanel.vue — вид панели, переданный атрибутом
            // panel-class вызывающих компонентов. Этот атрибут тест читает
            // как проп классов и проверяет каждую утилиту в нём, поэтому
            // здесь проверять нечего. В любом другом файле имя переменной
            // в :class статически не проверить.
            if (node.name === 'panelClass' && fileName === 'PopoverPanel.vue') {
                return []
            }
            throw new Error('форма Identifier в :class не проверяется — запишите классы литералами')
        default:
            throw new Error(`форма ${node.type} в :class не проверяется — запишите классы литералами`)
    }
}
```

2. `function classTokens(source)` → `function classTokens(source, fileName)`; внутри вызов `classLiterals(expression)` → `classLiterals(expression, fileName)`.
3. В цикле по файлам `classTokens(fs.readFileSync(file, 'utf8'))` → `classTokens(fs.readFileSync(file, 'utf8'), path.basename(file))`.

- [ ] **Step 4: Тесты проходят, весь набор, коммит**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npx vitest run tests/utilityPrefix.test.js > $W/t3-green.log 2>&1; echo "exit $?"
grep -E "Tests |×" $W/t3-green.log
npm test > $W/t3-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t3-suite.log
grep -ciE "warn|error|stderr" $W/t3-suite.log
git add tests/utilityPrefix.test.js
git commit -m "test: разрешить panelClass в :class только в PopoverPanel"
```

Expected: `exit 0`; `tests exit 0`, `Tests  442 passed (442)`, `0`.

---

### Task 4: `PopoverPanel`; `PopoverMenu` на нём

Перенос без изменения поведения меню: 59 тестов `DropdownButtonWithAction` и 21 тест `HamburgerMenu` не меняются.

**Files:**
- Create: `tests/PopoverPanel.test.js`
- Create: `src/components/PopoverPanel.vue`
- Modify: `src/components/PopoverMenu.vue` (файл целиком)

**Interfaces:**
- Consumes: `placePopover(anchor, popover, { maxWidth, align })` (Task 2); `canControlPopover`, `closeOnScrollAndResize`, `isPopoverOpen` (`src/popover.js`); `moveMenuFocus(menu, findSelected)` (`src/menuFocus.js`); `toMenuItems` (`src/menuItems.js`); `withNavigation` (`src/navigation.js`).
- Produces: `src/components/PopoverPanel.vue` с интерфейсом из Global Constraints (без `returnFocus`); методы `applyPanelState()`, `close()`, `onClick()`, `onBeforeToggle(event)`, `onToggle()`, `stopListening()`; поля `buttonId`, `panelId`, `panelIsOpen`, `stopClosing`, `stopArrows`. `PopoverMenu` — прежний интерфейс (`actions`, `modelValue`, `update:modelValue`, слот `trigger`).

- [ ] **Step 1: Прогон меню до переноса**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npx vitest run tests/DropdownButtonWithAction.test.js tests/HamburgerMenu.test.js --reporter=verbose > $W/t4-before.log 2>&1; echo "exit $?"
grep -E "(✓|×) .* > " $W/t4-before.log | sed -E 's/ [0-9]+ms$//' | sort > $W/t4-before.txt
wc -l < $W/t4-before.txt
```

Expected: `exit 0`, `80`.

- [ ] **Step 2: Тесты `PopoverPanel`**

Создать `tests/PopoverPanel.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import PopoverPanel from '../src/components/PopoverPanel.vue'
import DropdownButtonWithAction from '../src/components/DropdownButtonWithAction.vue'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

// Панель — popover="auto" Popover API. Его заменяет tests/popoverStub.js:
// toggle в нём приходит отложенно и объединённо, как в браузере. attachTo
// нужен показу: showPopover требует элемент в документе.
let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
})

async function settle() {
    await flushToggles()
    await flushPromises()
}

// Кнопка из слота trigger и одна кнопка внутри панели.
function mountPanel({ props = {}, attrs = {}, warnings = null } = {}) {
    return mount(PopoverPanel, {
        attachTo: document.body,
        props,
        attrs,
        slots: {
            trigger: (trigger) => h('button', { type: 'button', id: trigger.id, popovertarget: trigger.popovertarget }, 'Открыть'),
            default: () => h('button', { type: 'button' }, 'Пункт'),
        },
        global: warnings === null ? {} : { config: { warnHandler: (message) => warnings.push(message) } },
    })
}

function buttonOf(wrapper) {
    return wrapper.get('button[popovertarget]')
}

function panelOf(wrapper) {
    return wrapper.get('[popover]')
}

function isOpen(wrapper) {
    return panelOf(wrapper).element.matches(':popover-open')
}

describe('PopoverPanel', () => {
    it('класс на <popover-panel> ложится на обёртку кнопки', () => {
        const wrapper = mountPanel({ attrs: { class: 'bb:flex bb:w-full' } })

        expect(buttonOf(wrapper).element.parentElement.className).toBe('bb:relative bb:flex bb:w-full')
    })

    it('классы DropdownButtonWithAction доходят до обёртки стрелки сквозь PopoverMenu', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { actions: [{ label: 'Удалить', onSelect: () => {} }] },
            slots: { button: () => 'Редактировать' },
        })

        expect(wrapper.get('button[popovertarget]').element.parentElement.className).toBe('bb:relative bb:-ml-px bb:block')
    })

    it('panel-role="menu" — роль, вертикальная ориентация и имя от кнопки', () => {
        const wrapper = mountPanel({ props: { panelRole: 'menu' } })

        expect(panelOf(wrapper).attributes('role')).toBe('menu')
        expect(panelOf(wrapper).attributes('aria-orientation')).toBe('vertical')
        expect(panelOf(wrapper).attributes('aria-labelledby')).toBe(buttonOf(wrapper).attributes('id'))
    })

    it('без panel-role — ни роли, ни ориентации', () => {
        const wrapper = mountPanel()

        expect(panelOf(wrapper).attributes('role')).toBeUndefined()
        expect(panelOf(wrapper).attributes('aria-orientation')).toBeUndefined()
    })

    it('клик внутри без close-on-click панель не закрывает', async () => {
        const wrapper = mountPanel()
        await buttonOf(wrapper).trigger('click')
        await settle()

        await panelOf(wrapper).get('button').trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(true)
    })

    it('клик внутри с close-on-click закрывает панель и сообщает родителю', async () => {
        const wrapper = mountPanel({ props: { closeOnClick: true } })
        await buttonOf(wrapper).trigger('click')
        await settle()

        await panelOf(wrapper).get('button').trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('align вне списка — предупреждение Vue', () => {
        const warnings = []
        mountPanel({ props: { align: 'left' }, warnings })

        expect(warnings.some((message) => message.includes('Invalid prop: custom validator check failed for prop "align"'))).toBe(true)
    })

    it('без содержимого нет ни кнопки, ни панели', () => {
        mountPanel({ props: { hasContent: false } })

        expect(document.body.querySelector('button')).toBeNull()
        expect(document.body.querySelector('[popover]')).toBeNull()
    })
})
```

- [ ] **Step 3: Тесты падают**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npx vitest run tests/PopoverPanel.test.js > $W/t4-red.log 2>&1; echo "exit $?"
grep -E "Failed to resolve|PopoverPanel.vue|Tests " $W/t4-red.log | head -5
```

Expected: `exit 1`; файл падает на импорте `../src/components/PopoverPanel.vue` (файла нет).

- [ ] **Step 4: Создать `src/components/PopoverPanel.vue`**

```vue
<template>
    <!-- Корень — обёртка кнопки и панели. Отображение и размеры задаёт
         вызывающий компонент классом на <popover-panel>: у каждой
         выпадающей части своя раскладка. -->
    <span class="bb:relative" v-if="hasContent">
        <!-- Кнопку, которая открывает панель, рисует вызывающий компонент и
             вешает на неё id и popovertarget из пропсов слота. Открывает и
             закрывает панель браузер по popovertarget: свой обработчик click
             открывал бы панель заново сразу после того, как браузер закрыл её
             по клику вне. -->
        <slot name="trigger" :id="buttonId" :popovertarget="panelId"></slot>
        <!-- Панель в верхнем слое браузера: таблицу с горизонтальной
             прокруткой она не расширяет, и обёртки с прокруткой её не
             обрезают. m-0 inset-auto снимают умолчания браузера для
             [popover], иначе панель встала бы в центр окна; координаты
             ставит placePopover. Вид панели — panelClass вызывающего
             компонента, без утилит отображения: они перебили бы display:
             none закрытой панели. Общие для всех панелей классы — только
             здесь: правка вида, например анимация появления, меняет все
             выпадающие части сразу. -->
        <div
            ref="panel"
            :id="panelId"
            popover="auto"
            class="bb:m-0 bb:inset-auto"
            :class="panelClass"
            :role="panelRole"
            :aria-orientation="panelRole === 'menu' ? 'vertical' : null"
            :aria-labelledby="buttonId"
            @beforetoggle="onBeforeToggle"
            @toggle="onToggle"
            @click="onClick"
        >
            <slot></slot>
        </div>
    </span>
</template>

<script>
import { useId } from "vue";
import { canControlPopover, closeOnScrollAndResize, isPopoverOpen, placePopover } from "../popover.js";
import { moveMenuFocus } from "../menuFocus.js";

// Выпадающая панель у кнопки на Popover API: открытие и закрытие, место у
// кнопки, закрытие прокруткой и изменением размера окна, стрелки. Кнопку и
// содержимое рисует вызывающий компонент.
// Внутренний компонент пакета: на нём стоят меню PopoverMenu, список
// SelectSingle (DropdownButton) и календарь PickDay.
export default {
    emits: ["update:modelValue"],

    props: {
        modelValue: {
            type: Boolean,
            default: false,
        },
        // Без содержимого нет ни кнопки, ни панели.
        hasContent: {
            type: Boolean,
            default: true,
        },
        // "end" — правый край панели по правому краю кнопки, "start" — левый
        // по левому, с разворотом у края окна (placePopover).
        align: {
            type: String,
            default: "end",
            validator: (value) => ["start", "end"].includes(value),
        },
        // Наибольшая ширина панели, px.
        maxWidth: {
            type: Number,
            default: null,
        },
        // Стрелки и мышь ведут фокус по кнопкам и ссылкам панели.
        arrows: {
            type: Boolean,
            default: false,
        },
        // Выбранный пункт: от него считают стрелки, пока фокус вне панели.
        findSelected: {
            type: Function,
            default: () => null,
        },
        // Клик внутри панели закрывает её — после обработчика пункта.
        closeOnClick: {
            type: Boolean,
            default: false,
        },
        // Вид панели: рамка, фон, скругление, тень. Без утилит отображения.
        panelClass: {
            type: String,
            default: "",
        },
        // Роль панели; у меню — ещё и вертикальная ориентация.
        panelRole: {
            type: String,
            default: null,
        },
    },

    setup() {
        return {
            buttonId: useId(),
            panelId: useId(),
        };
    },

    data() {
        return {
            // Текущее значение панели. По нему гасится ответное событие:
            // toggle браузер присылает позже и объединяет переключения подряд,
            // поэтому временный флаг вокруг showPopover() его бы пропустил.
            panelIsOpen: this.modelValue,
        };
    },

    watch: {
        // Входящее значение только принимается. Ответное событие вернуло бы
        // родителю его же решение, и обработчик вида «закрыли — сбросить
        // выбор» сбросил бы строку, которую родитель только что выбрал.
        modelValue(isOpen) {
            this.panelIsOpen = isOpen;
            this.applyPanelState();
        },

        // DOM панели появляется и исчезает только при рендере, поэтому
        // наблюдатель — после него (flush: "post"). Содержимое появилось:
        // наблюдатель modelValue мог сработать раньше, когда панели ещё не
        // было в DOM, — состояние применяется заново. Содержимое пропало:
        // удаляя открытый popover из документа, браузер не присылает toggle,
        // и без этого слушатели стрелок и прокрутки остались бы висеть,
        // а родитель считал бы панель открытой.
        hasContent: {
            flush: "post",
            handler(hasContent) {
                if (hasContent) {
                    this.applyPanelState();
                    return;
                }

                this.stopListening();

                if (this.panelIsOpen) {
                    this.panelIsOpen = false;
                    this.$emit("update:modelValue", false);
                }
            },
        },
    },

    created() {
        // Снимает слушатели прокрутки и размера окна, пока панель открыта.
        this.stopClosing = null;
        // Снимает слушатель стрелок, пока панель открыта.
        this.stopArrows = null;
    },

    mounted() {
        this.applyPanelState();
    },

    beforeUnmount() {
        this.stopListening();
    },

    methods: {
        // Привести панель к panelIsOpen. Без Popover API и вне документа
        // управлять нечем.
        applyPanelState() {
            const panel = this.$refs.panel;

            if (!canControlPopover(panel) || !panel.isConnected) {
                return;
            }

            if (this.panelIsOpen && !isPopoverOpen(panel)) {
                panel.showPopover();
            }

            if (!this.panelIsOpen && isPopoverOpen(panel)) {
                panel.hidePopover();
            }
        },

        close() {
            const panel = this.$refs.panel;

            if (isPopoverOpen(panel)) {
                panel.hidePopover();
            }
        },

        onClick() {
            if (this.closeOnClick) {
                this.close();
            }
        },

        // Место панели — по кнопке из слота, а не по обёртке: обёртка может
        // быть шире кнопки.
        onBeforeToggle(event) {
            if (event.newState === "open") {
                placePopover(document.getElementById(this.buttonId), this.$refs.panel, { maxWidth: this.maxWidth, align: this.align });
            }
        },

        // Единственный путь, которым панель сообщает родителю об открытии или
        // закрытии: кнопка, клик вне, Escape, клик внутри при closeOnClick,
        // прокрутка, размер окна. Значение, совпавшее с текущим, — эхо
        // входящего, его не эмитят. Слушатели и сообщение родителю — по
        // фактическому состоянию панели, а не по newState: toggle мог прийти
        // после размонтирования, устареть или запоздать за содержимым,
        // которое пропало и унесло панель из DOM, — такая панель закрыта.
        onToggle() {
            this.stopListening();

            const panel = this.$refs.panel;
            const isOpen = isPopoverOpen(panel);
            if (isOpen) {
                this.stopClosing = closeOnScrollAndResize(panel, this.close);

                if (this.arrows) {
                    this.stopArrows = moveMenuFocus(panel, this.findSelected);
                }
            }

            if (isOpen === this.panelIsOpen) {
                return;
            }

            this.panelIsOpen = isOpen;
            this.$emit("update:modelValue", isOpen);
        },

        stopListening() {
            if (this.stopClosing !== null) {
                this.stopClosing();
                this.stopClosing = null;
            }

            if (this.stopArrows !== null) {
                this.stopArrows();
                this.stopArrows = null;
            }
        },
    },
};
</script>
```

- [ ] **Step 5: Заменить `src/components/PopoverMenu.vue` целиком**

```vue
<template>
    <!-- Механика меню — PopoverPanel; здесь пункты и вид панели меню.
         Ширина меню — bb:w-56 (224 px): у кнопки ближе к левому краю окна
         меню сужается до места слева. Клик внутри меню закрывает его:
         открытое меню легло бы поверх модалки, которую открывает пункт. -->
    <popover-panel
        :model-value="modelValue"
        :has-content="hasActions"
        align="end"
        :max-width="224"
        arrows
        close-on-click
        panel-class="bb:w-56 bb:rounded-md bb:shadow-lg bb:bg-white bb:ring-1 bb:ring-black/5"
        panel-role="menu"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <template #trigger="trigger">
            <slot name="trigger" :id="trigger.id" :popovertarget="trigger.popovertarget"></slot>
        </template>
        <template #default>
            <!-- Вид пунктов задаёт только компонент: страница передаёт
                 данные, а не разметку. Цвет текста у каждого пункта
                 свой: у popover в верхнем слое color браузера, а не
                 страницы. Подсветка — фокус, его ставят и
                 стрелки, и мышь (moveMenuFocus), поэтому hover-стилей нет. -->
            <template v-for="(item, index) in actionItems" :key="index">
                <a
                    v-if="isLink(item)"
                    :href="item.href"
                    role="menuitem"
                    class="bb:block bb:w-full bb:px-4 bb:py-2 bb:text-sm bb:text-left bb:cursor-pointer bb:focus:outline-hidden"
                    :class="item.danger === true ? 'bb:bg-red-400 bb:text-white bb:focus:bg-red-500' : 'bb:text-gray-700 bb:focus:bg-gray-100 bb:focus:text-gray-900'"
                    @click="followLink($event, item.href)"
                    v-text="item.label"
                ></a>
                <button
                    v-else
                    type="button"
                    role="menuitem"
                    class="bb:block bb:w-full bb:px-4 bb:py-2 bb:text-sm bb:text-left bb:cursor-pointer bb:focus:outline-hidden"
                    :class="item.danger === true ? 'bb:bg-red-400 bb:text-white bb:focus:bg-red-500' : 'bb:text-gray-700 bb:focus:bg-gray-100 bb:focus:text-gray-900'"
                    @click="select(item)"
                    v-text="item.label"
                ></button>
            </template>
        </template>
    </popover-panel>
</template>

<script>
import { withNavigation } from "../navigation.js";
import { toMenuItems } from "../menuItems.js";
import PopoverPanel from "./PopoverPanel.vue";

// Меню из пунктов actions на PopoverPanel: пункты и вид панели меню. Кнопку,
// которая открывает меню, рисует вызывающий компонент в слоте trigger.
// Внутренний компонент пакета: на нём стоят меню DropdownButtonWithAction
// и HamburgerMenu.
export default {
    components: {
        PopoverPanel,
    },

    mixins: [withNavigation],

    emits: ["update:modelValue"],

    props: {
        // Пункты меню: { label, href } — переход, { label, onSelect } —
        // действие, danger: true — опасный пункт. Тип и пункты проверяют
        // публичные компоненты: проверка и здесь давала бы каждое
        // предупреждение дважды.
        actions: {
            default: () => [],
        },
        modelValue: {
            type: Boolean,
            default: false,
        },
    },

    computed: {
        actionItems() {
            return toMenuItems(this.actions);
        },

        hasActions() {
            return this.actionItems.length > 0;
        },
    },

    methods: {
        // Ссылка — только при непустом строковом href; у ссылки onSelect
        // не вызывается.
        isLink(item) {
            return typeof item.href === "string" && item.href !== "";
        },

        // Кнопка без функции onSelect по клику только закрывает меню.
        // Результат onSelect возвращается обработчику клика: отклонённый
        // Promise асинхронного onSelect Vue передаёт в свой обработчик ошибок,
        // а без return отказ ушёл бы в unhandledrejection.
        select(item) {
            if (typeof item.onSelect === "function") {
                return item.onSelect();
            }
        },
    },
};
</script>
```

- [ ] **Step 6: Тесты `PopoverPanel` и сверка меню**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npx vitest run tests/PopoverPanel.test.js > $W/t4-green.log 2>&1; echo "panel exit $?"
grep -E "Tests |×" $W/t4-green.log
npx vitest run tests/DropdownButtonWithAction.test.js tests/HamburgerMenu.test.js --reporter=verbose > $W/t4-after.log 2>&1; echo "menus exit $?"
grep -E "(✓|×) .* > " $W/t4-after.log | sed -E 's/ [0-9]+ms$//' | sort > $W/t4-after.txt
diff $W/t4-before.txt $W/t4-after.txt; echo "diff exit $?"
```

Expected: `panel exit 0`, `Tests  8 passed (8)`; `menus exit 0`; `diff exit 0`. Непустой diff или `×` — разобрать по superpowers:systematic-debugging; тесты меню не менять.

- [ ] **Step 7: Весь набор, сборка, коммит**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npm test > $W/t4-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t4-suite.log
grep -ciE "warn|error|stderr" $W/t4-suite.log
npm run build > $W/t4-build.log 2>&1; echo "build exit $?"
grep -E "built|error" $W/t4-build.log
git add src/components/PopoverPanel.vue src/components/PopoverMenu.vue tests/PopoverPanel.test.js
git commit -m "refactor: вынести механику выпадающей панели из PopoverMenu в PopoverPanel"
```

Expected: `tests exit 0`, `Test Files  32 passed (32)`, `Tests  451 passed (451)` (8 тестов `PopoverPanel` и проверка префикса `PopoverPanel.vue`), `0`, `build exit 0`.

---

### Task 5: Список `SelectSingle` на `PopoverPanel`

**Files:**
- Modify: `tests/SelectSingle.test.js` (файл целиком)
- Modify: `src/components/PopoverPanel.vue` (проп `returnFocus`)
- Modify: `src/components/DropdownButton.vue` (файл целиком)
- Modify: `src/components/SelectSingle.vue` (файл целиком)

**Interfaces:**
- Consumes: `PopoverPanel` (Task 4).
- Produces: проп `returnFocus` у `PopoverPanel`; проп `findSelected` (`Function`, `() => null`) у `DropdownButton`; `SelectSingle` передаёт `activeItemElement`.

- [ ] **Step 1: Тесты**

Заменить `tests/SelectSingle.test.js` целиком. Семь прежних тестов — те же проверки; ожидание после действий — `settle()` вместо `flushPromises()`, потому что `toggle` заглушки приходит отложенно.

```js
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import SelectSingle from '../src/components/SelectSingle.vue'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

// Список — popover="auto" Popover API. Его заменяет tests/popoverStub.js:
// без него в happy-dom popovertarget список не откроет.
let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
})

const items = [
    { id: 'a', name: 'Первый' },
    { id: 'b', name: 'Второй' },
    { id: 'c', name: 'Третий' },
]

// Утилита отображения на самой панели перебила бы display: none закрытого
// popover, и закрытый список был бы виден.
const DISPLAY = /^bb:(block|inline-block|inline|flex|inline-flex|grid|inline-grid|table|contents|flow-root|hidden)$/

// attachTo нужен фокусу: элементу вне документа его не дать.
function mountSelect(props = {}) {
    return mount(SelectSingle, { props: { header: 'Вендор', items, ...props }, attachTo: document.body })
}

function triggerOf(wrapper) {
    return wrapper.find('button')
}

function panelOf(wrapper) {
    return wrapper.get('[popover]')
}

function isOpen(wrapper) {
    return panelOf(wrapper).element.matches(':popover-open')
}

function press(key) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    document.activeElement.dispatchEvent(event)
    return event
}

async function settle() {
    await flushToggles()
    await flushPromises()
}

async function open(wrapper) {
    triggerOf(wrapper).element.focus()
    await triggerOf(wrapper).trigger('click')
    await settle()
}

describe('SelectSingle', () => {
    it('не падает, если вместо списка пришёл null', () => {
        const errors = []
        mount(SelectSingle, {
            props: { header: 'Вендор', items: null },
            global: { config: { errorHandler: (error) => errors.push(error), warnHandler: () => {} } },
        })

        expect(errors).toEqual([])
    })

    it('в открытом списке стрелка вниз ведёт на первый пункт и не прокручивает страницу', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        const event = press('ArrowDown')

        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement.textContent).toBe('Первый')
    })

    it('отсчёт идёт от выбранного пункта', async () => {
        const wrapper = mountSelect({ modelValue: 'b' })
        await open(wrapper)

        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Третий')
    })

    it('в закрытом списке стрелки прокручивают страницу', () => {
        const wrapper = mountSelect()
        triggerOf(wrapper).element.focus()

        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })

    it('после выбора стрелки снова прокручивают страницу, а фокус возвращается на кнопку', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        document.activeElement.click()
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([['a']])
        expect(document.activeElement).toBe(triggerOf(wrapper).element)
        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })

    it('после закрытия по Escape фокус возвращается на кнопку', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        press('Escape')
        await settle()

        expect(document.activeElement).toBe(triggerOf(wrapper).element)
    })
})

describe('SelectSingle: пункты пропали при открытом списке', () => {
    function press(key) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
        document.activeElement.dispatchEvent(event)
        return event
    }

    it('стрелки снова прокручивают страницу, а вернувшиеся пункты открываются заново и ходят по новому списку', async () => {
        const wrapper = mount(SelectSingle, { props: { header: 'Вендор', items }, attachTo: document.body })
        wrapper.find('button').element.focus()
        await wrapper.find('button').trigger('click')
        await settle()

        await wrapper.setProps({ items: [] })
        await settle()

        const field = document.createElement('textarea')
        document.body.append(field)
        try {
            field.focus()
            expect(press('ArrowDown').defaultPrevented).toBe(false)
        } finally {
            field.remove()
        }

        await wrapper.setProps({ items })
        await settle()
        wrapper.find('button').element.focus()
        await wrapper.find('button').trigger('click')
        await settle()
        press('ArrowDown')

        expect(document.activeElement.textContent).toBe('Первый')
    })
})

describe('SelectSingle: список на Popover API', () => {
    it('список — панель popover="auto", кнопка открывает и закрывает её', async () => {
        const wrapper = mountSelect()

        expect(triggerOf(wrapper).attributes('popovertarget')).toBe(panelOf(wrapper).attributes('id'))
        expect(panelOf(wrapper).attributes('popover')).toBe('auto')

        await open(wrapper)
        expect(isOpen(wrapper)).toBe(true)

        await triggerOf(wrapper).trigger('click')
        await settle()
        expect(isOpen(wrapper)).toBe(false)
    })

    it('выбор пункта закрывает список', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        document.activeElement.click()
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.vm.isOpen).toBe(false)
    })

    it('клик вне списка закрывает его', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        document.body.click()
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.vm.isOpen).toBe(false)
    })

    it('прокрутка страницы закрывает список, прокрутка внутри списка — нет', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        panelOf(wrapper).element.dispatchEvent(new Event('scroll'))
        await settle()
        expect(isOpen(wrapper)).toBe(true)

        document.dispatchEvent(new Event('scroll'))
        await settle()
        expect(isOpen(wrapper)).toBe(false)
    })

    it('изменение размера окна закрывает список', async () => {
        const wrapper = mountSelect()
        await open(wrapper)

        window.dispatchEvent(new Event('resize'))
        await settle()

        expect(isOpen(wrapper)).toBe(false)
    })

    describe('место списка', () => {
        afterEach(() => {
            delete document.documentElement.clientWidth
            delete document.documentElement.clientHeight
        })

        function viewport(width, height) {
            Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: width })
            Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: height })
        }

        it('левым краем по полю, под ним', async () => {
            viewport(1000, 800)
            const wrapper = mountSelect()
            triggerOf(wrapper).element.getBoundingClientRect = () => ({ top: 100, bottom: 140, left: 50, right: 290 })

            await open(wrapper)

            expect(panelOf(wrapper).element.style.left).toBe('50px')
            expect(panelOf(wrapper).element.style.right).toBe('auto')
            expect(panelOf(wrapper).element.style.top).toBe('144px')
        })

        it('у нижнего края окна — вверх, высота ограничена местом до края', async () => {
            viewport(1000, 800)
            const wrapper = mountSelect()
            triggerOf(wrapper).element.getBoundingClientRect = () => ({ top: 700, bottom: 740, left: 50, right: 290 })

            await open(wrapper)

            expect(panelOf(wrapper).element.style.top).toBe('auto')
            expect(panelOf(wrapper).element.style.bottom).toBe('104px')
            expect(panelOf(wrapper).element.style.maxHeight).toBe('688px')
        })
    })

    it('открытие второго списка закрывает первый, id у панелей свои', async () => {
        const Page = {
            render: () => h('div', [
                h(SelectSingle, { header: 'Вендор', items }),
                h(SelectSingle, { header: 'Сертификат', items }),
            ]),
        }
        const page = mount(Page, { attachTo: document.body })
        const [first, second] = page.findAllComponents(SelectSingle)

        await first.find('button').trigger('click')
        await settle()
        await second.find('button').trigger('click')
        await settle()

        expect(second.get('[popover]').element.matches(':popover-open')).toBe(true)
        expect(first.get('[popover]').element.matches(':popover-open')).toBe(false)
        expect(first.vm.isOpen).toBe(false)
        expect(first.get('[popover]').attributes('id')).not.toBe(second.get('[popover]').attributes('id'))
    })

    it('у панели нет утилит отображения', () => {
        const wrapper = mountSelect()

        expect(panelOf(wrapper).classes().filter((name) => DISPLAY.test(name))).toEqual([])
    })

    // Так делает Safari: по клику фокус на кнопку не ставится, и при
    // закрытии popover браузер возвращает его туда, где он был до
    // открытия, — на body, раньше, чем придёт toggle.
    it('после Escape фокус возвращается на кнопку, даже если браузер увёл его на body', async () => {
        const wrapper = mountSelect()
        await open(wrapper)
        press('ArrowDown')

        press('Escape')
        document.activeElement.blur()
        await settle()

        expect(document.activeElement).toBe(triggerOf(wrapper).element)
    })

    it('фокус, ушедший при закрытии на другой элемент, остаётся там', async () => {
        const wrapper = mountSelect()
        const field = document.createElement('input')
        document.body.append(field)

        try {
            await open(wrapper)
            press('ArrowDown')

            press('Escape')
            field.focus()
            await settle()

            expect(document.activeElement).toBe(field)
        } finally {
            field.remove()
        }
    })
})
```

- [ ] **Step 2: Тесты падают**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npx vitest run tests/SelectSingle.test.js > $W/t5-red.log 2>&1; echo "exit $?"
grep -E "✓|×|Tests " $W/t5-red.log | head -30
```

Expected: `exit 1`. Падают новые тесты, которым нужна панель `[popover]` или возврат фокуса после ухода на body. Тест `фокус, ушедший при закрытии на другой элемент, остаётся там` может пройти и до реализации: он защищает соседнее поле от возврата фокуса. Прежние семь тестов проходят (на `Popup` они не зависят от заглушки).

- [ ] **Step 3: `returnFocus` в `PopoverPanel`**

В `src/components/PopoverPanel.vue`:

1. После пропа `panelRole` добавить:

```js
        // Фокус был внутри панели при закрытии — после закрытия он
        // возвращается на кнопку: иначе он пропал бы со страницы, и Tab
        // начинал бы с её начала. Safari по клику фокус на кнопку не ставит
        // и при закрытии уводит его на body, поэтому браузер кнопку сам
        // не вернёт. Фокус, который браузер отдал другому элементу (клик по
        // соседнему полю), не забирается.
        returnFocus: {
            type: Boolean,
            default: false,
        },
```

2. В `created()` после `this.stopArrows = null;` добавить:

```js
        // Был ли фокус внутри панели, когда она начала закрываться.
        this.focusWasInside = false;
```

3. Заменить `onBeforeToggle` с комментарием на:

```js
        // Место панели — по кнопке из слота, а не по обёртке: обёртка может
        // быть шире кнопки. При закрытии запоминается, был ли фокус внутри:
        // к toggle браузер его уже переставит.
        onBeforeToggle(event) {
            if (event.newState === "open") {
                placePopover(document.getElementById(this.buttonId), this.$refs.panel, { maxWidth: this.maxWidth, align: this.align });
                return;
            }

            const panel = this.$refs.panel;
            this.focusWasInside = panel !== undefined && panel !== null && panel.contains(document.activeElement);
        },
```

4. В `onToggle()` после блока `if (isOpen) { … }` добавить:

```js
            if (!isOpen) {
                this.restoreFocus(panel);
            }
```

5. После `onToggle()` добавить метод:

```js
        // Вернуть фокус на кнопку, если он был внутри закрытой панели и
        // теперь потерян: на body или всё ещё на скрытом пункте.
        restoreFocus(panel) {
            const focusWasInside = this.focusWasInside;
            this.focusWasInside = false;

            if (!this.returnFocus || !focusWasInside) {
                return;
            }

            const active = document.activeElement;
            const isLost = active === null || active === document.body || (panel !== undefined && panel !== null && panel.contains(active));
            if (isLost) {
                document.getElementById(this.buttonId)?.focus();
            }
        },
```

- [ ] **Step 4: Заменить `src/components/DropdownButton.vue` целиком**

```vue
<template>
    <div class="bb:flex bb:flex-col bb:grow bb:bg-white">
        <div class="bb:relative bb:flex bb:w-full bb:h-full">
            <!-- Список — PopoverPanel под кнопкой: открывает и закрывает его
                 браузер по popovertarget кнопки. Обёртка кнопки занимает
                 место кнопки рядом с ластиком. -->
            <popover-panel
                class="bb:flex bb:w-full bb:h-full"
                :model-value="isOpen"
                align="start"
                arrows
                :find-selected="findSelected"
                return-focus
                panel-class="bb:bg-white bb:border bb:border-gray-200 bb:rounded-md bb:shadow-lg"
                @update:model-value="$emit('update:isOpen', $event)"
            >
                <template #trigger="trigger">
                    <button
                        type="button"
                        :id="trigger.id"
                        :popovertarget="trigger.popovertarget"
                        class="bb:flex bb:w-full bb:h-full bb:items-center bb:focus:outline-hidden bb:cursor-pointer"
                    >
                        <span
                            class="bb:flex bb:w-full bb:h-full bb:pl-3 bb:pr-12 bb:py-2 bb:items-center bb:whitespace-nowrap bb:leading-none"
                            v-text="title"
                        />
                    </button>
                </template>
                <template #default>
                    <slot></slot>
                </template>
            </popover-panel>
            <eraser v-if="needsEraser" @click="$emit('erased')" class="bb:pr-2 bb:h-full"></eraser>
        </div>
    </div>
</template>

<script>
import PopoverPanel from "./PopoverPanel.vue";
import Eraser from "./Eraser.vue";

export default {
    components: { PopoverPanel, Eraser },

    emits: ["update:isOpen", "erased"],

    props: {
        isOpen: {
            type: Boolean,
            default: false,
        },
        title: {
            type: String,
            default: null,
        },
        hasValue: {
            type: Boolean,
            default: true,
        },
        // Выбранный пункт списка: от него считают стрелки.
        findSelected: {
            type: Function,
            default: () => null,
        },
    },

    computed: {
        needsEraser() {
            if (this.isOpen) {
                return false;
            }

            return this.hasValue;
        },
    },
};
</script>
```

- [ ] **Step 5: Заменить `src/components/SelectSingle.vue` целиком**

```vue
<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-none">
        <div class="bb:flex bb:w-full bb:flex-col bb:border bb:border-white bb:bg-white">
            <element-header :text="header" :is-required="isRequired" :is-loading="isLoading"/>
            <dropdown-button
                :title="activeItemName"
                v-model:is-open="isOpen"
                v-if="hasItems"
                :has-value="hasValue"
                :find-selected="activeItemElement"
                @erased="clear"
            >
                <!-- Рамку, фон, скругление и тень списка задаёт панель
                     DropdownButton; здесь — раскладка пунктов и разделители. -->
                <div
                    ref="list"
                    class="bb:flex bb:flex-col bb:py-1 bb:divide-y bb:divide-gray-200 bb:divide-dashed"
                >
                    <list-element
                        v-for="item in itemList"
                        :name="item.name"
                        :key="item.id"
                        :is-checked="item.id === modelValue"
                        @clicked="itemClicked(item)"
                    />
                </div>
            </dropdown-button>
        </div>
    </div>
</template>

<script>
import ElementHeader from "./ElementHeader.vue";
import DropdownButton from "./DropdownButton.vue";
import ListElement from "./ListElement.vue";

export default {
    components: {
        ElementHeader,
        DropdownButton,
        ListElement,
    },

    emits: ["update:modelValue", "changed"],

    props: {
        items: {
            type: Array,
            required: true,
        },
        // Сравнение идёт по id, а не по ссылке на объект: список приходит
        // новым массивом после каждого обновления пропсов, и сравнение по
        // ссылке заставляло бы вызывающий код искать активный элемент в том
        // же массиве, иначе галочка пропадала бы.
        modelValue: {
            type: [String, Number],
            default: null,
        },
        header: {
            type: String,
            required: true,
        },
        isRequired: {
            type: Boolean,
            default: false,
        },
        isLoading: {
            type: Boolean,
            default: false,
        },
    },

    data() {
        return {
            isOpen: false,
        };
    },

    watch: {
        // Пункты пропали — выпадающий список уходит из DOM открытым. Без
        // закрытия isOpen остался бы true, и вернувшиеся пункты открыли бы
        // список сами. Список закрывается и вернётся закрытым.
        hasItems(hasItems) {
            if (!hasItems) {
                this.isOpen = false;
            }
        },
    },

    computed: {
        // null и undefined — как пустой список: компонент не должен падать.
        itemList() {
            return this.items ?? [];
        },

        activeItem() {
            return this.itemList.find((item) => item.id === this.modelValue) ?? null;
        },

        activeItemName() {
            return this.activeItem === null ? null : this.activeItem.name;
        },

        hasItems() {
            return this.itemList.length > 0;
        },

        hasValue() {
            return this.activeItem !== null;
        },
    },

    methods: {
        // Повторный клик по выбранному снимает выбор — так же, как ластик.
        itemClicked(item) {
            this.isOpen = false;
            this.$emit("update:modelValue", item.id === this.modelValue ? null : item.id);
            this.$emit("changed");
        },

        clear() {
            this.$emit("update:modelValue", null);
            this.$emit("changed");
        },

        // Кнопка выбранного пункта: пункты стоят в списке в порядке itemList.
        activeItemElement() {
            const index = this.itemList.indexOf(this.activeItem);

            return index === -1 ? null : this.$refs.list.querySelectorAll("button")[index];
        },
    },
};
</script>
```

- [ ] **Step 6: Тесты проходят**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npx vitest run tests/SelectSingle.test.js tests/PopoverPanel.test.js tests/DropdownButtonWithAction.test.js tests/HamburgerMenu.test.js > $W/t5-green.log 2>&1; echo "exit $?"
grep -E "Test Files|Tests |×" $W/t5-green.log
```

Expected: `exit 0`, все четыре файла проходят.

- [ ] **Step 7: Весь набор, сборка, коммит**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npm test > $W/t5-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t5-suite.log
grep -ciE "warn|error|stderr" $W/t5-suite.log
npm run build > $W/t5-build.log 2>&1; echo "build exit $?"
grep -E "built|error" $W/t5-build.log
git add tests/SelectSingle.test.js src/components/PopoverPanel.vue src/components/DropdownButton.vue src/components/SelectSingle.vue
git commit -m "feat: открывать список SelectSingle на Popover API через PopoverPanel"
```

Expected: `tests exit 0`, `Tests  462 passed (462)` (11 новых тестов `SelectSingle`), `0`, `build exit 0`.

---

### Task 6: Календарь `PickDay` на `PopoverPanel`

**Files:**
- Modify: `tests/PickDay.test.js`
- Modify: `tests/SelectDateInterval.test.js`
- Modify: `src/components/PickDay.vue` (шаблон целиком; в `<script>` — импорт и `components`)

**Interfaces:**
- Consumes: `PopoverPanel` (Tasks 4–5).
- Produces: `PickDay` с прежним публичным интерфейсом; кнопка поля — `button[popovertarget]`, календарь — панель `[popover]`.

- [ ] **Step 1: Тесты `PickDay`**

В `tests/PickDay.test.js`:

1. Заменить первые строки импорта на:

```js
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import PickDay from '../src/components/PickDay.vue'
import Eraser from '../src/components/Eraser.vue'
import { formatDay } from '../src/date.js'
import { flushToggles, installPopoverStub } from './popoverStub.js'
```

2. В конец файла добавить:

```js
describe('PickDay: календарь на Popover API', () => {
    // Панель — popover="auto" Popover API. Его заменяет tests/popoverStub.js.
    let uninstallPopover

    beforeEach(() => {
        uninstallPopover = installPopoverStub()
    })

    afterEach(() => {
        uninstallPopover()
    })

    // Утилита отображения на самой панели перебила бы display: none
    // закрытого popover, и закрытый календарь был бы виден.
    const DISPLAY = /^bb:(block|inline-block|inline|flex|inline-flex|grid|inline-grid|table|contents|flow-root|hidden)$/

    function triggerOf(wrapper) {
        return wrapper.get('button[popovertarget]')
    }

    function panelOf(wrapper) {
        return wrapper.get('[popover]')
    }

    function isOpen(wrapper) {
        return panelOf(wrapper).element.matches(':popover-open')
    }

    async function settle() {
        await flushToggles()
        await flushPromises()
    }

    async function mountOpen(props = {}) {
        const wrapper = mount(PickDay, { props, attachTo: document.body })
        await pikadayLoaded()
        await triggerOf(wrapper).trigger('click')
        await settle()
        return wrapper
    }

    // Pikaday выбирает дату и листает месяцы по mousedown.
    function mousedown(element) {
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    }

    it('кнопка поля открывает календарь, выбор даты закрывает его и отдаёт дату', async () => {
        const wrapper = await mountOpen({ modelValue: '15.03.2026' })
        expect(isOpen(wrapper)).toBe(true)

        mousedown(wrapper.get('.pika-button[data-pika-day="20"]').element)
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toEqual([['20.03.2026']])
    })

    it('смена месяца внутри календаря его не закрывает', async () => {
        const wrapper = await mountOpen({ modelValue: '15.03.2026' })
        const before = wrapper.get('.pika-title').text()

        mousedown(wrapper.get('.pika-next').element)
        await wrapper.get('.pika-next').trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(true)
        expect(wrapper.get('.pika-title').text()).not.toBe(before)
    })

    it('Escape закрывает календарь', async () => {
        const wrapper = await mountOpen()

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await settle()

        expect(isOpen(wrapper)).toBe(false)
    })

    it('клик вне календаря закрывает его', async () => {
        const wrapper = await mountOpen()

        document.body.click()
        await settle()

        expect(isOpen(wrapper)).toBe(false)
    })

    it('пока календарь открыт, поле отключено, а ластика нет', async () => {
        const wrapper = mount(PickDay, { props: { modelValue: '15.03.2026' }, attachTo: document.body })
        await pikadayLoaded()
        expect(wrapper.findComponent(Eraser).exists()).toBe(true)
        expect(wrapper.get('input').attributes('disabled')).toBeUndefined()

        await triggerOf(wrapper).trigger('click')
        await settle()

        expect(wrapper.get('input').attributes('disabled')).toBeDefined()
        expect(wrapper.findComponent(Eraser).exists()).toBe(false)
    })

    // Заглушка находит кнопку через closest('[popovertarget]') и откроет
    // календарь и по клику на поле. В браузере клик по полю достаётся
    // <label> и полю: у них своё поведение активации, и до popovertarget
    // кнопки он не дойдёт. Сам клик проверяется в браузере, тест закрепляет
    // класс.
    it('<label> с полем не принимает клики: они достаются кнопке', () => {
        const wrapper = mount(PickDay, { attachTo: document.body })

        expect(wrapper.get('label').classes()).toContain('bb:pointer-events-none')
    })

    it('у панели нет утилит отображения', () => {
        const wrapper = mount(PickDay, { attachTo: document.body })

        expect(panelOf(wrapper).classes().filter((name) => DISPLAY.test(name))).toEqual([])
    })
})
```

- [ ] **Step 2: Тест `SelectDateInterval`**

В `tests/SelectDateInterval.test.js`:

1. Заменить импорты на:

```js
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import SelectDateInterval from '../src/components/SelectDateInterval.vue'
import { flushToggles, installPopoverStub } from './popoverStub.js'
```

2. В конец файла добавить:

```js
describe('SelectDateInterval: календари на Popover API', () => {
    let uninstallPopover

    beforeEach(() => {
        uninstallPopover = installPopoverStub()
    })

    afterEach(() => {
        uninstallPopover()
    })

    async function settle() {
        await flushToggles()
        await flushPromises()
    }

    it('открытие календаря «до» закрывает календарь «от»', async () => {
        const wrapper = mount(SelectDateInterval, { props: { header: 'Период' }, attachTo: document.body })
        const [from, to] = wrapper.findAll('button[popovertarget]')
        const [fromPanel, toPanel] = wrapper.findAll('[popover]')

        await from.trigger('click')
        await settle()
        expect(fromPanel.element.matches(':popover-open')).toBe(true)

        await to.trigger('click')
        await settle()
        expect(toPanel.element.matches(':popover-open')).toBe(true)
        expect(fromPanel.element.matches(':popover-open')).toBe(false)
    })
})
```

- [ ] **Step 3: Тесты падают**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npx vitest run tests/PickDay.test.js tests/SelectDateInterval.test.js > $W/t6-red.log 2>&1; echo "exit $?"
grep -E "✓|×|Tests " $W/t6-red.log | head -20
```

Expected: `exit 1`; падают восемь новых тестов (нет `button[popovertarget]`, `[popover]`, класса у `<label>`); прежние проходят.

- [ ] **Step 4: `PickDay` на `PopoverPanel`**

В `src/components/PickDay.vue` заменить `<template>…</template>` целиком на:

```vue
<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-col">
        <div class="bb:relative bb:flex bb:h-full bb:cursor-pointer bb:leading-none">
            <!-- Календарь — PopoverPanel под полем: открывает и закрывает его
                 браузер по popovertarget кнопки. Обёртка кнопки занимает
                 место кнопки рядом с ластиком. -->
            <popover-panel
                class="bb:flex bb:w-full"
                v-model="popupIsOpen"
                align="start"
                panel-class="bb:bg-white bb:border bb:border-gray-200 bb:rounded-md bb:shadow-lg"
            >
                <template #trigger="trigger">
                    <button
                        ref="trigger"
                        type="button"
                        :id="trigger.id"
                        :popovertarget="trigger.popovertarget"
                        class="bb:flex bb:w-full bb:items-center bb:focus:outline-hidden"
                    >
                        <!-- Клик по полю достаётся кнопке: у <label> и поля своё
                             поведение активации, и клик по тексту даты или
                             подсказке до popovertarget кнопки не дошёл бы. -->
                        <label class="bb:min-w-24 bb:w-full bb:h-full bb:pointer-events-none">
                            <!-- Геометрия поля выписана явно: базовый слой пакета обнуляет
                                 отступы и рамку, а раньше их неявно задавал @tailwindcss/forms
                                 приложения. py-2 pr-3 и рамка в 1 px — те же значения, что
                                 давал плагин. Левого отступа нет намеренно: отступ колонки
                                 задаёт родитель, а два сложившихся отступа уводили дату правее
                                 заголовка. placeholder:text-sm держит подсказку на ступень
                                 крупнее заголовка фильтра; размер получает только подсказка,
                                 выбранная дата остаётся крупнее. -->
                            <input
                                :disabled="popupIsOpen"
                                ref="field"
                                type="text"
                                :value="dayValue"
                                :placeholder="placeholderText"
                                class="bb:w-full bb:h-full bb:py-2 bb:pr-3 bb:leading-none bb:border bb:border-transparent bb:whitespace-nowrap bb:bg-transparent bb:placeholder:text-sm bb:placeholder-gray-300 bb:cursor-pointer bb:focus:outline-hidden"
                            />
                        </label>
                    </button>
                </template>
                <template #default>
                    <!-- Pikaday рисует календарь в этот контейнер; раскладку
                         держит он, а не панель: утилита отображения на панели
                         перебила бы display: none закрытой панели. -->
                    <div ref="container" class="bb:flex"></div>
                </template>
            </popover-panel>

            <eraser v-if="needsEraser" @click="clearPicker" class="bb:z-10 bb:h-full bb:pr-2"/>
        </div>
    </div>
</template>
```

В `<script>` заменить `import Popup from "./Popup.vue";` на `import PopoverPanel from "./PopoverPanel.vue";`, а в `components` — `Popup,` на `PopoverPanel,`. Остальной `<script>` не меняется.

- [ ] **Step 5: Тесты проходят**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npx vitest run tests/PickDay.test.js tests/SelectDateInterval.test.js tests/i18n.test.js tests/ssr.test.js tests/hydration.test.js > $W/t6-green.log 2>&1; echo "exit $?"
grep -E "Test Files|Tests |×" $W/t6-green.log
```

Expected: `exit 0`, все пять файлов проходят.

- [ ] **Step 6: Весь набор, сборка, коммит**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npm test > $W/t6-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t6-suite.log
grep -ciE "warn|error|stderr" $W/t6-suite.log
npm run build > $W/t6-build.log 2>&1; echo "build exit $?"
grep -E "built|error" $W/t6-build.log
git add tests/PickDay.test.js tests/SelectDateInterval.test.js src/components/PickDay.vue
git commit -m "feat: открывать календарь PickDay на Popover API через PopoverPanel"
```

Expected: `tests exit 0`, `Tests  470 passed (470)` (7 тестов `PickDay` и 1 `SelectDateInterval`), `0`, `build exit 0`.

---

### Task 7: Удалить `Popup` и `Overlay`

**Files:**
- Delete: `src/components/Popup.vue`, `src/components/Overlay.vue`, `tests/Overlay.test.js`
- Modify: `tests/utilityPrefix.test.js` (комментарий к `v-bind="$attrs"`)

**Interfaces:**
- Consumes: Tasks 5–6 (никто больше не импортирует `Popup`).
- Produces: пакет без `Popup` и `Overlay`.

- [ ] **Step 1: Никто их не импортирует**

```bash
grep -rnE "Popup|Overlay|popup|overlay" src tests --include='*.vue' --include='*.js'
```

Expected: только `src/components/Popup.vue`, `src/components/Overlay.vue`, `tests/Overlay.test.js`, проверка `'Popup'` в `tests/exports.test.js`, комментарий в `tests/utilityPrefix.test.js` (`Popup.vue пробрасывает атрибуты…`) и комментарий `<!-- Overlay -->` в `src/components/Modal.vue` — это собственный фон модалки, не компонент. Любой другой импорт — остановиться и разобрать.

- [ ] **Step 2: Удалить и поправить комментарий**

```bash
git rm -q src/components/Popup.vue src/components/Overlay.vue tests/Overlay.test.js
```

В `tests/utilityPrefix.test.js` заменить

```js
                        // разрешено: Popup.vue пробрасывает атрибуты приложения на меню
```

на

```js
                        // разрешено: компонент пробрасывает атрибуты приложения — это
                        // утилиты приложения, а не пакета
```

- [ ] **Step 3: Весь набор, сборка, коммит**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
grep -rnE "Popup|Overlay" src tests --include='*.vue' --include='*.js'
npm test > $W/t7-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t7-suite.log
grep -ciE "warn|error|stderr" $W/t7-suite.log
npm run build > $W/t7-build.log 2>&1; echo "build exit $?"
grep -E "built|error" $W/t7-build.log
git add tests/utilityPrefix.test.js
git commit -m "refactor: удалить Popup и Overlay"
```

Expected: `grep` — только `tests/exports.test.js` (`'Popup'`) и `src/components/Modal.vue` (`<!-- Overlay -->`); `tests exit 0`, `Test Files  31 passed (31)`, `Tests  467 passed (467)` (минус тест `Overlay` и две проверки префикса), `0`, `build exit 0`.

---

### Task 8: Playground — длинный список и календарь у края окна

**Files:**
- Modify: `playground/App.vue`
- Modify: `playground/shell.css`

**Interfaces:**
- Consumes: `SelectSingle`, `SelectDateInterval` (без изменений API).
- Produces: демо `SelectSingle` из 30 пунктов и `SelectDateInterval` у правого края полосы.

- [ ] **Step 1: Демо**

В `playground/App.vue`:

1. В секции `<h2>SelectDateInterval</h2>` после строки `<p>С {{ dateFrom || '(пусто)' }} по {{ dateTo || '(пусто)' }}</p>` вставить:

```html

            <h3>У правого края: календарь прижимается правым краем к полю</h3>
            <div class="demo-end">
                <select-date-interval
                    header="Интервал у края"
                    v-model:date-from="edgeDateFrom"
                    v-model:date-to="edgeDateTo"
                />
            </div>
```

2. В секции `<h2>SelectSingle</h2>` после строки `<p>Выбрано: {{ vendor === null ? '(ничего)' : vendor }}, запросов: {{ vendorCommits }}</p>` вставить:

```html

            <h3>Длинный список: прокрутка внутри, у нижнего края окна — вверх</h3>
            <select-single header="Сертификат" :items="longItems" v-model="longItem"/>
```

3. В `data()` после `dateTo: '',` вставить:

```js
            edgeDateFrom: '',
            edgeDateTo: '',
```

и после `vendorCommits: 0,` вставить:

```js
            longItem: null,
```

4. В `computed` перед `menuActions()` вставить:

```js
        // Тридцать пунктов: список выше окна, высота ограничена местом до
        // края, и он прокручивается внутри.
        longItems() {
            return Array.from({ length: 30 }, (_, index) => ({ id: `c${index + 1}`, name: `Сертификат ${index + 1}` }));
        },

```

В `playground/shell.css`:

1. В список `box-sizing` в начале файла после `.demo-header` добавить `.demo-end` (запятую — после `.demo-header`).
2. В конец файла добавить:

```css

/* Полоса с фильтром у правого края: календарь у края окна прижимается
   правым краем к полю. */
.demo-end {
    display: flex;
    justify-content: flex-end;
}
```

- [ ] **Step 2: Сборка playground, коммит**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npm run build > $W/t8-build.log 2>&1; echo "build exit $?"
npx vite build --config vite.playground.config.js --outDir "$PWD/$W/playground-check" --emptyOutDir --base ./ > $W/t8-pg.log 2>&1; echo "playground exit $?"
grep -E "built|error|warn" $W/t8-pg.log
rm -rf "$W/playground-check"
git add playground/App.vue playground/shell.css
git commit -m "docs: показать длинный список и календарь у края окна в playground"
```

Expected: `build exit 0`, `playground exit 0`, `✓ built`, без `error` и `warn`.

---

### Task 9: README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: поведение Tasks 5–6.
- Produces: документация `0.15.0`.

- [ ] **Step 1: «Требования»**

Заменить

```
Меню `DropdownButtonWithAction` и `HamburgerMenu` стоят на Popover API
браузера: Safari 17+, Chrome 114+, Firefox 125+. В браузерах старше меню
видно в потоке всегда.
```

на

```
Меню `DropdownButtonWithAction` и `HamburgerMenu`, список `SelectSingle` и
календари `SelectDateInterval` стоят на Popover API браузера: Safari 17+,
Chrome 114+, Firefox 125+. В браузерах старше меню, список и календари
видны в потоке всегда.
```

- [ ] **Step 2: `SelectDateInterval`**

После абзаца

```
События: `update:dateFrom`, `update:dateTo` — на каждый выбор даты
в соответствующем поле и на его очистку ластиком (пустой строкой);
`changed` — когда новое значение отличается от переданного пропса
(отдельно для каждой из двух дат).
```

вставить (с пустой строкой перед):

```
Клик по любому месту поля открывает его календарь. Календарь открывается
в верхнем слое браузера (Popover API): его не обрезает обёртка
с прокруткой. Левый край — по левому краю поля, а у правого края окна —
правый край по правому краю поля; вниз или вверх — где больше места.
Выбор даты, клик вне календаря, Escape, прокрутка страницы и изменение
размера окна закрывают календарь. Клик вне доходит до элемента под
курсором, поэтому календарь «до» открывается тем же кликом, что закрывает
«от».
```

- [ ] **Step 3: `SelectSingle`**

После абзаца

```
Подсветка пункта — это фокус, и мышь ведёт тот же фокус: движение по пункту
ставит фокус на него, стрелки продолжают от пункта под курсором. Подсвечен
всегда один пункт — тот, на который последними указали клавиатура или мышь.
```

(раздел `SelectSingle`, перед `### SmallBadge`) вставить (с пустой строкой перед):

```
Список открывается в верхнем слое браузера (Popover API): его не обрезает
обёртка с прокруткой. Левый край — по левому краю поля, а у правого края
окна — правый край по правому краю поля; вниз или вверх — где больше
места. Длинный список ограничен высотой до края окна и прокручивается
внутри. Клик вне списка закрывает его и доходит до элемента под курсором:
соседний фильтр открывается тем же кликом. Прокрутка страницы и изменение
размера окна закрывают список, прокрутка внутри списка — нет. Открытие
другого списка, календаря или меню закрывает предыдущее.
```

- [ ] **Step 4: «Обновление с 0.14»**

Перед строкой `` - `0.15.0` не подтянется по `^0.14.0`: для версий `0.x` знак `^` пропускает `` вставить:

```
- Список `SelectSingle` и календари `SelectDateInterval` открываются
  в верхнем слое браузера, как меню. Клик вне закрывает их и доходит до
  элемента под курсором, прокрутка страницы закрывает, длинный список
  прокручивается внутри. Без Popover API (Safari до 17, Chrome до 114,
  Firefox до 125) они видны всегда.
```

- [ ] **Step 5: Проверка и коммит**

```bash
python3 -c "
s=open('README.md',encoding='utf-8').read()
for k in ['календари \`SelectDateInterval\` стоят на Popover API','Клик по любому месту поля открывает его календарь','Список открывается в верхнем слое браузера','открываются\n  в верхнем слое браузера, как меню']:
    print(s.count(k), k[:50])"
grep -nE "Overlay|Popup" README.md
git add README.md
git commit -m "docs: описать списки и календари на Popover API в README"
```

Expected: каждая строка — `1`; `Popup` — только в разделе «Обновление с 0.14», `Overlay` — нет.

---

### Task 10: Приёмка в браузерах

**Files:**
- Временно: `/Users/boobooking/Code/mars/certificates/src/public/build/ui-playground/` (удаляется в конце задачи)

**Interfaces:**
- Consumes: Tasks 1–9; снимки Task 1.
- Produces: подтверждение вида и поведения; коммитов нет.

- [ ] **Step 1: Сборка и выкладка**

```bash
npm run build && npx vite build --config vite.playground.config.js --outDir /Users/boobooking/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./; echo "build exit $?"
```

Expected: `build exit 0`.

- [ ] **Step 2: Chrome, Playground (`index.html`) и окружение приложения (`host.html`)**

Список `SelectSingle`:

- открыт кликом по полю: вид, ширина, зазор и левый край совпадают со снимками и размерами Task 1;
- длинный список (30 пунктов) у нижнего края окна открывается вверх, высота ограничена, прокрутка внутри списка его не закрывает;
- ↓/↑, наведение, Enter на пункте — выбор, список закрыт, фокус на кнопке поля;
- Escape закрывает, фокус на кнопке поля;
- клик вне закрывает; клик по соседнему полю при открытом списке открывает его одним кликом;
- прокрутка страницы и изменение размера окна закрывают список.

Календарь `SelectDateInterval`:

- клик настоящей мышью по самому полю — по тексту даты, по подсказке и по пустому месту поля — открывает календарь (кликом по координатам поля, а не через заглушку);
- при открытом «от» клик по полю «до» открывает «до» и закрывает «от»;
- вид и место совпадают со снимками Task 1; у правого края полосы календарь прижат правым краем к полю и не уходит за окно;
- смена месяца не закрывает; выбор даты закрывает и ставит дату; Escape и клик вне закрывают.

Меню `DropdownButtonWithAction` и `HamburgerMenu`: открытие, стрелки, Escape — как раньше.

Консоль без ошибок и предупреждений в обоих окружениях.

- [ ] **Step 3: Safari — владелец**

Попросить владельца проверить те же пункты в его Safari на `https://certificates.test/build/ui-playground/index.html`, отдельно — Escape в списке и календаре и клик по самому полю даты. Дождаться ответа. Найденную ошибку — по superpowers:systematic-debugging с тестом, который сначала падает.

- [ ] **Step 4: Убрать сборку**

```bash
rm -rf /Users/boobooking/Code/mars/certificates/src/public/build/ui-playground && /bin/ls /Users/boobooking/Code/mars/certificates/src/public/build
```

Expected: `assets`, `manifest.json`.

---

### Task 11: Итоговое ревью ветки

Независимое ревью всей ветки до коммита с версией (спека §12).

**Files:**
- Изменяются только файлы, которых касаются исправления.

**Interfaces:**
- Consumes: все коммиты Tasks 2–9 и результат Task 10.
- Produces: ветка без замечаний Critical и Important; список отложенных Minor для владельца.

- [ ] **Step 1: Пакет ревью**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
BASE=$(git merge-base main HEAD)
git log --oneline $BASE..HEAD
```

Пакет — скриптом superpowers `subagent-driven-development/scripts/review-package docs/superpowers/plans/2026-10-08-popover-dropdowns.md $BASE HEAD`, если он доступен, иначе `git diff $BASE..HEAD > $W/review.diff`. Ревью охватывает и ветку `HamburgerMenu` (уже проверенную) — ревьюеру указать, что новое здесь — коммиты этого плана, начиная с Task 2.

- [ ] **Step 2: Ревьюер**

Свежий ревьюер на самой сильной доступной модели (модель указывается явно) по `superpowers:requesting-code-review` (`code-reviewer.md`): пакет ревью, спека, этот план, раздел Review Focus дословно, решения из журнала исполнения (строки `Ruling:`).

- [ ] **Step 3: Разбор и исправления**

Каждое замечание переоценивается по тому, что получит человек, если ветка выйдет как есть. Critical и Important — исправления, каждое отдельно: тест, который сначала падает; исправление; весь набор:

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npm test > $W/t11-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t11-suite.log
grep -ciE "warn|error|stderr" $W/t11-suite.log
```

Expected: `tests exit 0`, всё passed, `0`. Коммит на каждое исправление. Minor — в список отложенных для владельца. Исправление, видимое в браузере, — повторить затронутые пункты Task 10 в Chrome и у владельца в Safari.

---

### Task 12: Версия `0.15.0`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Поднять версию**

Run: `npm version 0.15.0 --no-git-tag-version && git diff | grep -E "^[-+].*version"`
Expected: три строки `0.14.0` → `0.15.0`.

- [ ] **Step 2: Финальная проверка**

```bash
W=.superpowers/sdd/2026-10-08-popover-dropdowns
npm test > $W/t12-test.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |×" $W/t12-test.log
grep -ciE "warn|error|stderr" $W/t12-test.log
npm run build > $W/t12-build.log 2>&1; echo "build exit $?"
grep -E "built|error" $W/t12-build.log
```

Expected: `tests exit 0`, всё passed, `0`, `build exit 0`, `✓ built`.

- [ ] **Step 3: Коммит**

```bash
git add package.json package-lock.json
git commit -m "chore: поднять версию пакета до 0.15.0"
```

Эта задача закрывает и отложенную Task 8 плана `docs/superpowers/plans/2026-10-08-hamburger-menu.md`: в его журнале отметить, что версия поднята здесь.

---

## Отличия от спеки

- Возврат фокуса на кнопку списка переезжает из наблюдателя `DropdownButton` в `PopoverPanel` (проп `returnFocus`, Task 5). Спека §6.2 оставляет его в `DropdownButton`, но наблюдатель срабатывает по `toggle`, а Safari к этому моменту уже увёл фокус на body: проверка «фокус внутри» не сработала бы, и после Escape фокус не вернулся бы. `PopoverPanel` запоминает, был ли фокус внутри, ещё в `beforetoggle`. Меню и календарь `returnFocus` не включают — их поведение не меняется.
- `tests/PopoverPanel.test.js` — новый файл сверх списка спеки §9 и §14: проверки, которые относятся к самому `PopoverPanel` (проброс классов на обёртку, в том числе сквозь `PopoverMenu`; роль; `closeOnClick`; валидатор `align`; `hasContent`).
- Task 1 (снимки до правок) и снимки как эталон — из спеки §11, вынесены в отдельную первую задачу, чтобы эталон снимался до любого кода.
- В `tests/SelectSingle.test.js` сейчас семь тестов, а не восемь, как пишет спека §9; переводятся на заглушку все семь.
- Ожидаемые числа тестов в задачах посчитаны заранее; если исполнитель получит другое — сверить, откуда разница, и записать решение в журнал.
