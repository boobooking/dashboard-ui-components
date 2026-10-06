# DataTable в пакете dashboard-ui-components — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Пакет `@boobooking/dashboard-ui-components` получает компонент
`DataTable` — бейдж «Найдено», таблица в обёртке с горизонтальной
прокруткой, пустое состояние и пагинация — и выходит версией `0.12.0`;
меню `DropdownButtonWithAction` переезжает на Popover API, `Pagination`
становится внутренним.

**Architecture:** Новый `src/components/DataTable.vue` рисует список
по `rows`, массиву `columns` и `meta`/`links` пагинации Laravel; особые
ячейки — слоты `#cell-<key>`. Внутренний `src/popover.js` ставит всплывающий
элемент у кнопки и закрывает его при прокрутке и изменении размера окна;
на нём `DropdownButtonWithAction` держит панель меню в верхнем слое
(`popover="auto"`). `Pagination` уходит из `src/index.js` и рисуется
только внутри `DataTable`. Тесты Vitest в happy-dom с заменой Popover API
(`tests/popoverStub.js`), playground, README, выпуск.

**Tech Stack:** Vue 3.5 (Options API, `useId`), Tailwind 4 с префиксом
`bb:`, Vite library mode, Vitest 5 + @vue/test-utils 2 + happy-dom 20.

**Spec:** `docs/superpowers/specs/2026-10-06-data-table-design.md`
(в Task 1 переезжает в репозиторий пакета с тем же именем).

## Global Constraints

- Репозиторий — `/Users/boobooking/Code/dashboard-ui-components`, ветка
  `main`. Предусловие Task 1: работа над `PickDayNative` и SSR
  (`feature/ssr-pick-day-native`) вошла в `main`, версия `0.11.0`
  выпущена тегом `v0.11.0`, рабочее дерево чистое (кроме неотслеживаемого
  `.idea/`). Иначе — стоп и вопрос владельцу.
- Коммиты — conventional, на русском, в повелительном наклонении,
  на `main`; `--no-verify` не используется. Пуш и тег — только в Task 8
  и только после явного «да» владельца.
- Каждая утилита в разметке компонентов — с префиксом `bb:`, классы
  в `:class` — литералами (ключи объекта, ветки тернарного оператора,
  элементы массива). Проверяет `tests/utilityPrefix.test.js`.
- Новых текстов интерфейса нет: `DataTable` берёт тексты пагинации
  из `Pagination`, меню — прежнюю подпись `openMenu`.
- Числа и значения — дословно по спеке: зазор 4 px, отступ от края окна
  8 px, ширина меню 224 px (`bb:w-56`); варианты `"page"` и `"card"`;
  выравнивания `"left"`, `"center"`, `"right"`; цвета строки `"red"`,
  `"green"`; версия `0.12.0`.
- Корень `DataTable` — без класса `bb-dashboard-ui` (как `PageCard`).
- `window` и `document` трогаются только в обработчиках событий,
  `mounted()` и `beforeUnmount()`; в `setup()`, `data()`
  и вычисляемых свойствах — нет.
- Тесты в happy-dom начинаются с `// @vitest-environment happy-dom`.
  Вывод тестов чистый: тест, нарочно передающий недопустимое значение
  пропа, глушит предупреждение Vue через `global.config.warnHandler`.
- Комментарии на русском, evergreen, без ссылок на историю правок;
  существующие комментарии не удаляются, кроме ставших ложными.
- `npm test` — `vitest run --passWithNoTests`; `npm run build` — сборка
  `dist`. Обе команды — из корня пакета.

## Review Focus

1. **Ответное событие меню при отложенном и объединённом `toggle`.**
   Родитель ставит `modelValue` `true` и сразу `false` — браузер присылает
   одно позднее событие `toggle` с `newState: 'closed'`. Компонент
   не эмитит `update:modelValue`: сравнение идёт с хранимым значением,
   а не с временным флагом. Тест — Task 2.
2. **Пункт «Удалить» в меню открывает модалку.** Клик по пункту
   закрывает панель (`@click` на панели), иначе панель в верхнем слое
   легла бы поверх модалки. Тест — Task 2, ручная проверка — Task 7.
3. **Переход Inertia при открытом меню.** Компонент размонтируется,
   слушатели прокрутки и размера окна снимаются в `beforeUnmount()`,
   позднее событие `toggle` после размонтирования ничего не вешает.
   Код — Task 2.
4. **Страница за последней.** `meta.total > 0`, а `rows` пуст: бейдж
   «Найдено», таблицы нет, пагинация есть. Тест — Task 3.
5. **Строки-модели с геттерами.** `row[key]` у модели с `getName()`
   пуст: страница задаёт `value: (row) => row.getName()`. README
   говорит об этом прямо (Task 6).

---

### Task 1: Спека и план в репозитории пакета, `src/popover.js`

**Files:**
- Create: `docs/superpowers/specs/2026-10-06-data-table-design.md`
  (копия из certificates)
- Create: `docs/superpowers/plans/2026-10-06-data-table.md`
  (копия из certificates)
- Create: `src/popover.js`
- Create: `tests/popover.test.js`

**Interfaces:**
- Consumes: ничего.
- Produces: `src/popover.js` с функциями
  `canControlPopover(element): boolean`,
  `isPopoverOpen(element): boolean`,
  `placePopover(anchor, popover, { maxWidth } = {}): void`,
  `closeOnScrollAndResize(popover, close): () => void` (возвращает функцию,
  снимающую слушатели). Task 2 импортирует их в
  `DropdownButtonWithAction.vue`.

- [ ] **Step 1: Предусловие**

Run:

```bash
cd /Users/boobooking/Code/dashboard-ui-components && git branch --show-current && git status --short && git tag --list 'v0.11.0' && grep '"version"' package.json
```

Expected: `main`; в статусе только `?? .idea/` или пусто; строка `v0.11.0`;
`"version": "0.11.0",`. Иначе — стоп, вопрос владельцу.

- [ ] **Step 2: Перенести спеку и план**

```bash
cp /Users/boobooking/Code/mars/certificates/src/docs/superpowers/specs/2026-10-06-data-table-design.md docs/superpowers/specs/
cp /Users/boobooking/Code/mars/certificates/src/docs/superpowers/plans/2026-10-06-data-table.md docs/superpowers/plans/
```

В скопированной спеке удалить блок-примечание в начале (абзац `> Спека
пакета …` из пяти строк и пустую строку после него): спека теперь
в своём репозитории.

```bash
git add docs/superpowers/specs/2026-10-06-data-table-design.md docs/superpowers/plans/2026-10-06-data-table.md
git commit -m "docs: перенести спеку и план DataTable в репозиторий пакета"
```

В certificates:

```bash
cd /Users/boobooking/Code/mars/certificates/src
git rm -q docs/superpowers/specs/2026-10-06-data-table-design.md docs/superpowers/plans/2026-10-06-data-table.md
git commit -m "docs: убрать спеку и план DataTable, переехавшие в репозиторий пакета"
cd /Users/boobooking/Code/dashboard-ui-components
```

Дальше все пути — от корня пакета.

- [ ] **Step 3: Падающие тесты `src/popover.js`**

Create `tests/popover.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { canControlPopover, closeOnScrollAndResize, isPopoverOpen, placePopover } from '../src/popover.js'

// У happy-dom clientWidth и clientHeight корня — нули: окно задаётся явно.
function viewport(width, height) {
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: width })
    Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: height })
}

function anchorAt(rect) {
    return { getBoundingClientRect: () => ({ ...rect }) }
}

afterEach(() => {
    delete document.documentElement.clientWidth
    delete document.documentElement.clientHeight
    document.body.innerHTML = ''
})

describe('placePopover', () => {
    it('открывает вниз, когда снизу места не меньше, правый край — по кнопке', () => {
        viewport(1000, 800)
        const popover = document.createElement('div')

        placePopover(anchorAt({ top: 100, bottom: 120, left: 900, right: 920 }), popover)

        expect(popover.style.top).toBe('124px')
        expect(popover.style.bottom).toBe('auto')
        expect(popover.style.right).toBe('80px')
        expect(popover.style.left).toBe('auto')
        expect(popover.style.maxHeight).toBe('668px')
        expect(popover.style.maxWidth).toBe('')
    })

    it('открывает вверх, когда сверху места больше', () => {
        viewport(1000, 800)
        const popover = document.createElement('div')

        placePopover(anchorAt({ top: 700, bottom: 720, left: 900, right: 920 }), popover)

        expect(popover.style.top).toBe('auto')
        expect(popover.style.bottom).toBe('104px')
        expect(popover.style.maxHeight).toBe('688px')
    })

    it('не прижимает правый край ближе 8 px к краю окна', () => {
        viewport(1000, 800)
        const popover = document.createElement('div')

        placePopover(anchorAt({ top: 100, bottom: 120, left: 1080, right: 1100 }), popover)

        expect(popover.style.right).toBe('8px')
    })

    it('сужает до места слева, если maxWidth шире', () => {
        viewport(1000, 800)
        const popover = document.createElement('div')

        placePopover(anchorAt({ top: 100, bottom: 120, left: 120, right: 140 }), popover, { maxWidth: 224 })
        expect(popover.style.maxWidth).toBe('132px')

        placePopover(anchorAt({ top: 100, bottom: 120, left: 900, right: 920 }), popover, { maxWidth: 224 })
        expect(popover.style.maxWidth).toBe('224px')
    })

    it('в крошечном окне ширина и высота не уходят ниже нуля', () => {
        viewport(10, 10)
        const popover = document.createElement('div')

        placePopover(anchorAt({ top: 5, bottom: 9, left: 1, right: 9 }), popover, { maxWidth: 224 })

        expect(popover.style.maxHeight).toBe('0px')
        expect(popover.style.maxWidth).toBe('0px')
    })
})

describe('canControlPopover и isPopoverOpen', () => {
    it('без Popover API — нельзя управлять и закрыто', () => {
        const element = document.createElement('div')

        expect(canControlPopover(element)).toBe(false)
        expect(canControlPopover(null)).toBe(false)
        expect(isPopoverOpen(element)).toBe(false)
    })

    it('с API — открыто по :popover-open', () => {
        const element = { showPopover() {}, matches: (selector) => selector === ':popover-open' }

        expect(canControlPopover(element)).toBe(true)
        expect(isPopoverOpen(element)).toBe(true)
    })
})

describe('closeOnScrollAndResize', () => {
    it('закрывает при прокрутке вне элемента и при изменении размера окна', () => {
        const popover = document.createElement('div')
        const inside = document.createElement('p')
        popover.appendChild(inside)
        document.body.appendChild(popover)
        const close = vi.fn()

        const stop = closeOnScrollAndResize(popover, close)

        document.dispatchEvent(new Event('scroll'))
        expect(close).toHaveBeenCalledTimes(1)

        popover.dispatchEvent(new Event('scroll'))
        inside.dispatchEvent(new Event('scroll'))
        expect(close).toHaveBeenCalledTimes(1)

        window.dispatchEvent(new Event('resize'))
        expect(close).toHaveBeenCalledTimes(2)

        stop()
        document.dispatchEvent(new Event('scroll'))
        window.dispatchEvent(new Event('resize'))
        expect(close).toHaveBeenCalledTimes(2)
    })
})
```

- [ ] **Step 4: Убедиться, что тесты падают**

Run: `npx vitest run tests/popover.test.js`

Expected: FAIL — `Failed to resolve import "../src/popover.js"`.

- [ ] **Step 5: `src/popover.js`**

Create `src/popover.js`:

```js
// Всплывающий элемент на Popover API: браузер выводит его в верхний слой
// поверх страницы, и его не обрезает ни одна обёртка с прокруткой.
// Внутренний модуль пакета: им ставят на место меню DropdownButtonWithAction
// и подсказки, открываемые кнопкой.

// Зазор от кнопки и отступ от края окна, px.
const GAP = 4
const VIEWPORT_MARGIN = 8

// Popover API нет в браузерах старше Safari 17, Chrome 114 и Firefox 125:
// там элемент виден в потоке всегда, и управлять им нечем.
export function canControlPopover(element) {
    return typeof element?.showPopover === 'function'
}

export function isPopoverOpen(element) {
    return canControlPopover(element) && element.matches(':popover-open')
}

// Правый край элемента — по правому краю кнопки: кнопки стоят у правого края
// строк и ячеек, и элемент растёт влево, к середине страницы. По вертикали —
// туда, где больше места; высота ограничена этим местом, а ширина — местом
// слева, если задан maxWidth. Размер самого элемента для расчёта не нужен,
// поэтому функцию зовут в beforetoggle, до его появления: он открывается
// сразу на своём месте.
export function placePopover(anchor, popover, { maxWidth = null } = {}) {
    const rect = anchor.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth
    const viewportHeight = document.documentElement.clientHeight

    const right = Math.max(VIEWPORT_MARGIN, viewportWidth - rect.right)
    const spaceLeft = Math.max(0, viewportWidth - right - VIEWPORT_MARGIN)
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom - GAP - VIEWPORT_MARGIN)
    const spaceAbove = Math.max(0, rect.top - GAP - VIEWPORT_MARGIN)
    const opensBelow = spaceBelow >= spaceAbove

    Object.assign(popover.style, {
        top: opensBelow ? `${rect.bottom + GAP}px` : 'auto',
        bottom: opensBelow ? 'auto' : `${viewportHeight - rect.top + GAP}px`,
        right: `${right}px`,
        left: 'auto',
        maxHeight: `${opensBelow ? spaceBelow : spaceAbove}px`,
    })

    if (maxWidth !== null) {
        popover.style.maxWidth = `${Math.min(maxWidth, spaceLeft)}px`
    }
}

// Прокрутка любого блока страницы и изменение размера окна закрывают элемент:
// догонять кнопку — лишний код. capture — потому что scroll не всплывает,
// а прокручиваться может обёртка таблицы. Прокрутка самого элемента — чтение
// длинного содержимого, она не закрывает. Возвращает функцию, снимающую
// оба слушателя.
export function closeOnScrollAndResize(popover, close) {
    const onScroll = (event) => {
        if (popover.contains(event.target)) {
            return
        }

        close()
    }

    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', close)

    return () => {
        window.removeEventListener('scroll', onScroll, { capture: true })
        window.removeEventListener('resize', close)
    }
}
```

- [ ] **Step 6: Тесты проходят**

Run: `npx vitest run tests/popover.test.js`

Expected: PASS, 8 тестов, без предупреждений.

- [ ] **Step 7: Commit**

```bash
git add src/popover.js tests/popover.test.js
git commit -m "feat: добавить модуль положения всплывающих элементов"
```

---

### Task 2: `DropdownButtonWithAction` на Popover API

**Files:**
- Create: `tests/popoverStub.js`
- Modify: `src/components/DropdownButtonWithAction.vue`
- Modify: `tests/DropdownButtonWithAction.test.js` (переписывается целиком)

**Interfaces:**
- Consumes: `src/popover.js` из Task 1.
- Produces: `tests/popoverStub.js` с `installPopoverStub(): () => void`
  (возвращает функцию снятия замены) и `flushToggles(): Promise<void>`.
  Task 3 замену не использует; Task 7 проверяет меню вручную.
  Публичный контракт `DropdownButtonWithAction` (пропы, слоты,
  `update:modelValue`) не меняется.

- [ ] **Step 1: Замена Popover API для тестов**

Create `tests/popoverStub.js`:

```js
// Минимальная замена Popover API для happy-dom 20: в нём нет showPopover,
// hidePopover, событий beforetoggle и toggle и селектора :popover-open, а
// popoverTargetElement кнопки не связывается с атрибутом popovertarget.
// Поведение повторяет браузер в том, на что опираются компоненты пакета:
//
// - beforetoggle приходит синхронно, до смены состояния;
// - toggle приходит отложенной задачей, а переключения подряд до неё
//   объединяются в одно событие: oldState — первого, newState — последнего;
// - открытие popover="auto" закрывает другие открытые auto;
// - клик по кнопке с popovertarget переключает свой элемент;
// - клик вне открытых auto и Escape закрывают их.
//
// Синхронный toggle здесь недопустим: он пропустил бы компонент, который
// гасит ответное событие временным флагом вокруг showPopover().

const OPEN = Symbol('popoverOpen')
const PENDING = Symbol('pendingToggle')

function stateEvent(type, oldState, newState) {
    return Object.assign(new Event(type, { cancelable: type === 'beforetoggle' }), { oldState, newState })
}

function queueToggle(element, oldState, newState) {
    if (element[PENDING]) {
        element[PENDING].newState = newState
        return
    }

    element[PENDING] = { oldState, newState }
    setTimeout(() => {
        const pending = element[PENDING]
        delete element[PENDING]
        element.dispatchEvent(stateEvent('toggle', pending.oldState, pending.newState))
    }, 0)
}

function isAuto(element) {
    return element.getAttribute('popover') === 'auto' || element.getAttribute('popover') === ''
}

export function installPopoverStub() {
    const prototype = window.HTMLElement.prototype
    const originalMatches = window.Element.prototype.matches
    // Открытые auto в порядке открытия: Escape закрывает последний.
    const openAuto = []

    function hide(element) {
        if (element[OPEN] !== true) {
            return
        }

        element.dispatchEvent(stateEvent('beforetoggle', 'open', 'closed'))
        element[OPEN] = false
        const position = openAuto.indexOf(element)
        if (position !== -1) {
            openAuto.splice(position, 1)
        }
        queueToggle(element, 'open', 'closed')
    }

    function show(element) {
        if (element[OPEN] === true) {
            throw new DOMException('Элемент уже открыт', 'InvalidStateError')
        }
        if (!element.isConnected) {
            throw new DOMException('Элемент не в документе', 'InvalidStateError')
        }

        if (isAuto(element)) {
            for (const other of [...openAuto]) {
                hide(other)
            }
        }

        element.dispatchEvent(stateEvent('beforetoggle', 'closed', 'open'))
        element[OPEN] = true
        if (isAuto(element)) {
            openAuto.push(element)
        }
        queueToggle(element, 'closed', 'open')
    }

    prototype.showPopover = function () {
        show(this)
    }
    prototype.hidePopover = function () {
        hide(this)
    }
    window.Element.prototype.matches = function (selector) {
        if (selector === ':popover-open') {
            return this[OPEN] === true
        }

        return originalMatches.call(this, selector)
    }

    function onClick(event) {
        const invoker = event.target.closest?.('[popovertarget]')
        const target = invoker ? document.getElementById(invoker.getAttribute('popovertarget')) : null

        if (target) {
            if (target[OPEN] === true) {
                hide(target)
            } else {
                show(target)
            }
            return
        }

        for (const element of [...openAuto]) {
            if (!element.contains(event.target)) {
                hide(element)
            }
        }
    }

    function onKeydown(event) {
        if (event.key === 'Escape' && openAuto.length > 0) {
            hide(openAuto[openAuto.length - 1])
        }
    }

    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeydown)

    return () => {
        delete prototype.showPopover
        delete prototype.hidePopover
        window.Element.prototype.matches = originalMatches
        document.removeEventListener('click', onClick)
        document.removeEventListener('keydown', onKeydown)
    }
}

// Ждёт отложенные события toggle: таймер, поставленный раньше, срабатывает
// раньше этого.
export function flushToggles() {
    return new Promise((resolve) => setTimeout(resolve, 0))
}
```

- [ ] **Step 2: Падающие тесты меню**

Replace the whole content of `tests/DropdownButtonWithAction.test.js` with:

```js
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import DropdownButtonWithAction from '../src/components/DropdownButtonWithAction.vue'
import { flushToggles, installPopoverStub } from './popoverStub.js'

enableAutoUnmount(afterEach)

// Панель меню — popover="auto" Popover API. Его заменяет tests/popoverStub.js:
// toggle в нём приходит отложенно и объединённо, как в браузере. attachTo
// нужен показу: showPopover требует элемент в документе.
let uninstallPopover

beforeEach(() => {
    uninstallPopover = installPopoverStub()
})

afterEach(() => {
    uninstallPopover()
})

const slots = {
    button: () => h('span', 'Редактировать'),
    actions: () => h('a', { href: '#', class: 'item' }, 'Удалить'),
}

function arrowOf(wrapper) {
    return wrapper.findAll('button').find((button) => button.text().includes('Открыть меню'))
}

function menuOf(wrapper) {
    return wrapper.get('[role="menu"]')
}

function isOpen(wrapper) {
    return menuOf(wrapper).element.matches(':popover-open')
}

async function settle() {
    await flushToggles()
    await flushPromises()
}

// Две строки с меню, которыми управляет родитель, как на Users/Index:
// открыто только меню активной строки, закрытие меню сбрасывает выбор.
const Rows = {
    data() {
        return { active: null, closes: 0 }
    },
    methods: {
        opened(row) {
            this.active = row
        },
        closed() {
            this.active = null
            this.closes++
        },
    },
    render() {
        return h('div', ['a', 'b'].map((row) => h(
            DropdownButtonWithAction,
            {
                key: row,
                'data-row': row,
                modelValue: this.active === row,
                'onUpdate:modelValue': (opened) => (opened ? this.opened(row) : this.closed()),
            },
            slots,
        )))
    },
}

function row(wrapper, name) {
    return wrapper.get(`[data-row="${name}"]`)
}

describe('DropdownButtonWithAction без привязки', () => {
    it('стрелка с popovertarget открывает и закрывает меню', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots })

        expect(arrowOf(wrapper).attributes('popovertarget')).toBe(menuOf(wrapper).attributes('id'))
        expect(menuOf(wrapper).attributes('popover')).toBe('auto')

        await arrowOf(wrapper).trigger('click')
        await settle()
        expect(isOpen(wrapper)).toBe(true)

        await arrowOf(wrapper).trigger('click')
        await settle()
        expect(isOpen(wrapper)).toBe(false)
    })

    it('на клик по стрелке эмитит update:modelValue один раз', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots })

        await arrowOf(wrapper).trigger('click')
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    })

    it('на закрытие по Escape эмитит false', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots })

        await arrowOf(wrapper).trigger('click')
        await settle()
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
        expect(isOpen(wrapper)).toBe(false)
    })

    it('на клик вне меню эмитит false', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots })

        await arrowOf(wrapper).trigger('click')
        await settle()
        document.body.click()
        await settle()

        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('клик по пункту меню закрывает меню и эмитит false', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots })

        await arrowOf(wrapper).trigger('click')
        await settle()
        await menuOf(wrapper).get('.item').trigger('click')
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
    })

    it('прокрутка вне меню и изменение размера окна закрывают меню, прокрутка меню — нет', async () => {
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots })

        await arrowOf(wrapper).trigger('click')
        await settle()
        menuOf(wrapper).element.dispatchEvent(new Event('scroll'))
        await settle()
        expect(isOpen(wrapper)).toBe(true)

        document.dispatchEvent(new Event('scroll'))
        await settle()
        expect(isOpen(wrapper)).toBe(false)

        await arrowOf(wrapper).trigger('click')
        await settle()
        window.dispatchEvent(new Event('resize'))
        await settle()
        expect(isOpen(wrapper)).toBe(false)
    })

    it('у стрелки возле левого края окна меню сужается до места слева', async () => {
        Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1000 })
        Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 800 })
        const wrapper = mount(DropdownButtonWithAction, { attachTo: document.body, slots })
        arrowOf(wrapper).element.getBoundingClientRect = () => ({ top: 100, bottom: 120, left: 120, right: 140 })

        try {
            await arrowOf(wrapper).trigger('click')
            await settle()

            expect(menuOf(wrapper).element.style.maxWidth).toBe('132px')
            expect(menuOf(wrapper).element.style.right).toBe('860px')
        } finally {
            delete document.documentElement.clientWidth
            delete document.documentElement.clientHeight
        }
    })

    it('без действий стрелки и панели нет', () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            slots: { button: slots.button },
        })

        expect(arrowOf(wrapper)).toBeUndefined()
        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    })
})

describe('DropdownButtonWithAction с привязкой', () => {
    it('принимает входящее значение без ответного события', async () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { modelValue: false },
            slots,
        })

        await wrapper.setProps({ modelValue: true })
        await settle()
        expect(isOpen(wrapper)).toBe(true)

        await wrapper.setProps({ modelValue: false })
        await settle()
        expect(isOpen(wrapper)).toBe(false)

        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('не эмитит и тогда, когда toggle приходит позже и объединённым', async () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { modelValue: false },
            slots,
        })

        // Оба значения — до отложенного toggle: браузер пришлёт одно
        // событие с newState: 'closed'.
        await wrapper.setProps({ modelValue: true })
        await wrapper.setProps({ modelValue: false })
        await settle()

        expect(isOpen(wrapper)).toBe(false)
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('открытое при монтировании меню открыто без ответного события', async () => {
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { modelValue: true },
            slots,
        })
        await settle()

        expect(isOpen(wrapper)).toBe(true)
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    const switches = [
        { name: 'переключение A → B оставляет выбранной B', from: 'a', to: 'b' },
        { name: 'переключение B → A оставляет выбранной A', from: 'b', to: 'a' },
    ]

    for (const testCase of switches) {
        it(testCase.name, async () => {
            const wrapper = mount(Rows, { attachTo: document.body })

            await arrowOf(row(wrapper, testCase.from)).trigger('click')
            await settle()
            await arrowOf(row(wrapper, testCase.to)).trigger('click')
            await settle()

            expect(wrapper.vm.active).toBe(testCase.to)
            expect(isOpen(row(wrapper, testCase.from))).toBe(false)
            expect(isOpen(row(wrapper, testCase.to))).toBe(true)
        })
    }

    it('закрытие родителем не вызывает обработчик закрытия', async () => {
        const wrapper = mount(Rows, { attachTo: document.body })

        await arrowOf(row(wrapper, 'a')).trigger('click')
        await settle()
        wrapper.vm.active = null
        await settle()

        expect(isOpen(row(wrapper, 'a'))).toBe(false)
        expect(wrapper.vm.closes).toBe(0)
    })

    it('даёт стрелке и меню каждой кнопки свои id', () => {
        const wrapper = mount(Rows, { attachTo: document.body })

        const ids = ['a', 'b'].map((name) => {
            const arrowId = arrowOf(row(wrapper, name)).attributes('id')
            const menuId = menuOf(row(wrapper, name)).attributes('id')
            expect(arrowId).toBeTruthy()
            expect(menuId).toBeTruthy()
            expect(menuOf(row(wrapper, name)).attributes('aria-labelledby')).toBe(arrowId)
            expect(arrowOf(row(wrapper, name)).attributes('popovertarget')).toBe(menuId)
            return [arrowId, menuId]
        })

        expect(ids[0][0]).not.toBe(ids[1][0])
        expect(ids[0][1]).not.toBe(ids[1][1])
    })
})

describe('DropdownButtonWithAction без Popover API', () => {
    it('стрелка и входящее значение не бросают исключений', async () => {
        uninstallPopover()
        uninstallPopover = () => {}
        const errors = []
        const wrapper = mount(DropdownButtonWithAction, {
            attachTo: document.body,
            props: { modelValue: false },
            slots,
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })

        await arrowOf(wrapper).trigger('click')
        await wrapper.setProps({ modelValue: true })
        await flushPromises()

        expect(errors).toEqual([])
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
})
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `npx vitest run tests/DropdownButtonWithAction.test.js`

Expected: FAIL — нет атрибутов `popovertarget` и `popover`, нет `:popover-open`.

- [ ] **Step 4: Компонент**

Replace the whole content of `src/components/DropdownButtonWithAction.vue` with:

```vue
<template>
    <span class="bb-dashboard-ui bb:relative bb:inline-flex bb:shadow-xs bb:rounded-md">
        <!-- Без дополнительных действий стрелке нечего открывать: её нет,
             и кнопка скругляется с обеих сторон. -->
        <button
            type="button"
            class="bb:relative bb:inline-flex bb:items-center bb:rounded-l-md bb:border bb:border-gray-300 bb:bg-white bb:hover:bg-gray-50 bb:focus:outline-hidden"
            :class="{ 'bb:rounded-r-md': !$slots.actions }"
        >
            <slot name="button"></slot>
        </button>
        <span class="bb:-ml-px bb:relative bb:block" v-if="$slots.actions">
            <!-- Открывает и закрывает меню браузер по popovertarget: свой
                 обработчик click открывал бы меню заново сразу после того,
                 как браузер закрыл его по клику вне. -->
            <button
                ref="arrow"
                :id="menuButtonId"
                type="button"
                :popovertarget="menuId"
                class="bb:relative bb:inline-flex bb:items-center bb:px-2 bb:py-2 bb:rounded-r-md bb:border bb:border-gray-300 bb:bg-white bb:text-sm bb:font-medium bb:text-gray-500 bb:hover:bg-gray-50 bb:focus:z-10 bb:focus:outline-hidden bb:focus:ring-1 bb:focus:ring-indigo-500 bb:focus:border-indigo-500"
            >
                <span class="bb:sr-only">{{ texts.openMenu }}</span>
                <svg
                    class="bb:h-5 bb:w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path
                        fill-rule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                    />
                </svg>
            </button>
            <!-- Меню в верхнем слое браузера: таблицу с горизонтальной
                 прокруткой оно не расширяет, и она его не обрезает.
                 m-0 inset-auto снимают умолчания браузера для [popover],
                 иначе меню встало бы в центр окна; координаты ставит
                 placePopover. Клик внутри меню закрывает его: открытое
                 меню легло бы поверх модалки, которую открывает пункт. -->
            <div
                ref="menu"
                :id="menuId"
                popover="auto"
                class="bb:m-0 bb:inset-auto bb:w-56 bb:rounded-md bb:shadow-lg bb:bg-white bb:ring-1 bb:ring-black/5"
                role="menu"
                aria-orientation="vertical"
                :aria-labelledby="menuButtonId"
                @beforetoggle="onBeforeToggle"
                @toggle="onToggle"
                @click="close"
            >
                <slot name="actions"></slot>
            </div>
        </span>
    </span>
</template>

<script>
import { useId } from "vue";
import { withLang } from "../lang.js";
import { canControlPopover, closeOnScrollAndResize, isPopoverOpen, placePopover } from "../popover.js";

// Ширина меню — bb:w-56. У стрелки ближе к левому краю окна меню сужается
// до места слева.
const MENU_WIDTH = 224;

export default {
    mixins: [withLang],

    emits: ["update:modelValue"],

    props: {
        modelValue: {
            type: Boolean,
            default: false,
        },
    },

    setup() {
        return {
            menuButtonId: useId(),
            menuId: useId(),
        };
    },

    data() {
        return {
            // Текущее значение меню. По нему гасится ответное событие:
            // toggle браузер присылает позже и объединяет переключения подряд,
            // поэтому временный флаг вокруг showPopover() его бы пропустил.
            menuIsOpen: this.modelValue,
        };
    },

    watch: {
        // Входящее значение только принимается. Ответное событие вернуло бы
        // родителю его же решение, и обработчик вида «закрыли — сбросить
        // выбор» сбросил бы строку, которую родитель только что выбрал.
        modelValue(isOpen) {
            this.menuIsOpen = isOpen;
            this.applyMenuState();
        },
    },

    created() {
        // Снимает слушатели прокрутки и размера окна, пока меню открыто.
        this.stopClosing = null;
    },

    mounted() {
        this.applyMenuState();
    },

    beforeUnmount() {
        this.stopListening();
    },

    methods: {
        // Привести меню к menuIsOpen. Без Popover API и вне документа
        // управлять нечем.
        applyMenuState() {
            const menu = this.$refs.menu;

            if (!canControlPopover(menu) || !menu.isConnected) {
                return;
            }

            if (this.menuIsOpen && !isPopoverOpen(menu)) {
                menu.showPopover();
            }

            if (!this.menuIsOpen && isPopoverOpen(menu)) {
                menu.hidePopover();
            }
        },

        close() {
            const menu = this.$refs.menu;

            if (isPopoverOpen(menu)) {
                menu.hidePopover();
            }
        },

        onBeforeToggle(event) {
            if (event.newState === "open") {
                placePopover(this.$refs.arrow, this.$refs.menu, { maxWidth: MENU_WIDTH });
            }
        },

        // Единственный путь, которым меню сообщает родителю об открытии или
        // закрытии: стрелка, клик вне, Escape, клик по пункту, прокрутка,
        // размер окна. Значение, совпавшее с текущим, — эхо входящего, его
        // не эмитят. Слушатели вешаются по фактическому состоянию меню:
        // toggle мог прийти после размонтирования или устареть.
        onToggle(event) {
            this.stopListening();

            const menu = this.$refs.menu;
            if (isPopoverOpen(menu)) {
                this.stopClosing = closeOnScrollAndResize(menu, this.close);
            }

            const isOpen = event.newState === "open";
            if (isOpen === this.menuIsOpen) {
                return;
            }

            this.menuIsOpen = isOpen;
            this.$emit("update:modelValue", isOpen);
        },

        stopListening() {
            if (this.stopClosing !== null) {
                this.stopClosing();
                this.stopClosing = null;
            }
        },
    },
};
</script>
```

- [ ] **Step 5: Тесты меню проходят**

Run: `npx vitest run tests/DropdownButtonWithAction.test.js tests/popover.test.js`

Expected: PASS, без предупреждений Vue в выводе.

- [ ] **Step 6: Весь набор и сборка**

Run: `npm test && npm run build`

Expected: все тесты проходят (включая `tests/ssr.test.js`,
`tests/hydration.test.js`, `tests/utilityPrefix.test.js`), сборка без
ошибок.

- [ ] **Step 7: Commit**

```bash
git add tests/popoverStub.js src/components/DropdownButtonWithAction.vue tests/DropdownButtonWithAction.test.js
git commit -m "feat: вывести меню DropdownButtonWithAction в верхний слой браузера"
```

---

### Task 3: Компонент `DataTable`

**Files:**
- Create: `src/components/DataTable.vue`
- Create: `tests/DataTable.test.js`

**Interfaces:**
- Consumes: `src/components/Pagination.vue` (пропы `links`, `meta`,
  `lang`), `src/components/SmallBadge.vue` (пропы `text`, `color`),
  миксин `withLang` из `src/lang.js`.
- Produces: компонент `DataTable` (default export файла) с пропами
  `rows`, `columns`, `rowKey`, `meta`, `links`, `foundText`, `emptyText`,
  `variant`, `rowColor`, `lang` и слотами `cell-<key>`, `results-actions`.
  Task 4 экспортирует его из `src/index.js`.

- [ ] **Step 1: Падающие тесты**

Create `tests/DataTable.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h } from 'vue'
import DataTable from '../src/components/DataTable.vue'

enableAutoUnmount(afterEach)

const rows = [
    { uuid: 'a', phone: '+79990000001', vendor: 'Сбер', certificate: 'Карта', amount: '500 ₽', comment: 'В очереди' },
    { uuid: 'b', phone: '+79990000002', vendor: 'Озон', certificate: 'Подарок', amount: '1 000 ₽', comment: 'Доставлено' },
]

const columns = [
    { key: 'phone', label: 'Телефон' },
    { key: 'vendor', label: 'Вендор / Сертификат', secondary: (row) => row.certificate },
    { key: 'amount', label: 'Номинал', align: 'right', muted: true },
    { key: 'comment', label: 'Состояние', wrap: true },
    { key: 'actions', align: 'right', narrow: true },
]

// quiet глушит предупреждение Vue в тестах, которые нарочно передают
// недопустимое значение пропа: вывод тестов остаётся чистым.
function mountTable(props = {}, slots = {}, { quiet = false } = {}) {
    return mount(DataTable, {
        props: { rows, columns, rowKey: 'uuid', ...props },
        slots,
        global: quiet ? { config: { warnHandler: () => {} } } : {},
    })
}

function headerTexts(wrapper) {
    return wrapper.findAll('th').map((th) => th.text())
}

function cellsOf(wrapper, rowIndex) {
    return wrapper.findAll('tbody tr')[rowIndex].findAll('td')
}

function scrollerOf(wrapper) {
    return wrapper.get('table').element.parentElement
}

describe('DataTable: столбцы', () => {
    it('рисует заголовки по label и выравнивает th и td по align', () => {
        const wrapper = mountTable()

        expect(headerTexts(wrapper)).toEqual(['Телефон', 'Вендор / Сертификат', 'Номинал', 'Состояние', ''])
        expect(wrapper.findAll('th')[0].classes()).toContain('bb:text-left')
        expect(wrapper.findAll('th')[2].classes()).toContain('bb:text-right')
        expect(wrapper.findAll('th')[0].attributes('scope')).toBe('col')
        expect(cellsOf(wrapper, 0)[2].classes()).toContain('bb:text-right')
    })

    it('узкий столбец — w-px, переносимый — без whitespace-nowrap', () => {
        const wrapper = mountTable()

        expect(wrapper.findAll('th')[4].classes()).toContain('bb:w-px')
        expect(cellsOf(wrapper, 0)[4].classes()).toContain('bb:w-px')
        expect(cellsOf(wrapper, 0)[3].classes()).not.toContain('bb:whitespace-nowrap')
        expect(cellsOf(wrapper, 0)[0].classes()).toContain('bb:whitespace-nowrap')
    })

    it('столбец с visible: false не рисуется вместе со своим слотом', () => {
        const wrapper = mountTable(
            { columns: [{ key: 'phone', label: 'Телефон' }, { key: 'cost', label: 'Стоимость', visible: false }] },
            { 'cell-cost': () => h('span', { class: 'cost' }, 'секрет') },
        )

        expect(headerTexts(wrapper)).toEqual(['Телефон'])
        expect(wrapper.find('.cost').exists()).toBe(false)
    })

    it('пропускает элементы columns без строкового key; align вне списка — left', () => {
        const wrapper = mountTable({
            columns: [null, 'phone', { label: 'Без ключа' }, { key: 'phone', label: 'Телефон', align: 'middle' }],
        })

        expect(headerTexts(wrapper)).toEqual(['Телефон'])
        expect(wrapper.findAll('th')[0].classes()).toContain('bb:text-left')
    })
})

describe('DataTable: ячейки', () => {
    it('ячейка по умолчанию: основная строка, серая вторая, muted', () => {
        const wrapper = mountTable()
        const [phone, vendor, amount] = cellsOf(wrapper, 0)

        expect(phone.get('div').text()).toBe('+79990000001')
        expect(phone.get('div').classes()).toContain('bb:text-gray-900')
        expect(vendor.findAll('div').map((div) => div.text())).toEqual(['Сбер', 'Карта'])
        expect(vendor.findAll('div')[1].classes()).toContain('bb:text-gray-400')
        expect(amount.get('div').classes()).toContain('bb:text-gray-400')
    })

    it('value-функция; null из неё — пустая ячейка', () => {
        const wrapper = mountTable({
            columns: [{ key: 'x', label: 'X', value: (row) => (row.uuid === 'a' ? null : row.uuid.toUpperCase()) }],
        })

        expect(cellsOf(wrapper, 0)[0].text()).toBe('')
        expect(cellsOf(wrapper, 1)[0].text()).toBe('B')
    })

    it('пустая вторая строка не рисуется', () => {
        const wrapper = mountTable({ columns: [{ key: 'phone', label: 'Т', secondary: () => '' }] })

        expect(cellsOf(wrapper, 0)[0].findAll('div')).toHaveLength(1)
    })

    it('слот cell-<key> получает row и index и заменяет ячейку', () => {
        const wrapper = mountTable({}, {
            'cell-actions': ({ row, index }) => h('button', `${row.uuid}-${index}`),
        })

        expect(cellsOf(wrapper, 1)[4].get('button').text()).toBe('b-1')
        expect(cellsOf(wrapper, 1)[4].find('div').exists()).toBe(false)
        expect(cellsOf(wrapper, 1)[4].classes()).toContain('bb:relative')
    })
})

describe('DataTable: строки', () => {
    it('строки полосатые; rowColor красит строку без полосатости', () => {
        const wrapper = mountTable({ rowColor: (row) => (row.uuid === 'a' ? 'red' : 'blue') })
        const [first, second] = wrapper.findAll('tbody tr')

        expect(first.classes()).toContain('bb:bg-red-50')
        expect(first.classes()).not.toContain('bb:even:bg-gray-50')
        expect(second.classes()).toContain('bb:bg-white')
        expect(second.classes()).toContain('bb:even:bg-gray-50')
    })

    it('green из rowColor — зелёная строка', () => {
        const wrapper = mountTable({ rowColor: () => 'green' })

        expect(wrapper.findAll('tbody tr')[0].classes()).toContain('bb:bg-green-50')
    })

    it('ключ строки по функции, по отсутствующему полю и по бросающей функции — без исключений', () => {
        expect(mountTable({ rowKey: (row) => row.uuid }).findAll('tbody tr')).toHaveLength(2)
        expect(mountTable({ rowKey: 'nothing' }).findAll('tbody tr')).toHaveLength(2)
        expect(mountTable({
            rowKey: () => {
                throw new Error('нет ключа')
            },
        }).findAll('tbody tr')).toHaveLength(2)
    })

    it('rows не массив — пустой список', () => {
        const wrapper = mountTable({ rows: null, emptyText: 'Не найдено записей' }, {}, { quiet: true })

        expect(wrapper.find('table').exists()).toBe(false)
        expect(wrapper.text()).toContain('Не найдено записей')
    })
})

describe('DataTable: бейдж, пустое состояние, пагинация', () => {
    const meta = { from: 1, to: 2, total: 40 }
    const links = { prev: null, next: '/list?page=2' }

    it('бейдж «Найдено» берёт число из meta.total, пагинация есть', () => {
        const wrapper = mountTable({ meta, links, foundText: 'Найдено ордеров' })

        expect(wrapper.text()).toContain('Найдено ордеров: 40')
        expect(wrapper.find('nav').exists()).toBe(true)
    })

    it('без meta число — длина rows, пагинации нет', () => {
        const wrapper = mountTable({ foundText: 'Найдено ордеров' })

        expect(wrapper.text()).toContain('Найдено ордеров: 2')
        expect(wrapper.find('nav').exists()).toBe(false)
    })

    it('пустой список — бейдж emptyText, нет таблицы и пагинации', () => {
        const wrapper = mountTable({
            rows: [],
            meta: { from: null, to: null, total: 0 },
            links: { prev: null, next: null },
            foundText: 'Найдено ордеров',
            emptyText: 'Не найдено ордеров',
        })

        expect(wrapper.text()).toContain('Не найдено ордеров')
        expect(wrapper.find('table').exists()).toBe(false)
        expect(wrapper.find('nav').exists()).toBe(false)
    })

    it('без текстов бейджа нет', () => {
        const wrapper = mountTable()

        expect(wrapper.find('.bb\\:rounded-full').exists()).toBe(false)
    })

    it('страница за последней: бейдж и пагинация без таблицы', () => {
        const wrapper = mountTable({
            rows: [],
            meta: { from: null, to: null, total: 40 },
            links: { prev: '/list?page=3', next: null },
            foundText: 'Найдено ордеров',
        })

        expect(wrapper.text()).toContain('Найдено ордеров: 40')
        expect(wrapper.find('table').exists()).toBe(false)
        expect(wrapper.find('nav').exists()).toBe(true)
    })

    it('#results-actions — только когда записи есть', () => {
        const slots = { 'results-actions': () => h('a', { class: 'export' }, 'скачать') }

        expect(mountTable({ foundText: 'Найдено' }, slots).find('.export').exists()).toBe(true)
        expect(mountTable({ rows: [], emptyText: 'Не найдено' }, slots).find('.export').exists()).toBe(false)
    })
})

describe('DataTable: варианты', () => {
    it('page — тень и скругление, card — линия сверху; обе с прокруткой', () => {
        const page = mountTable()
        expect(scrollerOf(page).className).toContain('bb:overflow-x-auto')
        expect(scrollerOf(page).className).toContain('bb:shadow-sm')
        expect(scrollerOf(page).className).toContain('bb:sm:rounded-lg')

        const card = mountTable({ variant: 'card' })
        expect(scrollerOf(card).className).toContain('bb:overflow-x-auto')
        expect(scrollerOf(card).className).toContain('bb:border-t')
        expect(scrollerOf(card).className).not.toContain('bb:shadow-sm')
    })

    it('обёртка с прокруткой лежит в простом блоке, а не прямо в корне', () => {
        const wrapper = mountTable()

        expect(scrollerOf(wrapper).parentElement).not.toBe(wrapper.element)
        expect(scrollerOf(wrapper).parentElement.parentElement).toBe(wrapper.element)
    })

    it('отступы: page — бейдж my-4 и пагинация mt-6, card — блок таблицы и пагинация mt-4', () => {
        const meta = { from: 1, to: 2, total: 2 }
        const links = { prev: null, next: null }

        const page = mountTable({ meta, links, foundText: 'Найдено' })
        expect(page.get('nav').classes()).toContain('bb:mt-6')
        expect(page.element.firstElementChild.className).toContain('bb:my-4')

        const card = mountTable({ meta, links, foundText: 'Найдено', variant: 'card' })
        expect(card.get('nav').classes()).toContain('bb:mt-4')
        expect(scrollerOf(card).parentElement.className).toContain('bb:mt-4')
        expect(card.element.firstElementChild.className).not.toContain('bb:my-4')
    })

    it('variant вне списка — page', () => {
        const wrapper = mountTable({ variant: 'sheet' }, {}, { quiet: true })

        expect(scrollerOf(wrapper).className).toContain('bb:shadow-sm')
    })

    it('корень без класса сброса пакета', () => {
        const wrapper = mountTable()

        expect(wrapper.classes()).not.toContain('bb-dashboard-ui')
    })

    it('class и атрибуты страницы ложатся на единственный корень', () => {
        const wrapper = mount(DataTable, {
            props: { rows, columns, rowKey: 'uuid' },
            attrs: { class: 'page-table', 'data-test': 'users' },
        })

        expect(wrapper.element.tagName).toBe('DIV')
        expect(wrapper.classes()).toContain('page-table')
        expect(wrapper.attributes('data-test')).toBe('users')
    })
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run tests/DataTable.test.js`

Expected: FAIL — `Failed to resolve import "../src/components/DataTable.vue"`.

- [ ] **Step 3: Компонент**

Create `src/components/DataTable.vue`:

```vue
<template>
    <div>
        <!-- Корень без bb-dashboard-ui, как у PageCard: ресет пакета накрыл бы
             разметку приложения в ячейках. Поэтому таблица сама задаёт то, что
             обычно ставят браузер и preflight: border-collapse, начертание
             и выравнивание заголовков. Комментарий стоит внутри корня:
             перед ним он сделал бы шаблон фрагментом в сборке разработки,
             и class страницы не лёг бы на корень. -->

        <!-- Бейдж с числом найденного и действия рядом с ним — ссылки
             «скачать xlsx», — только когда записи есть. -->
        <div
            v-if="hasBadgeRow"
            class="bb:flex bb:justify-center bb:items-center bb:space-x-2"
            :class="isCard ? '' : 'bb:my-4'"
        >
            <small-badge v-if="badgeText !== null" :text="badgeText" color="indigo"/>
            <slot v-if="hasRecords" name="results-actions"></slot>
        </div>

        <!-- Обёртка с прокруткой лежит в простом блоке: элемент flex-колонки
             с overflow-x-auto Safari считает без горизонтальной полосы
             прокрутки, полоса съедает низ таблицы, и рядом появляется
             вертикальная. Корень компонента часто стоит в flex-колонке. -->
        <div v-if="normalizedRows.length > 0" :class="isCard && hasBadgeRow ? 'bb:mt-4' : ''">
            <div
                class="bb:overflow-x-auto"
                :class="isCard ? 'bb:border-t bb:border-gray-200' : 'bb:shadow-sm bb:border-b bb:border-gray-200 bb:sm:rounded-lg'"
            >
                <table class="bb:min-w-full bb:divide-y bb:divide-gray-200 bb:border-collapse">
                    <thead>
                        <tr class="bb:bg-gray-50">
                            <th
                                v-for="column in visibleColumns"
                                :key="column.key"
                                scope="col"
                                class="bb:px-6 bb:py-3 bb:text-xs bb:leading-4 bb:font-medium bb:text-gray-500 bb:uppercase bb:tracking-wider bb:whitespace-nowrap"
                                :class="[
                                    {
                                        'bb:text-left': column.align === 'left',
                                        'bb:text-center': column.align === 'center',
                                        'bb:text-right': column.align === 'right',
                                    },
                                    { 'bb:w-px': column.narrow },
                                ]"
                                v-text="column.label"
                            ></th>
                        </tr>
                    </thead>
                    <tbody class="bb:divide-y bb:divide-gray-200">
                        <tr
                            v-for="(row, index) in normalizedRows"
                            :key="keyOf(row, index)"
                            :class="{
                                'bb:bg-white bb:even:bg-gray-50': colorOf(row) === null,
                                'bb:bg-red-50': colorOf(row) === 'red',
                                'bb:bg-green-50': colorOf(row) === 'green',
                            }"
                        >
                            <!-- relative: абсолютные элементы слота встают
                                 внутри ячейки, а скрытые подписи sr-only
                                 не выходят из обёртки с прокруткой. -->
                            <td
                                v-for="column in visibleColumns"
                                :key="column.key"
                                class="bb:px-6 bb:py-4 bb:align-top bb:relative bb:text-sm bb:leading-5"
                                :class="[
                                    { 'bb:whitespace-nowrap': !column.wrap },
                                    {
                                        'bb:text-left': column.align === 'left',
                                        'bb:text-center': column.align === 'center',
                                        'bb:text-right': column.align === 'right',
                                    },
                                    { 'bb:w-px': column.narrow },
                                ]"
                            >
                                <slot :name="`cell-${column.key}`" :row="row" :index="index">
                                    <div
                                        class="bb:font-medium"
                                        :class="column.muted ? 'bb:text-gray-400' : 'bb:text-gray-900'"
                                        v-text="textOf(column.value, row)"
                                    ></div>
                                    <div
                                        v-if="column.secondary !== null && textOf(column.secondary, row) !== ''"
                                        class="bb:text-gray-400"
                                        v-text="textOf(column.secondary, row)"
                                    ></div>
                                </slot>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <pagination
            v-if="hasMeta"
            :meta="meta"
            :links="links ?? {}"
            :lang="lang"
            :class="isCard ? 'bb:mt-4' : 'bb:mt-6'"
        />
    </div>
</template>

<script>
import Pagination from "./Pagination.vue";
import SmallBadge from "./SmallBadge.vue";
import { withLang } from "../lang.js";

const ALIGNS = ["left", "center", "right"];
const ROW_COLORS = ["red", "green"];

// Описание столбца со страницы — к полному виду. Элемент без строкового key
// пропускается: ему не дать ни слот, ни значение по умолчанию.
function normalizeColumn(column) {
    if (column === null || typeof column !== "object" || typeof column.key !== "string" || column.key === "") {
        return null;
    }

    const key = column.key;

    return {
        key,
        label: typeof column.label === "string" ? column.label : "",
        value: typeof column.value === "function" ? column.value : (row) => row?.[key],
        secondary: typeof column.secondary === "function" ? column.secondary : null,
        muted: column.muted === true,
        align: ALIGNS.includes(column.align) ? column.align : "left",
        wrap: column.wrap === true,
        narrow: column.narrow === true,
        visible: column.visible !== false,
    };
}

function nonEmptyText(value) {
    return typeof value === "string" && value !== "" ? value : null;
}

export default {
    components: {
        Pagination,
        SmallBadge,
    },

    mixins: [withLang],

    props: {
        // Строки списка: обычные объекты или модели страницы.
        rows: {
            type: Array,
            required: true,
        },
        // Столбцы: { key, label, value, secondary, muted, align, wrap, narrow, visible }.
        columns: {
            type: Array,
            required: true,
        },
        // Имя поля ключа строки или функция row => ключ.
        rowKey: {
            type: [String, Function],
            required: true,
        },
        // meta и links — как их отдаёт Laravel API Resource:
        // meta: { from, to, total }, links: { prev, next }.
        meta: {
            type: Object,
            default: null,
        },
        links: {
            type: Object,
            default: null,
        },
        // «Найдено ордеров» — бейдж «Найдено ордеров: 100».
        foundText: {
            type: String,
            default: null,
        },
        // «Не найдено ордеров» — бейдж пустого списка.
        emptyText: {
            type: String,
            default: null,
        },
        // page — отдельный список на странице, card — таблица внутри
        // карточки страницы.
        variant: {
            type: String,
            default: "page",
            validator: (value) => ["page", "card"].indexOf(value) !== -1,
        },
        // row => 'red' | 'green' | null: цвет строки вместо полосатости.
        rowColor: {
            type: Function,
            default: null,
        },
    },

    computed: {
        normalizedRows() {
            return Array.isArray(this.rows) ? this.rows : [];
        },

        visibleColumns() {
            const columns = Array.isArray(this.columns) ? this.columns : [];

            return columns.map(normalizeColumn).filter((column) => column !== null && column.visible);
        },

        isCard() {
            return this.variant === "card";
        },

        hasMeta() {
            return this.meta !== null && typeof this.meta === "object";
        },

        // Сколько записей всего: по meta.total, если он есть, иначе по строкам.
        recordCount() {
            return this.hasMeta && typeof this.meta.total === "number" ? this.meta.total : this.normalizedRows.length;
        },

        hasRecords() {
            return this.recordCount > 0;
        },

        badgeText() {
            if (this.hasRecords) {
                const found = nonEmptyText(this.foundText);

                return found === null ? null : `${found}: ${this.recordCount}`;
            }

            return nonEmptyText(this.emptyText);
        },

        hasBadgeRow() {
            return this.badgeText !== null || (this.hasRecords && this.$slots["results-actions"] !== undefined);
        },
    },

    methods: {
        // Ключ строки; без ключа — по номеру строки, без исключения.
        keyOf(row, index) {
            let key;

            if (typeof this.rowKey === "function") {
                try {
                    key = this.rowKey(row);
                } catch {
                    key = undefined;
                }
            } else if (typeof this.rowKey === "string") {
                key = row?.[this.rowKey];
            }

            return key === null || key === undefined ? `row-${index}` : key;
        },

        colorOf(row) {
            if (typeof this.rowColor !== "function") {
                return null;
            }

            const color = this.rowColor(row);

            return ROW_COLORS.includes(color) ? color : null;
        },

        // null и undefined — пустая ячейка.
        textOf(getter, row) {
            const value = getter(row);

            return value === null || value === undefined ? "" : String(value);
        },
    },
};
</script>
```

- [ ] **Step 4: Тесты проходят**

Run: `npx vitest run tests/DataTable.test.js`

Expected: PASS, без предупреждений Vue в выводе.

- [ ] **Step 5: Commit**

```bash
git add src/components/DataTable.vue tests/DataTable.test.js
git commit -m "feat: добавить компонент таблицы данных DataTable"
```

---

### Task 4: Экспорт: `DataTable` наружу, `Pagination` внутрь

**Files:**
- Modify: `src/index.js`
- Modify: `tests/exports.test.js`
- Modify: `tests/ssrFixtures.js`

**Interfaces:**
- Consumes: `DataTable` из Task 3.
- Produces: публичная поверхность пакета — восемнадцать компонентов,
  `DataTable` вместо `Pagination`; Task 5 импортирует `DataTable`
  из `dist`.

- [ ] **Step 1: Падающий тест экспорта**

In `tests/exports.test.js` replace the list inside `toEqual([...])`:

```js
        expect(Object.keys(pkg).sort()).toEqual([
            'Closer',
            'ConfirmationModal',
            'DataTable',
            'Dot',
            'DownloadLink',
            'DropdownButtonWithAction',
            'ErrorMessages',
            'NavigationMenuElement',
            'NotificationMessage',
            'PageCard',
            'PickDay',
            'PickDayNative',
            'Popup',
            'RussianMobileFilter',
            'Search',
            'SelectDateInterval',
            'SelectSingle',
            'SmallBadge',
            'dashboardUi',
        ])
```

and add a test after the `Modal` one:

```js
    it('Pagination — внутренний, рисуется только внутри DataTable', () => {
        expect(pkg).not.toHaveProperty('Pagination')
    })
```

Run: `npx vitest run tests/exports.test.js`

Expected: FAIL — в экспорте есть `Pagination`, нет `DataTable`.

- [ ] **Step 2: Экспорт**

In `src/index.js` replace the line

```js
export { default as Pagination } from './components/Pagination.vue'
```

with

```js
export { default as DataTable } from './components/DataTable.vue'
```

- [ ] **Step 3: Фикстура SSR**

In `tests/ssrFixtures.js` replace the line

```js
    Pagination: { props: { links: { prev: '/list?page=1', next: '/list?page=3' }, meta: { from: 16, to: 30, total: 40 } } },
```

with (сохраняя алфавитный порядок ключей — строка `DataTable` встаёт
после `ConfirmationModal`):

```js
    DataTable: {
        props: {
            rows: [{ uuid: '1', name: 'Первый' }, { uuid: '2', name: 'Второй' }],
            columns: [{ key: 'name', label: 'Имя' }],
            rowKey: 'uuid',
            meta: { from: 1, to: 2, total: 2 },
            links: { prev: null, next: null },
            foundText: 'Найдено записей',
        },
    },
```

- [ ] **Step 4: Весь набор и сборка**

Run: `npm test && npm run build`

Expected: все тесты проходят — `exports`, `ssr` (рендер `DataTable`
на сервере без предупреждений), `hydration`, `utilityPrefix`; сборка
без ошибок.

- [ ] **Step 5: Commit**

```bash
git add src/index.js tests/exports.test.js tests/ssrFixtures.js
git commit -m "feat: экспортировать DataTable и сделать Pagination внутренним"
```

---

### Task 5: Playground

**Files:**
- Modify: `playground/App.vue`
- Modify: `playground/shell.css`

**Interfaces:**
- Consumes: `DataTable`, `DropdownButtonWithAction`, `DownloadLink`,
  `SmallBadge` из `../dist/index.js` (после `npm run build`).
- Produces: демо для ручной приёмки Task 7.

- [ ] **Step 1: Секция `Pagination` → `DataTable`**

In `playground/App.vue` replace the whole section

```vue
        <section>
            <h2>Pagination</h2>
            <pagination :links="{ prev: '/list?page=1', next: '/list?page=3' }" :meta="{ from: 16, to: 30, total: 40 }"/>
            <pagination :links="{ prev: null, next: '/list?page=2' }" :meta="{ from: 1, to: 15, total: 40 }"/>
            <p>Последний переход: {{ lastNavigation || '—' }}</p>
        </section>
```

with

```vue
        <section>
            <h2>DataTable</h2>

            <h3>page: пагинация, бейдж, ссылка рядом с бейджем, меню действий</h3>
            <data-table
                :rows="tableRows"
                :columns="tableColumns"
                row-key="uuid"
                :meta="{ from: 16, to: 30, total: 40 }"
                :links="{ prev: '/list?page=1', next: '/list?page=3' }"
                found-text="Найдено ордеров"
                empty-text="Не найдено ордеров"
            >
                <template #results-actions>
                    <download-link url="/export.xlsx" title="скачать xlsx"/>
                </template>
                <template #cell-status="{ row }">
                    <small-badge :text="row.status" :color="row.statusColor"/>
                </template>
                <template #cell-actions>
                    <dropdown-button-with-action>
                        <template #button><span class="demo-action">Редактировать</span></template>
                        <template #actions>
                            <a href="#" class="demo-action">Поменять пароль</a>
                            <a href="#" class="demo-action">Удалить</a>
                        </template>
                    </dropdown-button-with-action>
                </template>
            </data-table>
            <p>Последний переход: {{ lastNavigation || '—' }}</p>

            <h3>card: внутри белой карточки с flex-колонкой</h3>
            <div class="demo-card">
                <div class="demo-card-column">
                    <data-table
                        variant="card"
                        :rows="tableRows"
                        :columns="tableColumns"
                        row-key="uuid"
                        found-text="Найдено ордеров"
                    >
                        <template #cell-status="{ row }">
                            <small-badge :text="row.status" :color="row.statusColor"/>
                        </template>
                        <template #cell-actions>
                            <dropdown-button-with-action>
                                <template #button><span class="demo-action">Редактировать</span></template>
                                <template #actions>
                                    <a href="#" class="demo-action">Удалить</a>
                                </template>
                            </dropdown-button-with-action>
                        </template>
                    </data-table>
                </div>
            </div>

            <h3>Скрытый столбец, цвет строки, без пагинации</h3>
            <data-table
                :rows="tableRows"
                :columns="tableColumnsWithoutCost"
                row-key="uuid"
                :row-color="(row) => row.rowColor"
                found-text="Найдено анкет"
            />

            <h3>Пустой список</h3>
            <data-table
                :rows="[]"
                :columns="tableColumns"
                row-key="uuid"
                :meta="{ from: null, to: null, total: 0 }"
                :links="{ prev: null, next: null }"
                found-text="Найдено ордеров"
                empty-text="Не найдено ордеров"
            />
        </section>
```

- [ ] **Step 2: Импорт, данные, стили демо**

In the `import { … } from '../dist/index.js';` list and in `components`
replace `Pagination,` with `DataTable,` (в обоих местах).

In `data()` add after `dropdownIsOpen: false,`:

```js
            // Десять строк: таблица выше окна, у нижних строк меню
            // открывается вверх. Длинное сообщение делает таблицу шире
            // карточки — проверяется горизонтальная прокрутка.
            tableRows: Array.from({ length: 10 }, (_, index) => ({
                uuid: `row-${index}`,
                phone: `+7999000${String(index).padStart(4, '0')}`,
                vendor: index % 2 === 0 ? 'Сбер' : 'Озон',
                certificate: index % 2 === 0 ? 'СберКарта' : 'Подарочная карта',
                amount: `${(index + 1) * 500} ₽`,
                cost: `${(index + 1) * 2},50 ₽`,
                status: index % 3 === 0 ? 'Доставлено' : 'В очереди',
                statusColor: index % 3 === 0 ? 'green' : 'gray',
                comment: 'Провайдер принял сообщение, итог доставки пока не получен — длинное пояснение переносится',
                createdAt: '06.10.2026',
                rowColor: index === 1 ? 'red' : index === 2 ? 'green' : null,
            })),
```

Add a `computed` section between `data()` and `methods` (сейчас её
в `App.vue` нет):

```js
    computed: {
        tableColumns() {
            return [
                { key: 'phone', label: 'Телефон' },
                { key: 'vendor', label: 'Вендор / Сертификат', secondary: (row) => row.certificate },
                { key: 'amount', label: 'Номинал', align: 'right', muted: true },
                { key: 'cost', label: 'Стоимость', align: 'right' },
                { key: 'status', label: 'Статус' },
                { key: 'comment', label: 'Состояние', wrap: true },
                { key: 'createdAt', label: 'Создан', muted: true },
                { key: 'actions', align: 'right', narrow: true },
            ];
        },

        tableColumnsWithoutCost() {
            return this.tableColumns
                .filter((column) => column.key !== 'actions')
                .map((column) => (column.key === 'cost' ? { ...column, visible: false } : column));
        },
    },
```

In `playground/shell.css` (там же, где `.demo-action`) add at the end:

```css
/* Карточка страницы с flex-колонкой, как карточка группы в certificates:
   в ней Safari съедал высоту под полосу прокрутки таблицы. */
.demo-card {
    max-width: 48rem;
    padding: 1.5rem;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}

.demo-card-column {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
```

- [ ] **Step 3: Сборка playground**

Run: `npm run build && npx vite build --config vite.playground.config.js --outDir /private/tmp/claude-501/playground-check --emptyOutDir --base ./`

Expected: обе сборки без ошибок. Затем `rm -rf /private/tmp/claude-501/playground-check`.

- [ ] **Step 4: Commit**

```bash
git add playground
git commit -m "docs: показать DataTable в playground вместо Pagination"
```

---

### Task 6: README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: контракт `DataTable` (Task 3), `DropdownButtonWithAction`
  (Task 2).
- Produces: README для выпуска `0.12.0`.

- [ ] **Step 1: Требования и список компонентов**

In section `## Требования` append after the Tailwind paragraph:

```markdown
Меню `DropdownButtonWithAction` стоит на Popover API браузера: Safari 17+,
Chrome 114+, Firefox 125+. В браузерах старше меню видно в потоке всегда.
```

In section `## Компоненты` replace in the list `` `DropdownButtonWithAction`, `Pagination`, ``
with `` `DropdownButtonWithAction`, `DataTable`, ``.

- [ ] **Step 2: Раздел `DropdownButtonWithAction`**

Replace the paragraph starting with `Событие: \`update:modelValue\` — только когда меню открыл`
до конца раздела (до `### Pagination`) with:

```markdown
Событие: `update:modelValue` — только когда меню открыл или закрыл сам
компонент или браузер: клик по стрелке, клик вне меню, Escape, клик
по пункту меню, прокрутка, изменение размера окна. Значение, пришедшее
от родителя, компонент принимает молча: ответное событие вернуло бы
родителю его же решение. Без `v-model` меню работает само по себе.

Меню открывается в верхнем слое браузера (Popover API): его не обрезает
таблица с горизонтальной прокруткой, и оно стоит поверх страницы. Правый
край меню — по правому краю стрелки; меню открывается вниз или вверх —
где больше места, сужается у левого края окна и закрывается кликом
по любому пункту, прокруткой страницы или таблицы и изменением размера
окна. Открытие другого меню закрывает предыдущее.
```

- [ ] **Step 3: Раздел `Pagination` → `DataTable`**

Replace the whole section from `### Pagination` up to (не включая)
`### NavigationMenuElement` with:

````markdown
### DataTable

Список данных: бейдж «Найдено X: N», таблица в карточке с горизонтальной
прокруткой, пустое состояние и пагинация — по ответу Laravel API Resource
`{ data, meta, links }`. Особые ячейки — слотами.

    <data-table
        :rows="orderObjects"
        :columns="columns"
        row-key="uuid"
        :meta="orders.meta"
        :links="orders.links"
        found-text="Найдено ордеров"
        empty-text="Не найдено ордеров"
    >
        <template #results-actions>
            <download-link :url="exportUrl" title="скачать xlsx" />
        </template>
        <template #cell-status="{ row }">
            <small-badge :text="row.statusLabel" :color="row.statusColor" />
        </template>
    </data-table>

    columns: [
        { key: 'phone', label: 'Телефон' },
        { key: 'vendor', label: 'Вендор / Сертификат', secondary: (row) => row.certificate },
        { key: 'amount', label: 'Номинал', align: 'right', muted: true },
        { key: 'status', label: 'Статус' },
        { key: 'cost', label: 'Стоимость', align: 'right', visible: isAdmin },
        { key: 'actions', align: 'right', narrow: true },
    ]

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `rows` | `Array` | обязателен | Строки: обычные объекты или модели страницы |
| `columns` | `Array` | обязателен | Столбцы, см. ниже |
| `rowKey` | `String`, `Function` | обязателен | Имя поля ключа строки или `row => ключ` |
| `meta` | `Object` | `null` | `{ from, to, total }` пагинации Laravel; есть — внизу пагинация, а число в бейдже — `total` |
| `links` | `Object` | `null` | `{ prev, next }` пагинации Laravel |
| `foundText` | `String` | `null` | «Найдено ордеров» → бейдж «Найдено ордеров: 100», когда записи есть |
| `emptyText` | `String` | `null` | «Не найдено ордеров» — бейдж, когда записей нет |
| `variant` | `String` | `"page"` | `"page"` — отдельная карточка с тенью; `"card"` — таблица внутри карточки страницы, только линия сверху |
| `rowColor` | `Function` | `null` | `row => 'red' \| 'green' \| null` — цвет строки вместо полосатости |
| `lang` | `String` | язык плагина | `"ru"` или `"en"` — тексты пагинации |

Столбец:

| Поле | По умолчанию | Описание |
| --- | --- | --- |
| `key` | обязателен | Имя слота `cell-<key>` и поле значения по умолчанию |
| `label` | `""` | Заголовок; пустой — у столбца действий |
| `value` | `row => row[key]` | Основной текст ячейки. У моделей с геттерами — `(row) => row.getName()` |
| `secondary` | нет | `row => текст` — серая вторая строка |
| `muted` | `false` | Основной текст серый — даты, статусы, суммы |
| `align` | `"left"` | `"left"`, `"center"` или `"right"` — для заголовка и ячеек |
| `wrap` | `false` | Текст ячеек переносится |
| `narrow` | `false` | Ширина по содержимому — столбцы действий и иконок |
| `visible` | `true` | `false` — столбца нет вовсе: ни заголовка, ни ячеек, ни слота |

Скрытый столбец — только отображение: данные, которые пользователю видеть
нельзя, сервер не отдаёт.

Слоты: `#cell-<key>="{ row, index }"` — своя разметка ячейки (отступы,
выравнивание и перенос ячейки остаются за компонентом);
`#results-actions` — рядом с бейджем, только когда записи есть.

Записей нет — только бейдж с `emptyText`, без таблицы и пагинации; без
текстов — ничего. Страница за последней (`total` больше нуля, `rows` пуст) —
бейдж и пагинация без таблицы. Строки выравниваются по верху. Широкая
таблица прокручивается в своей карточке. Ссылки пагинации — через
`navigate` плагина. Событий нет.
````

- [ ] **Step 4: Языки**

In section `## Языки` replace the table row starting with `` | `Pagination` | `` with:

```markdown
| `DataTable` — пагинация | Предыдущая / Следующая / Показаны результаты X - Y из Z | Previous / Next / Showing X - Y of Z results |
```

- [ ] **Step 5: Раздел «Обновление с 0.11»**

Insert before `## Ограничение` (последний раздел):

```markdown
## Обновление с 0.11

- `Pagination` больше не экспортируется. Страница, импортирующая её
  из пакета, переводит свой список на `DataTable`: бейдж «Найдено»,
  таблица, пустое состояние и пагинация теперь в одном компоненте.
- Меню `DropdownButtonWithAction` открывается в верхнем слое браузера
  и закрывается кликом по пункту. Страницы, которые сами закрывали меню
  через `v-model` перед открытием модалки, работают как раньше.
```

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: описать DataTable и меню в верхнем слое в README"
```

---

### Task 7: Ручная приёмка

Выполняет тот, у кого есть Chrome DevTools MCP. Правок кода нет,
если приёмка не нашла дефекта; найденный дефект чинится в файле Task 2
или Task 3 отдельным коммитом `fix: …`, и приёмка повторяется с пункта,
где он найден.

**Files:** не меняются.

Браузер MCP не видит `localhost` хоста; playground собирается статикой
в `certificates/src/public/build/ui-playground/` и открывается через
`https://certificates.test` (вход `agent@certificates.test` /
`LYMCyFVwrXgiVNERnufM`).

- [ ] **Step 1: Сборка playground на certificates.test**

```bash
cd /Users/boobooking/Code/dashboard-ui-components
npm run build
npx vite build --config vite.playground.config.js --outDir /Users/boobooking/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./
```

Открыть `https://certificates.test/build/ui-playground/host.html`
(окружение приложения).

- [ ] **Step 2: Chrome — DataTable**

1. `page`: бейдж «Найдено ордеров: 40» с «скачать xlsx» рядом, таблица
   с тенью, пагинация «Показаны результаты 16 - 30 из 40».
2. Окно 700 px: таблица прокручивается по горизонтали внутри своей
   карточки, у документа `scrollWidth === clientWidth`.
3. `card` внутри демо-карточки: линия сверху, без тени; у обёртки
   с прокруткой `scrollHeight - clientHeight === 0` (нет лишней
   вертикальной полосы).
4. Скрытый столбец «Стоимость» отсутствует; строки 2 и 3 — красная
   и зелёная, остальные полосатые.
5. Пустой список: только бейдж «Не найдено ордеров».

- [ ] **Step 3: Chrome — меню действий в таблице**

1. Меню первой строки открывается под стрелкой, правый край по стрелке,
   не обрезано обёрткой таблицы.
2. Меню последней строки (страница прокручена так, что строка у низа
   окна) открывается вверх.
3. Закрывается: повторным кликом по стрелке, кликом вне, Escape, кликом
   по пункту, прокруткой страницы, горизонтальной прокруткой таблицы.
4. Открытие меню другой строки закрывает первое.
5. Окно 400 px: меню не выходит за левый край окна.
6. Консоль без ошибок и предупреждений.

- [ ] **Step 4: Certificates через npm pack**

```bash
cd /Users/boobooking/Code/dashboard-ui-components && npm pack --pack-destination /private/tmp/claude-501/
cd /Users/boobooking/Code/mars/certificates/src && npm install --no-save /private/tmp/claude-501/boobooking-dashboard-ui-components-0.11.0.tgz
```

(Версия в имени архива — текущая из `package.json` пакета, до Task 8 —
`0.11.0`.)

Временно перевести `resources/js/Pages/Users/Index.vue` на `DataTable`:
блок `div.flex.flex-col` с таблицей и `<pagination …/>` заменить на

```vue
<data-table
    :rows="usersObjects"
    :columns="[
        { key: 'name', label: 'Имя', value: (user) => user.getName() },
        { key: 'email', label: 'Email', align: 'center', muted: true, value: (user) => user.getEmail() },
        { key: 'actions', align: 'right', narrow: true },
    ]"
    :row-key="(user) => user.getId()"
    :meta="users.meta"
    :links="users.links"
>
    <template #cell-actions="{ row: user }">
        …содержимое нынешней ячейки с dropdown-button-with-action без изменений…
    </template>
</data-table>
```

(имя вычисляемого свойства со списком моделей, геттеры и разметку ячейки
действий взять из файла как есть; `DataTable` добавить в импорт из пакета
и в `components`). Собрать certificates и следом заново playground:
сборка certificates очищает `public/build` вместе с `ui-playground`,
а `host.html` нужен владельцу в Step 5.

```bash
cd /Users/boobooking/Code/mars/certificates/src && npm run build
cd /Users/boobooking/Code/dashboard-ui-components && npx vite build --config vite.playground.config.js --outDir /Users/boobooking/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./
```

Expected: `https://certificates.test/build/ui-playground/host.html`
открывается. Открыть `https://certificates.test/users`:
список, пагинация, меню «Редактировать / Поменять пароль / Удалить»;
«Удалить» открывает модалку подтверждения поверх страницы, меню при этом
закрыто; модалка закрывается «Отменой» (подтверждение не нажимать).

- [ ] **Step 5: Safari — владельцу**

Владелец проверяет в Safari на `host.html` и `https://certificates.test/users`
пункты Step 2.2, 2.3, Step 3.1–3.4 и Step 4. Результат — в отчёт задачи.

- [ ] **Step 6: Откат certificates**

```bash
cd /Users/boobooking/Code/mars/certificates/src
git checkout -- resources/js/Pages/Users/Index.vue
npm ci
npm run build
git status --short
rm -f /private/tmp/claude-501/boobooking-dashboard-ui-components-*.tgz
```

Expected: `git status --short` пуст; `npm run build` пересобирает ассеты
и стирает `public/build/ui-playground`.

---

### Task 8: Выпуск `0.12.0`

Пуш и тег — публикация: перед Step 2 — явное «да» владельца.

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Версия**

В `package.json` — `"version": "0.12.0",`; в `package-lock.json` —
в двух местах: верхний `"version"` и `packages[""].version`.

```bash
npm test && npm run build
git add package.json package-lock.json
git commit -m "chore: поднять версию пакета до 0.12.0"
```

- [ ] **Step 2: Пуш и Test** (после «да» владельца)

```bash
git push origin main
SHA=$(git rev-parse HEAD)
gh run list --commit "$SHA" --workflow Test
```

Дождаться зелёного `Test` (оба джоба) по полному SHA.

- [ ] **Step 3: Тег**

```bash
git tag v0.12.0 "$SHA"
git push origin v0.12.0
```

Expected: workflow `Publish` выкладывает `0.12.0` в реестр с тегом `latest`.
