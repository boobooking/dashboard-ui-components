# Фокус в `ConfirmationModal` и выпуск `0.17.1` — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** открытая `ConfirmationModal` держит фокус — в первом кадре после открытия он на кнопке отмены, Tab и Shift+Tab ходят по кругу внутри, Escape — `actionCanceled`, после закрытия фокус возвращается на прежнее место; выпуск `0.17.1` и переход payments, cashback и certificates на `^0.17.1`.

**Architecture:** новый внутренний модуль `src/dialogFocus.js` с одной функцией `holdDialogFocus(panel, onEscape)`: начальный фокус, слушатель `keydown` на `document` в фазе захвата, функция возврата фокуса. `Modal.vue` при открытии запрашивает кадр и в нём вызывает `holdDialogFocus`, при закрытии и размонтировании отменяет кадр или снимает держатель. `ConfirmationModal.vue` помечает кнопку отмены `data-dialog-focus` и превращает внутреннее событие `escape` в `actionCanceled`.

**Tech Stack:** Vue 3.5 (Options API, SFC), vitest 5 + happy-dom 20, @vue/test-utils 2, Vite 8 (library mode), Popover API, chrome-devtools MCP, playwright-core 1.63.0 (WebKit), GitHub Actions, npm.

**Spec:** `docs/superpowers/specs/2026-10-16-confirmation-modal-focus-design.md`

## Global Constraints

- Репозиторий `/Users/boobooking/Code/dashboard-ui-components`, ветка — текущая `main`, коммиты прямо в неё. Версия в `package.json` — `0.17.0` до Task 6, затем `0.17.1` последним коммитом.
- Публикация (пуш `main` и тега `v0.17.1`) — шаг исполнителя, **только после явного согласия владельца на этом шаге** (Task 7). Проекты payments, cashback и certificates исполнитель не пушит — пушит владелец.
- Начальный фокус — кнопка отмены у обоих типов модалки; классы кнопок не меняются, кольцо `focus:ring-*` у кнопки отмены видно при каждом открытии (спека §4, п. 6).
- Фокус захватывается в кадре, запрошенном при открытии (`requestAnimationFrame`), а не в наблюдателе и не через `nextTick` (спека §2 «Порядок событий», §6).
- Элементы фокуса модалки — `a[href], button:not(:disabled)`; каждый Tab ведёт модуль (`preventDefault()`), Escape — без `preventDefault()` (спека §5).
- Возврат фокуса — только если он потерян (`body` или `null`) или в панели, и прежний элемент не `body` и `isConnected`; `focus({ preventScroll: true })` (спека §4, п. 4).
- Пропсы, события, разметка и классы `ConfirmationModal` для проектов не меняются; `src/index.js` не меняется.
- Стиль: в `.js` (`src` и тесты) — одинарные кавычки без точек с запятой; в `.vue` — как в файле (двойные кавычки и точки с запятой в `<script>`); отступ 4 пробела; комментарии по-русски и описывают код как он есть. Существующие комментарии сохраняются.
- Тесты — только каталог `tests/`: `npm test -- --dir tests`. В `.codex-advisor/` лежат копии исходников и тестов для опытов ревьюера, и `npm test` без `--dir` подхватывает и их (2026-10-16: 128 файлов, 20 падений чужих копий). База до Task 1: `Test Files 42 passed (42)`, `Tests 774 passed (774)`.
- Вывод тестов чистый: `npm test -- --dir tests --reporter=verbose > $W/<имя>.log 2>&1`, затем `grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/<имя>.log` — ожидается `0`. Поиск по `warn|error` не годится: ловит имена тестов вроде `ErrorMessages`.
- Логи — `W=.superpowers/sdd/2026-10-16-confirmation-modal-focus` (`.superpowers/sdd` git-ignored); каталог уже есть, в нём `baseline.log`.
- Коммиты — conventional commits: в библиотеке, cashback и certificates по-русски, в payments по-английски; повелительное наклонение, без служебных строк и упоминаний инструментов; `--no-verify` запрещён.
- Замечания итогового ревью всех уровней, включая Minor, исправляются (Task 5); в отложенные попадает только то, что отложит владелец.

## Review Focus

- Модалку закрыли и сразу открыли снова до кадра (двойной клик, быстрый повтор): держатель один — после кадра фокус на «Отмена», Escape даёт одно `actionCanceled`. Тест — Task 2, «закрыта и открыта снова до кадра».
- Подтверждение удалило строку вместе с кнопкой, с которой открыли модалку (payments: «Delete» → перезагрузка списка): закрытие без ошибок, фокус не на удалённой кнопке. Тест — Task 2, «кнопки, с которой открыли, уже нет».
- Модалка смонтирована открытой и размонтирована до кадра (уход со страницы через Inertia): кадр отменён, ни слушателя, ни ошибки, фокус не тронут. Тест — Task 2, «размонтирована до кадра».
- Расширение браузера останавливает `keydown` на `body` (Safari Тима): Tab и Escape работают. Тест — Task 1, «работает, даже если keydown остановили на body».
- Клик по затемнению оставил фокус на `body`: Tab возвращает его на первую кнопку модалки, Shift+Tab — на последнюю. Тест — Task 1, строки «Tab с body» и «Shift+Tab вне панели»; в браузере — Task 4, шаг 5 и WebKit.

---

### Task 1: Модуль `src/dialogFocus.js`

**Files:**
- Create: `src/dialogFocus.js`
- Create: `tests/dialogFocus.test.js`

**Interfaces:**
- Consumes: ничего из других задач.
- Produces: `holdDialogFocus(panel: HTMLElement, onEscape: () => void): () => void` — экспорт `src/dialogFocus.js`; возвращённая функция снимает слушатель и возвращает фокус, повторный вызов ничего не делает. Из `src/index.js` не экспортируется.

- [ ] **Step 1: База ревью**

```bash
W=.superpowers/sdd/2026-10-16-confirmation-modal-focus
git rev-parse HEAD > "$W/base-sha"
cat "$W/base-sha"
```

Полный SHA `HEAD` до Task 1 (коммит этого плана) — база итогового ревью (Task 5).

- [ ] **Step 2: Тест**

`tests/dialogFocus.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { holdDialogFocus } from '../src/dialogFocus.js'

// Панель из трёх кнопок и кнопка страницы вне панели, с которой открывают
// диалог: при вызове holdDialogFocus фокус на ней.
let opener
let panel
let buttons
let release

beforeEach(() => {
    opener = document.createElement('button')
    opener.textContent = 'opener'
    panel = document.createElement('div')
    buttons = ['A', 'B', 'C'].map((name) => {
        const button = document.createElement('button')
        button.textContent = name
        panel.append(button)
        return button
    })
    document.body.append(opener, panel)
    opener.focus()
    release = null
})

afterEach(() => {
    release?.()
    opener.remove()
    panel.remove()
})

function press(key, { shiftKey = false, target = document.activeElement } = {}) {
    const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true })
    target.dispatchEvent(event)
    return event
}

function focused() {
    return document.activeElement === document.body ? 'body' : document.activeElement.textContent
}

function byName(name) {
    return buttons.find((button) => button.textContent === name)
}

describe('holdDialogFocus: начальный фокус', () => {
    it('на элементе с data-dialog-focus', () => {
        byName('C').setAttribute('data-dialog-focus', '')
        release = holdDialogFocus(panel, () => {})

        expect(focused()).toBe('C')
    })

    it('без метки — на первом элементе', () => {
        release = holdDialogFocus(panel, () => {})

        expect(focused()).toBe('A')
    })

    it('без элементов фокус не меняется', () => {
        panel.replaceChildren()
        release = holdDialogFocus(panel, () => {})

        expect(focused()).toBe('opener')
    })
})

describe('holdDialogFocus: Tab', () => {
    it.each([
        { name: 'Tab с первого — на второй', from: 'A', shiftKey: false, want: 'B' },
        { name: 'Tab с последнего — по кругу на первый', from: 'C', shiftKey: false, want: 'A' },
        { name: 'Tab вне панели — на первый', from: 'opener', shiftKey: false, want: 'A' },
        { name: 'Tab с body — на первый', from: 'body', shiftKey: false, want: 'A' },
        { name: 'Shift+Tab с первого — по кругу на последний', from: 'A', shiftKey: true, want: 'C' },
        { name: 'Shift+Tab со второго — на первый', from: 'B', shiftKey: true, want: 'A' },
        { name: 'Shift+Tab вне панели — на последний', from: 'opener', shiftKey: true, want: 'C' },
    ])('$name', ({ from, shiftKey, want }) => {
        release = holdDialogFocus(panel, () => {})
        if (from === 'opener') {
            opener.focus()
        } else if (from === 'body') {
            document.activeElement.blur()
        } else {
            byName(from).focus()
        }

        const event = press('Tab', { shiftKey, target: from === 'body' ? document.body : document.activeElement })

        expect(event.defaultPrevented).toBe(true)
        expect(focused()).toBe(want)
    })

    it('пропускает отключённую кнопку', () => {
        byName('B').disabled = true
        release = holdDialogFocus(panel, () => {})
        byName('A').focus()

        press('Tab')

        expect(focused()).toBe('C')
    })
})

describe('holdDialogFocus: остальные клавиши', () => {
    it('Escape вызывает onEscape один раз и не отменяется', () => {
        const onEscape = vi.fn()
        release = holdDialogFocus(panel, onEscape)

        const event = press('Escape')

        expect(onEscape).toHaveBeenCalledTimes(1)
        expect(event.defaultPrevented).toBe(false)
    })

    it.each(['Enter', 'ArrowDown', 'a'])('%s не перехватывается', (key) => {
        const onEscape = vi.fn()
        release = holdDialogFocus(panel, onEscape)
        byName('A').focus()

        const event = press(key)

        expect(event.defaultPrevented).toBe(false)
        expect(focused()).toBe('A')
        expect(onEscape).not.toHaveBeenCalled()
    })

    // Так делает расширение Safari: его обработчик на body останавливает
    // keydown, и до слушателей document на всплытии событие не доходит.
    it('работает, даже если keydown остановили на body', () => {
        const onEscape = vi.fn()
        const stopOnBody = (event) => event.stopPropagation()
        document.body.addEventListener('keydown', stopOnBody)

        try {
            release = holdDialogFocus(panel, onEscape)
            press('Tab', { target: document.body })
            press('Escape', { target: document.body })

            expect(focused()).toBe('B')
            expect(onEscape).toHaveBeenCalledTimes(1)
        } finally {
            document.body.removeEventListener('keydown', stopOnBody)
        }
    })
})

describe('holdDialogFocus: возврат фокуса', () => {
    it('фокус в панели — на прежний элемент', () => {
        release = holdDialogFocus(panel, () => {})

        release()

        expect(focused()).toBe('opener')
    })

    it('фокус потерян на body — на прежний элемент', () => {
        release = holdDialogFocus(panel, () => {})
        document.activeElement.blur()

        release()

        expect(focused()).toBe('opener')
    })

    it('фокус на другом элементе страницы остаётся там', () => {
        const other = document.createElement('button')
        other.textContent = 'other'
        document.body.append(other)

        try {
            release = holdDialogFocus(panel, () => {})
            other.focus()

            release()

            expect(focused()).toBe('other')
        } finally {
            other.remove()
        }
    })

    it('прежнего элемента уже нет — фокус не трогается', () => {
        release = holdDialogFocus(panel, () => {})
        opener.remove()

        release()

        expect(focused()).toBe('A')
    })

    it('прежним был body — фокус не трогается', () => {
        opener.blur()
        release = holdDialogFocus(panel, () => {})

        release()

        expect(focused()).toBe('A')
    })

    it('после возврата Tab и Escape не перехватываются', () => {
        const onEscape = vi.fn()
        release = holdDialogFocus(panel, onEscape)
        release()
        byName('A').focus()

        const tab = press('Tab')
        press('Escape')

        expect(tab.defaultPrevented).toBe(false)
        expect(focused()).toBe('A')
        expect(onEscape).not.toHaveBeenCalled()
    })

    it('повторный вызов ничего не делает', () => {
        release = holdDialogFocus(panel, () => {})
        release()
        byName('B').focus()

        release()

        expect(focused()).toBe('B')
    })
})
```

23 теста: 3 + 7 + 1 + 1 + 3 + 1 + 7.

- [ ] **Step 3: Тест падает**

```bash
W=.superpowers/sdd/2026-10-16-confirmation-modal-focus
npm test -- --dir tests dialogFocus > $W/t1-red.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests |dialogFocus" $W/t1-red.log | head -n 5
```

Expected: `tests exit 1`; файл `tests/dialogFocus.test.js` падает на импорте — `../src/dialogFocus.js` не найден.

- [ ] **Step 4: Модуль**

`src/dialogFocus.js`:

```js
// Фокус открытого диалога: начальный — на элемент с data-dialog-focus, без
// него — на первый; Tab и Shift+Tab — по кругу внутри панели; Escape —
// onEscape. Возвращает функцию, которая снимает слушатель и возвращает
// фокус туда, где он был до вызова.
// Внутренний модуль пакета: им держит фокус Modal (ConfirmationModal).

// Элементы фокуса модалок пакета — кнопки и ссылки. Отключённая кнопка
// фокус не принимает, и переход на неё оборвал бы круг.
const ITEMS = 'a[href], button:not(:disabled)'

// Слушатель висит на document в фазе захвата — как у moveMenuFocus:
// расширения браузера останавливают keydown на body, и до document на
// всплытии клавиша не доходит. Каждый Tab ведёт модуль, а не браузер:
// Safari по умолчанию пропускает кнопки и увёл бы фокус из панели. Фокус
// вне панели — Tab ставит его на первый элемент, Shift+Tab — на последний.
// Escape не отменяется: модалку закрывает родитель, а у браузера на Escape
// свои действия.
export function holdDialogFocus(panel, onEscape) {
    const previous = document.activeElement
    const initial = panel.querySelector('[data-dialog-focus]') ?? panel.querySelector(ITEMS)
    initial?.focus()

    const onKeydown = (event) => {
        if (event.key === 'Escape') {
            onEscape()
            return
        }

        if (event.key !== 'Tab') {
            return
        }

        const items = [...panel.querySelectorAll(ITEMS)]
        if (items.length === 0) {
            return
        }

        event.preventDefault()

        const step = event.shiftKey ? -1 : 1
        const current = items.indexOf(document.activeElement)
        const next = current === -1
            ? (step === 1 ? 0 : items.length - 1)
            : (current + step + items.length) % items.length

        items[next].focus()
    }

    document.addEventListener('keydown', onKeydown, true)

    let released = false

    // Фокус возвращается, только если он потерян или ещё в панели: фокус,
    // который страница поставила в другое место, не забирается. Прежнего
    // элемента может уже не быть — строку, из меню которой открыли диалог,
    // удалили. Страница к нему не прокручивается, как в PopoverPanel.
    return () => {
        if (released) {
            return
        }
        released = true

        document.removeEventListener('keydown', onKeydown, true)

        const active = document.activeElement
        const isLost = active === null || active === document.body || panel.contains(active)
        const canReturn = previous !== null && previous !== document.body && previous.isConnected
        if (isLost && canReturn) {
            previous.focus({ preventScroll: true })
        }
    }
}
```

- [ ] **Step 5: Тест проходит**

```bash
W=.superpowers/sdd/2026-10-16-confirmation-modal-focus
npm test -- --dir tests dialogFocus --reporter=verbose > $W/t1-green.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests " $W/t1-green.log
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t1-green.log
```

Expected: `tests exit 0`, `Tests 23 passed (23)`, `0`.

- [ ] **Step 6: Фаза захвата доказана**

Временно убрать `true` из обеих строк `document.addEventListener('keydown', onKeydown, true)` и `document.removeEventListener('keydown', onKeydown, true)`, прогнать тот же набор, вернуть `true` и прогнать снова:

```bash
W=.superpowers/sdd/2026-10-16-confirmation-modal-focus
sed -i '' "s/'keydown', onKeydown, true)/'keydown', onKeydown)/" src/dialogFocus.js
npm test -- --dir tests dialogFocus > $W/t1-bubble.log 2>&1; echo "bubble exit $?"
grep -E "×|Tests " $W/t1-bubble.log | head -n 5
sed -i '' "s/'keydown', onKeydown)/'keydown', onKeydown, true)/" src/dialogFocus.js
grep -c "'keydown', onKeydown, true)" src/dialogFocus.js
npm test -- --dir tests dialogFocus > $W/t1-green2.log 2>&1; echo "tests exit $?"
grep -E "Tests " $W/t1-green2.log
```

Expected: `bubble exit 1`, падает ровно «работает, даже если keydown остановили на body»; после возврата `2` и `Tests 23 passed (23)`.

Коммита в этой задаче нет: по спеке §12 код, тесты, README и Playground — один `fix:`-коммит (Task 3).

---

### Task 2: `Modal.vue` держит фокус, `ConfirmationModal.vue` — кнопка отмены и Escape

**Files:**
- Modify: `src/components/Modal.vue` (блок `role="dialog"` в шаблоне, весь `<script>`)
- Modify: `src/components/ConfirmationModal.vue:2` (`<modal>`), `:36-42` (кнопка отмены)
- Modify: `tests/ConfirmationModal.test.js`

**Interfaces:**
- Consumes: `holdDialogFocus(panel, onEscape)` из Task 1.
- Produces: внутреннее событие `escape` у `Modal` (только для `ConfirmationModal`); `ConfirmationModal` отправляет `actionCanceled` по Escape; атрибут `data-dialog-focus` на кнопке отмены. Пропсы и события для проектов прежние.

- [ ] **Step 1: Тесты**

В `tests/ConfirmationModal.test.js` строку импорта vitest заменить:

```js
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
```

и дописать в конец файла:

```js

// Фокус модалка захватывает в следующем кадре: кадр наступает после всего
// клика, который её открыл. Кадры happy-dom идут в порядке запроса, поэтому
// кадр теста наступает после кадра модалки.
function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve))
}

function pressEscape() {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
}

describe('ConfirmationModal: фокус', () => {
    // Кнопка страницы, с которой открывают модалку: перед открытием фокус
    // на ней.
    let opener

    beforeEach(() => {
        opener = document.createElement('button')
        opener.textContent = 'Открыть'
        document.body.append(opener)
        opener.focus()
    })

    afterEach(() => {
        opener.remove()
    })

    function mountModal(isOpen, onActionCanceled = () => {}) {
        return mount(ConfirmationModal, {
            props: { isOpen, actionButtonText: 'Удалить', onActionCanceled },
            attachTo: document.body,
        })
    }

    function cancelButton(wrapper) {
        return wrapper.findAll('button').find((button) => button.text() === 'Отмена').element
    }

    it('открыта: до кадра фокус не тронут, после — на кнопке отмены', async () => {
        const wrapper = mountModal(false)
        await wrapper.setProps({ isOpen: true })

        expect(document.activeElement).toBe(opener)
        await nextFrame()
        expect(document.activeElement).toBe(cancelButton(wrapper))
    })

    it('смонтирована открытой: после кадра фокус на кнопке отмены', async () => {
        const wrapper = mountModal(true)
        await nextFrame()

        expect(document.activeElement).toBe(cancelButton(wrapper))
    })

    it('закрыта до кадра: фокус не тронут, Escape событий не даёт', async () => {
        const onActionCanceled = vi.fn()
        const wrapper = mountModal(false, onActionCanceled)
        await wrapper.setProps({ isOpen: true })
        await wrapper.setProps({ isOpen: false })
        await nextFrame()

        expect(document.activeElement).toBe(opener)
        pressEscape()
        expect(onActionCanceled).not.toHaveBeenCalled()
    })

    it('закрыта и открыта снова до кадра: один держатель фокуса', async () => {
        const onActionCanceled = vi.fn()
        const wrapper = mountModal(false, onActionCanceled)
        await wrapper.setProps({ isOpen: true })
        await wrapper.setProps({ isOpen: false })
        await wrapper.setProps({ isOpen: true })
        await nextFrame()

        expect(document.activeElement).toBe(cancelButton(wrapper))
        pressEscape()
        expect(onActionCanceled).toHaveBeenCalledTimes(1)
    })

    // Так открывает модалку пункт меню: меню закрывается позже в том же
    // клике, и браузер возвращает фокус на кнопку меню. Сохранить нужно её,
    // а не пункт, на котором фокус был при рендере.
    it('сохраняет фокус, каким он стал к концу клика', async () => {
        const menuButton = document.createElement('button')
        menuButton.textContent = 'Меню'
        document.body.append(menuButton)

        try {
            const wrapper = mountModal(false)
            await wrapper.setProps({ isOpen: true })
            menuButton.focus()
            await nextFrame()
            expect(document.activeElement).toBe(cancelButton(wrapper))
            await wrapper.setProps({ isOpen: false })

            expect(document.activeElement).toBe(menuButton)
        } finally {
            menuButton.remove()
        }
    })

    it('Escape: в закрытой — ни одного actionCanceled, в открытой — одно', async () => {
        const onActionCanceled = vi.fn()
        const wrapper = mountModal(false, onActionCanceled)
        await nextFrame()
        pressEscape()
        expect(onActionCanceled).not.toHaveBeenCalled()

        await wrapper.setProps({ isOpen: true })
        await nextFrame()
        pressEscape()
        expect(onActionCanceled).toHaveBeenCalledTimes(1)
    })

    it('после закрытия фокус на кнопке, которая была в фокусе до открытия', async () => {
        const wrapper = mountModal(false)
        await wrapper.setProps({ isOpen: true })
        await nextFrame()
        expect(document.activeElement).toBe(cancelButton(wrapper))
        await wrapper.setProps({ isOpen: false })

        expect(document.activeElement).toBe(opener)
    })

    it('размонтирована открытой: Escape событий не даёт, фокус на прежней кнопке', async () => {
        const onActionCanceled = vi.fn()
        const wrapper = mountModal(true, onActionCanceled)
        await nextFrame()
        expect(document.activeElement).toBe(cancelButton(wrapper))
        wrapper.unmount()

        pressEscape()
        expect(onActionCanceled).not.toHaveBeenCalled()
        expect(document.activeElement).toBe(opener)
    })

    // Уход со страницы сразу после открытия: кадр не наступил, модалки уже
    // нет. Кадр без отмены упал бы на панели, которой больше нет.
    it('размонтирована до кадра: фокус не тронут, Escape событий не даёт', async () => {
        const onActionCanceled = vi.fn()
        const wrapper = mountModal(true, onActionCanceled)
        wrapper.unmount()
        await nextFrame()

        expect(document.activeElement).toBe(opener)
        pressEscape()
        expect(onActionCanceled).not.toHaveBeenCalled()
    })

    // Подтверждение удалило строку вместе с кнопкой, с которой открыли модалку.
    it('кнопки, с которой открыли, уже нет: закрытие без ошибок, фокус не на ней', async () => {
        const errors = []
        const wrapper = mount(ConfirmationModal, {
            props: { isOpen: false, actionButtonText: 'Удалить' },
            attachTo: document.body,
            global: { config: { errorHandler: (error) => errors.push(error) } },
        })
        await wrapper.setProps({ isOpen: true })
        await nextFrame()
        opener.remove()
        await wrapper.setProps({ isOpen: false })

        expect(errors).toEqual([])
        expect(document.activeElement).not.toBe(opener)
    })
})
```

10 новых тестов; в файле их станет 12.

- [ ] **Step 2: Тесты падают**

```bash
W=.superpowers/sdd/2026-10-16-confirmation-modal-focus
npm test -- --dir tests ConfirmationModal --reporter=verbose > $W/t2-red.log 2>&1; echo "tests exit $?"
grep -E "^ +(✓|×)" $W/t2-red.log
```

Expected: `tests exit 1`. Падают 7: «открыта: до кадра…», «смонтирована открытой…», «закрыта и открыта снова до кадра…», «сохраняет фокус, каким он стал к концу клика», «Escape: в закрытой — ни одного actionCanceled, в открытой — одно», «после закрытия фокус на кнопке…», «размонтирована открытой…». Проходят 5: два прежних и три стража, которые закрепляют, чего модалка делать не должна, — «закрыта до кадра…», «размонтирована до кадра…», «кнопки, с которой открыли, уже нет…». Другой список — сверить, откуда разница, и записать решение в журнал.

- [ ] **Step 3: `Modal.vue`**

В шаблоне — `ref="panel"` на блоке диалога. Было:

```html
                <div
                    v-show="isOpen"
                    class="bb:relative bb:inline-block bb:align-middle bb:my-8 bb:max-w-lg bb:w-full bb:bg-white bb:rounded-lg bb:text-left bb:overflow-visible bb:shadow-xl bb:transition-all"
                    role="dialog"
```

Стало:

```html
                <div
                    v-show="isOpen"
                    ref="panel"
                    class="bb:relative bb:inline-block bb:align-middle bb:my-8 bb:max-w-lg bb:w-full bb:bg-white bb:rounded-lg bb:text-left bb:overflow-visible bb:shadow-xl bb:transition-all"
                    role="dialog"
```

`<script>` целиком:

```html
<script>
import { holdDialogFocus } from "../dialogFocus.js";

export default {
    // escape — Escape в открытой модалке. Внутреннее событие:
    // ConfirmationModal превращает его в actionCanceled.
    emits: ["escape"],

    props: {
        isOpen: {
            type: Boolean,
            default: false,
        },
        // id заголовка, который подписывает диалог. Заголовок рисует тот, кто
        // кладёт содержимое в слот, поэтому id приходит оттуда же.
        headingId: {
            type: String,
            required: true,
        },
    },

    watch: {
        // Открытая модалка держит фокус (holdDialogFocus), закрытая отпускает.
        // Фокус захватывается в следующем кадре, а не сразу: модалку часто
        // открывает пункт меню, а меню закрывается позже в том же клике, и
        // браузер возвращает фокус на кнопку меню. Наблюдатель срабатывает
        // между слушателями этого клика и запомнил бы пункт, который сейчас
        // спрячется; кадр наступает после всего клика.
        isOpen: {
            flush: "post",
            handler(isOpen) {
                if (isOpen) {
                    this.holdFocus();
                    return;
                }

                this.releaseFocus();
            },
        },
    },

    created() {
        // Кадр, в котором модалка захватит фокус, пока он не наступил.
        this.focusFrame = null;
        // Снимает слушатель клавиш и возвращает фокус, пока модалка его держит.
        this.releaseHeldFocus = null;
    },

    mounted() {
        if (this.isOpen) {
            this.holdFocus();
        }
    },

    beforeUnmount() {
        this.releaseFocus();
    },

    methods: {
        // Не больше одного кадра и одного держателя: повторное открытие без
        // закрытия ничего не делает.
        holdFocus() {
            if (this.focusFrame !== null || this.releaseHeldFocus !== null) {
                return;
            }

            this.focusFrame = requestAnimationFrame(() => {
                this.focusFrame = null;
                this.releaseHeldFocus = holdDialogFocus(this.$refs.panel, () => this.$emit("escape"));
            });
        },

        // Закрытие до кадра отменяет кадр: фокус ещё не захвачен.
        releaseFocus() {
            if (this.focusFrame !== null) {
                cancelAnimationFrame(this.focusFrame);
                this.focusFrame = null;
            }

            if (this.releaseHeldFocus !== null) {
                this.releaseHeldFocus();
                this.releaseHeldFocus = null;
            }
        },
    },
};
</script>
```

Комментарии корня и панели в шаблоне не меняются. `document`, `requestAnimationFrame` трогаются только в `mounted`, наблюдателе и `beforeUnmount` — при SSR они не выполняются.

- [ ] **Step 4: `ConfirmationModal.vue`**

Строка 2. Было:

```html
    <modal :is-open="isOpen" :heading-id="headingId">
```

Стало:

```html
    <!-- Escape в открытой модалке — то же, что кнопка отмены. -->
    <modal :is-open="isOpen" :heading-id="headingId" @escape="$emit('actionCanceled')">
```

Кнопка отмены. Было:

```html
            <button
                type="button"
                class="bb:inline-flex bb:justify-center bb:rounded-md bb:border bb:border-gray-300 bb:shadow-xs bb:px-4 bb:py-2 bb:bg-white bb:text-sm bb:font-medium bb:text-gray-700 bb:hover:bg-gray-50 bb:focus:outline-hidden bb:focus:ring-2 bb:focus:ring-offset-2 bb:focus:ring-indigo-500 bb:ml-3"
                @click.prevent="$emit('actionCanceled')"
            >
```

Стало:

```html
            <!-- Фокус открытой модалки — на отмене: Enter сразу после
                 открытия действие не выполнит. -->
            <button
                type="button"
                class="bb:inline-flex bb:justify-center bb:rounded-md bb:border bb:border-gray-300 bb:shadow-xs bb:px-4 bb:py-2 bb:bg-white bb:text-sm bb:font-medium bb:text-gray-700 bb:hover:bg-gray-50 bb:focus:outline-hidden bb:focus:ring-2 bb:focus:ring-offset-2 bb:focus:ring-indigo-500 bb:ml-3"
                data-dialog-focus
                @click.prevent="$emit('actionCanceled')"
            >
```

- [ ] **Step 5: Тесты проходят, весь набор**

```bash
W=.superpowers/sdd/2026-10-16-confirmation-modal-focus
npm test -- --dir tests ConfirmationModal --reporter=verbose > $W/t2-green.log 2>&1; echo "tests exit $?"
grep -E "Tests " $W/t2-green.log
npm test -- --dir tests --reporter=verbose > $W/t2-suite.log 2>&1; echo "suite exit $?"
grep -E "Test Files|Tests " $W/t2-suite.log
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t2-suite.log
```

Expected: `tests exit 0`, `Tests 12 passed (12)`; `suite exit 0`, `Test Files 43 passed (43)`, `Tests 807 passed (807)` (774 + 23 + 10), `0`. `tests/ssr.test.js`, `tests/hydration.test.js`, `tests/i18n.test.js`, `tests/exports.test.js` не менялись и зелёные.

- [ ] **Step 6: Кадр доказан**

Временно заменить в `holdFocus()` запрос кадра немедленным захватом — тело `holdFocus` после проверки:

```js
            this.releaseHeldFocus = holdDialogFocus(this.$refs.panel, () => this.$emit("escape"));
```

прогнать `npm test -- --dir tests ConfirmationModal > $W/t2-noframe.log 2>&1; echo "noframe exit $?"; grep -E "×" $W/t2-noframe.log`, затем вернуть версию Step 3 и прогнать снова.

Expected: `noframe exit 1`, среди падений — «сохраняет фокус, каким он стал к концу клика» и «открыта: до кадра фокус не тронут…»; после возврата — `Tests 12 passed (12)`. Без коммита: коммит — в Task 3.

---

### Task 3: README, Playground и `fix:`-коммит

**Files:**
- Modify: `README.md:398-400` (события `ConfirmationModal`), после `README.md:406` (новый абзац), `README.md:981-983` («Почему у ConfirmationModal нет v-model»), `README.md:1303-1306` (абзац-ограничение). Номера строк — до правок Task 3; правки ищутся по тексту «Было».
- Modify: `playground/App.vue:122` (ряд кнопок раздела `ConfirmationModal`), computed после `menuActions`

**Interfaces:**
- Consumes: поведение Task 1–2.
- Produces: коммит `fix:` — всё содержимое Task 1–3; сценарий Playground «меню → Удалить» для Task 4.

- [ ] **Step 1: README — события**

Было (строки 398–400):

```
События: `actionConfirmed` — по кнопке действия, `actionCanceled` — по кнопке
отмены. Ни одна из кнопок модалку не закрывает — см. раздел «Почему у
ConfirmationModal нет v-model».
```

Стало:

```
События: `actionConfirmed` — по кнопке действия, `actionCanceled` — по кнопке
отмены и по Escape. Ни одна из кнопок модалку не закрывает — см. раздел
«Почему у ConfirmationModal нет v-model».
```

- [ ] **Step 2: README — абзац о фокусе**

После абзаца, который кончается строкой «углы сами — верхний `rounded-t-lg`, нижний `rounded-b-lg`.» (строка 406), перед `### DropdownButtonWithAction` — пустая строка и абзац:

```
Открытая модалка держит фокус: в первом кадре после открытия он встаёт на
кнопку отмены, Tab и Shift+Tab ходят по её кнопкам по кругу, Escape —
`actionCanceled`, как кнопка отмены. После закрытия фокус возвращается туда,
где был до открытия, если страница не поставила его в другое место и тот
элемент ещё на странице. Кадр нужен модалкам, которые открывает пункт меню:
меню закрывается позже в том же клике и возвращает фокус на свою кнопку.
```

- [ ] **Step 3: README — «Почему у ConfirmationModal нет v-model»**

Было (строки 981–983):

```
никогда. Обе кнопки только сообщают родителю решение пользователя, а закрыть
модалку, оставить её открытой на время запроса или открыть следующую — решает
родитель.
```

Стало:

```
никогда. Обе кнопки и Escape только сообщают родителю решение пользователя,
а закрыть модалку, оставить её открытой на время запроса или открыть
следующую — решает родитель.
```

- [ ] **Step 4: README — ограничение удаляется**

Удалить последние строки файла — пустую строку 1303 и абзац 1304–1306:

```

`ConfirmationModal` не переносит фокус внутрь при открытии, не удерживает его
внутри, не возвращает на прежнее место после закрытия и не закрывается по
Escape.
```

Файл кончается строкой ``focus:ring-offset-2`.`` и переводом строки.

```bash
tail -n 2 README.md; grep -c 'не переносит фокус' README.md
```

Expected: последняя строка — ``focus:ring-offset-2`.``; `0`.

- [ ] **Step 5: Playground**

`playground/App.vue`, раздел `ConfirmationModal`. Было (строки 121–122):

```html
                <button type="button" class="demo-button" @click="warningModalIsOpen = true">Жёлтая</button>
                <button type="button" class="demo-button" @click="dangerousModalIsOpen = true">Красная</button>
```

Стало:

```html
                <button type="button" class="demo-button" @click="warningModalIsOpen = true">Жёлтая</button>
                <button type="button" class="demo-button" @click="dangerousModalIsOpen = true">Красная</button>
                <dropdown-button-with-action :actions="modalMenuActions"/>
```

В `computed`, сразу после `menuActions()` (кончается `];` и `},` после пункта `{ label: 'Удалить', color: 'red', onSelect: this.countSelection },`), добавить:

```js

        // Как строка списка payments: пункт меню открывает красную модалку.
        // По нему видно, где фокус после выбора пункта и после закрытия.
        modalMenuActions() {
            return [
                { label: 'Редактировать', href: '#edit' },
                { label: 'Удалить', color: 'red', onSelect: () => { this.dangerousModalIsOpen = true; } },
            ];
        },
```

- [ ] **Step 6: Набор, сборка, сборка Playground**

```bash
W=.superpowers/sdd/2026-10-16-confirmation-modal-focus
npm test -- --dir tests --reporter=verbose > $W/t3-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests " $W/t3-suite.log
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t3-suite.log
npm run build > $W/t3-build.log 2>&1; echo "build exit $?"
grep -E "built in|rror" $W/t3-build.log
grep -c 'data-dialog-focus' dist/index.js
npx vite build --config vite.playground.config.js --outDir "$W/playground-check" --emptyOutDir --base ./ > $W/t3-playground.log 2>&1; echo "playground exit $?"
grep -E "built in|rror" $W/t3-playground.log
```

Expected: `tests exit 0`, `Test Files 43 passed (43)`, `Tests 807 passed (807)`, `0`; `build exit 0`, `✓ built in …`, не `0`; `playground exit 0`, `✓ built in …`.

- [ ] **Step 7: Коммит**

```bash
git add src/dialogFocus.js tests/dialogFocus.test.js src/components/Modal.vue src/components/ConfirmationModal.vue tests/ConfirmationModal.test.js README.md playground/App.vue
git status -s
git commit -m "fix: держать фокус в ConfirmationModal и возвращать его после закрытия"
git status -s
```

Expected: до коммита — ровно эти 7 файлов (`A` или `M`); после — `git status -s` пуст.

---

### Task 4: Приёмка в браузере

**Files:** нет. Временно: `~/Code/mars/certificates/src/public/build/ui-playground/`, playwright-core в scratchpad сессии.

**Interfaces:**
- Consumes: коммит Task 3.
- Produces: записи приёмки в `$W/acceptance.md`.

- [ ] **Step 1: Выложить Playground**

```bash
W=.superpowers/sdd/2026-10-16-confirmation-modal-focus
npm run build > $W/t4-build.log 2>&1 && npx vite build --config vite.playground.config.js --outDir ~/Code/mars/certificates/src/public/build/ui-playground --emptyOutDir --base ./ > $W/t4-playground.log 2>&1; echo "exit $?"
for p in index.html host.html; do curl -sk -o /dev/null -w "$p %{http_code}\n" https://certificates.test/build/ui-playground/$p; done
```

Expected: `exit 0`, `index.html 200`, `host.html 200`. Сборка certificates стирает папку: при `404` перед любым шагом — выложить заново.

- [ ] **Step 2: Chrome**

chrome-devtools: новая вкладка https://certificates.test/build/ui-playground/index.html, `resize_page` 1280×900. Состояние после каждого действия — `evaluate_script` с функцией:

```js
() => {
    const describe = (element) => {
        if (element === null) return 'null'
        if (element === document.body) return 'body'
        return (element.textContent.trim() || element.tagName) + (element.hasAttribute('popovertarget') ? ' [стрелка меню]' : '')
    }
    const dialog = [...document.querySelectorAll('[role="dialog"]')].find((element) => element.checkVisibility())
    return {
        active: describe(document.activeElement),
        open: dialog === undefined ? null : document.getElementById(dialog.getAttribute('aria-labelledby')).textContent.trim(),
        inDialog: dialog !== undefined && dialog.contains(document.activeElement),
        menuOpen: document.querySelector('[popover]:popover-open') !== null,
        counters: [...document.querySelectorAll('p')].map((p) => p.textContent.trim()).find((text) => text.startsWith('Подтверждений:')),
    }
}
```

Фокус на стрелку меню раздела `ConfirmationModal` — `evaluate_script`:

```js
() => {
    const section = [...document.querySelectorAll('section')].find((element) => element.querySelector('h2')?.textContent.trim() === 'ConfirmationModal')
    section.querySelector('[popovertarget]').focus()
    return document.activeElement.textContent.trim()
}
```

Клавиши — `press_key` (настоящие события). Шаги и ожидания (спека §11):

1. Фокус на стрелку; Enter; ArrowDown; Enter → `open: "Удаление администратора"`, `active: "Отмена"`, `menuOpen: false`.
2. Enter → `open: null`, отмен +1, `active` — стрелка меню.
3. Снова шаг 1. Tab → `«Удалить»`, Tab → `«Отмена»`, Shift+Tab → `«Удалить»`; затем ещё шесть Tab — после каждого `inDialog: true`.
4. Escape → `open: null`, отмен +1, `active` — стрелка меню.
5. Мышь: `take_snapshot`, `click` по стрелке меню, `click` по пункту «Удалить» → `active: "Отмена"`. Вместо клика по затемнению — `evaluate_script` `() => { document.activeElement.blur(); return document.activeElement === document.body }` (chrome-devtools не кликает по координатам; сам клик по затемнению — в WebKit, Step 3); Tab → `active: "Удалить"`, `inDialog: true`; Escape.
6. `click` по «Жёлтая» → `open: "Начать отправку?"`, `active: "Отмена"`; Escape → `open: null`, `active: "Жёлтая"`. То же для «Красная» → `active: "Красная"` после Escape.
7. `list_console_messages` — ни ошибок, ни предупреждений.

Каждый шаг с результатом — строка в `$W/acceptance.md`.

- [ ] **Step 3: WebKit**

```bash
PW=/private/tmp/claude-501/-Users-boobooking-Code-payments/e46997f9-ecd3-4d8f-a828-68861d93a783/scratchpad/pw
mkdir -p "$PW" && npm install --prefix "$PW" playwright-core@1.63.0 > "$PW/install.log" 2>&1; echo "install exit $?"
```

Expected: `install exit 0`. Браузер — кэш `~/Library/Caches/ms-playwright/webkit-2359`. Если песочница оболочки не даёт запустить WebKit — тот же запуск вне песочницы.

`$PW/webkit-acceptance.mjs`:

```js
import { webkit } from 'playwright-core'

const browser = await webkit.launch()
const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 } })
const problems = []
page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) problems.push(`${message.type()}: ${message.text()}`)
})
page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
await page.goto('https://certificates.test/build/ui-playground/index.html')

const state = () => page.evaluate(() => {
    const dialog = [...document.querySelectorAll('[role="dialog"]')].find((element) => element.checkVisibility())
    const active = document.activeElement
    return {
        active: active === document.body ? 'body' : active.textContent.trim(),
        open: dialog !== undefined,
        inDialog: dialog !== undefined && dialog.contains(active),
        counters: [...document.querySelectorAll('p')].map((p) => p.textContent.trim()).find((text) => text.startsWith('Подтверждений:')),
    }
})
const frames = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
const lines = []
const expectState = async (name, check) => {
    const current = await state()
    lines.push(`${check === null ? 'INFO' : (check(current) ? 'PASS' : 'FAIL')} ${name} ${JSON.stringify(current)}`)
}

const section = page.locator('section').filter({ has: page.locator('h2', { hasText: /^ConfirmationModal$/ }) })
const scenarios = [
    {
        name: 'меню → Удалить',
        action: 'Удалить',
        open: async () => {
            await section.locator('[popovertarget]').click()
            await section.getByRole('menuitem', { name: 'Удалить' }).click()
        },
    },
    { name: 'Жёлтая', action: 'Начать отправку', open: () => section.getByRole('button', { name: 'Жёлтая' }).click() },
    { name: 'Красная', action: 'Удалить', open: () => section.getByRole('button', { name: 'Красная' }).click() },
]

for (const scenario of scenarios) {
    await scenario.open()
    await frames()
    await expectState(`${scenario.name}: открыта, фокус на «Отмена»`, (s) => s.open && s.active === 'Отмена')

    const tabs = [scenario.action, 'Отмена', scenario.action, 'Отмена', scenario.action, 'Отмена']
    for (const [index, want] of tabs.entries()) {
        await page.keyboard.press('Tab')
        await expectState(`${scenario.name}: Tab ${index + 1} → «${want}»`, (s) => s.inDialog && s.active === want)
    }
    await page.keyboard.press('Shift+Tab')
    await expectState(`${scenario.name}: Shift+Tab → «${scenario.action}»`, (s) => s.inDialog && s.active === scenario.action)
    await page.keyboard.press('Shift+Tab')
    await expectState(`${scenario.name}: Shift+Tab → «Отмена»`, (s) => s.inDialog && s.active === 'Отмена')

    await page.keyboard.press('Enter')
    await frames()
    await expectState(`${scenario.name}: Enter на «Отмена» — закрыта`, (s) => !s.open)
    await expectState(`${scenario.name}: фокус после закрытия`, null)

    await scenario.open()
    await frames()
    await page.keyboard.press('Escape')
    await frames()
    await expectState(`${scenario.name}: Escape — закрыта`, (s) => !s.open)

    await scenario.open()
    await frames()
    await page.mouse.click(10, 10)
    await expectState(`${scenario.name}: клик по затемнению`, null)
    await page.keyboard.press('Tab')
    await expectState(`${scenario.name}: Tab после клика по затемнению — первая кнопка`, (s) => s.inDialog && s.active === scenario.action)
    await page.keyboard.press('Escape')
    await frames()
    await expectState(`${scenario.name}: Escape — закрыта`, (s) => !s.open)
}

console.log(lines.join('\n'))
console.log(`counters: ${(await state()).counters}`)
console.log(`problems: ${problems.length === 0 ? 'none' : problems.join(' | ')}`)
await browser.close()
```

```bash
node "$PW/webkit-acceptance.mjs" > "$PW/webkit.log" 2>&1; echo "webkit exit $?"
grep -c '^FAIL' "$PW/webkit.log"; grep -E '^(INFO|counters|problems)' "$PW/webkit.log"
```

Expected: `webkit exit 0`, `0` строк `FAIL`; `counters: Подтверждений: N, отмен: M+9` относительно начала (по три отмены на сценарий); `problems: none`. Строки `INFO` — фокус после закрытия и после клика по затемнению: в WebKit клик фокус на кнопку не ставит, поэтому после закрытия ожидается `body` (возвращать некуда); записать как есть. Лог и итог — в `$W/acceptance.md`.

Расхождение с ожиданием — остановиться: это отличие от спеки, его согласовывают до правок.

---

### Task 5: Итоговое ревью

**Files:** изменяются только файлы, которых касаются исправления.

**Interfaces:**
- Consumes: коммиты Task 3 (и исправлений).
- Produces: ветка без замечаний; каждое исправление — отдельный коммит с тестом.

- [ ] **Step 1: Пакет ревью**

```bash
W=.superpowers/sdd/2026-10-16-confirmation-modal-focus
BASE=$(cat "$W/base-sha")
git log --oneline $BASE..HEAD
```

Пакет — скриптом superpowers `subagent-driven-development/scripts/review-package docs/superpowers/plans/2026-10-16-confirmation-modal-focus.md $BASE HEAD`.

- [ ] **Step 2: Ревьюер**

Свежий ревьюер на самой сильной доступной модели (модель указывается явно) по `superpowers:requesting-code-review` (`code-reviewer.md`): пакет ревью, спека, этот план, раздел Review Focus дословно, `$W/acceptance.md`, решения из журнала исполнения (строки `Ruling:`). Тесты ревьюер запускает только `npm test -- --dir tests`.

- [ ] **Step 3: Разбор и исправления**

Каждое замечание переоценивается по тому, что получит человек, если выпуск выйдет как есть. Замечания всех уровней, включая Minor, — исправления, каждое отдельно: тест, который сначала падает (документы — без теста); исправление; весь набор:

```bash
W=.superpowers/sdd/2026-10-16-confirmation-modal-focus
npm test -- --dir tests --reporter=verbose > $W/t5-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests " $W/t5-suite.log
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t5-suite.log
```

Expected: `tests exit 0`, всё passed, `0`. Коммит `fix:` на каждое исправление. Исправление, меняющее поведение в браузере, — повторить затронутые шаги Task 4. Замечание, которое нельзя исправить без отхода от спеки, — согласовать до правки.

---

### Task 6: Версия `0.17.1`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Поднять версию**

Run: `npm version 0.17.1 --no-git-tag-version && git diff | grep -E "^[-+].*version"`
Expected: три строки `0.17.0` → `0.17.1`: одна в `package.json`, две в `package-lock.json`.

- [ ] **Step 2: Финальная проверка**

```bash
W=.superpowers/sdd/2026-10-16-confirmation-modal-focus
npm test -- --dir tests --reporter=verbose > $W/t6-suite.log 2>&1; echo "tests exit $?"
grep -E "Test Files|Tests " $W/t6-suite.log
grep -cE '\[Vue warn\]|stderr \||\(node:[0-9]+\)|Warning: |Unhandled' $W/t6-suite.log
npm run build > $W/t6-build.log 2>&1; echo "build exit $?"
grep -E "built in|rror" $W/t6-build.log
```

Expected: `tests exit 0`, всё passed (807, если в Task 5 не прибавилось), `0`, `build exit 0`, `✓ built in …`.

- [ ] **Step 3: Коммит**

```bash
git add package.json package-lock.json
git commit -m "chore: поднять версию пакета до 0.17.1"
git status -s
```

Expected: `git status -s` пуст.

---

### Task 7: Публикация — после согласия владельца

- [ ] **Step 1: Согласие**

Остановиться и спросить владельца: публикуется `0.17.1` — пуш `main` и тега `v0.17.1`, коммиты `$(cat $W/base-sha)..HEAD`. Без явного согласия дальше не идти.

- [ ] **Step 2: `main` и `Test`**

```bash
git fetch origin && git status -sb | head -n 1
```

Expected: `## main...origin/main [ahead N]` — только впереди, не позади. Позади — остановиться и сообщить владельцу.

Запуск workflow появляется не сразу после пуша, поэтому он выбирается по полному SHA версионного коммита, а не последним в списке.

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

Expected: номер запуска не пуст; `test exit 0` — оба джоба, `test` и `vue-floor`, успешны. Если оболочка не даёт `sleep` в переднем плане — тот же цикл в фоне или через Monitor. Пустой номер после двух минут или `test exit` не `0` — остановиться и сообщить владельцу, тег не ставить.

- [ ] **Step 3: Тег и публикация**

```bash
git tag v0.17.1 "$SHA" && git push origin v0.17.1
for attempt in $(seq 1 24); do
    PUBLISH_ID=$(gh run list --workflow Publish --commit "$SHA" --json databaseId --jq '.[0].databaseId')
    [ -n "$PUBLISH_ID" ] && break
    sleep 5
done
echo "Publish run: $PUBLISH_ID"
gh run watch "$PUBLISH_ID" --exit-status; echo "publish exit $?"
npm view @boobooking/dashboard-ui-components@0.17.1 version
npm view @boobooking/dashboard-ui-components dist-tags.latest
```

Expected: номер не пуст; `publish exit 0`; `0.17.1` и `0.17.1`.

---

### Task 8: payments, cashback и certificates на `^0.17.1`

Для каждого проекта — по очереди, со своими командами:

| Проект | Каталог | Тесты | Сообщение коммита |
| --- | --- | --- | --- |
| payments | `/Users/boobooking/Code/payments` | `docker exec -w /var/www payments-backend php artisan test` | `chore: update dashboard-ui-components to 0.17.1` |
| cashback | `/Users/boobooking/Code/mars/cashback` | `docker exec -e HOME=/tmp cashback-backend sh -lc 'cd /var/www && ./vendor/bin/pest'` | `chore: обновить пакет компонентов дашборда до 0.17.1` |
| certificates | `/Users/boobooking/Code/mars/certificates/src` | `docker exec certificates-backend php artisan test` | `chore: обновить пакет компонентов дашборда до 0.17.1` |

**Files (в каждом):** `package.json`, `package-lock.json`.

- [ ] **Step 1: Чистое дерево и база тестов**

```bash
cd <каталог> && git status -s && git log --oneline -1
<тесты> > $W/t8-<проект>-before.log 2>&1; echo "before exit $?"; grep -E "Tests:" $W/t8-<проект>-before.log
```

где `W=/Users/boobooking/Code/dashboard-ui-components/.superpowers/sdd/2026-10-16-confirmation-modal-focus`. Expected: `git status -s` пуст (иначе проект не трогается — вопрос владельцу); `before exit 0`, строка `Tests:` — база.

- [ ] **Step 2: Обновление**

```bash
npm install @boobooking/dashboard-ui-components@^0.17.1 > $W/t8-<проект>-install.log 2>&1; echo "install exit $?"
grep '"@boobooking/dashboard-ui-components"' package.json
node -p "require('./node_modules/@boobooking/dashboard-ui-components/package.json').version"
git diff --stat
git diff package-lock.json
```

Expected: `install exit 0`; `"^0.17.1"`; `0.17.1`; меняются только `package.json` и `package-lock.json`, в lock-файле — только записи `@boobooking/dashboard-ui-components` (диапазон, `version`, `resolved`, `integrity`).

- [ ] **Step 3: Сборка и тесты**

```bash
npm run build > $W/t8-<проект>-build.log 2>&1; echo "build exit $?"
grep -E "built in|rror" $W/t8-<проект>-build.log
grep -l 'data-dialog-focus' public/build/assets/*.js
<тесты> > $W/t8-<проект>-after.log 2>&1; echo "after exit $?"; grep -E "Tests:" $W/t8-<проект>-after.log
git status -s
```

Expected: `build exit 0`, `✓ built in …`; хотя бы один файл с `data-dialog-focus`; `after exit 0` и та же строка `Tests:`, что в Step 1; `git status -s` — только `package.json` и `package-lock.json`.

- [ ] **Step 4: Коммит**

```bash
git add package.json package-lock.json
git commit -m "<сообщение коммита>"
git status -s && git log --oneline -1
```

Expected: `git status -s` пуст. Пушит владелец.

---

### Task 9: Уборка и отчёт

- [ ] **Step 1: Временные файлы**

```bash
rm -rf /Users/boobooking/Code/dashboard-ui-components/.superpowers/sdd/focus-repro /Users/boobooking/Code/payments/public/build/focus-repro
ls -d /Users/boobooking/Code/dashboard-ui-components/.superpowers/sdd/focus-repro /Users/boobooking/Code/payments/public/build/focus-repro 2>&1
git -C /Users/boobooking/Code/dashboard-ui-components status -s
```

Expected: обоих каталогов нет; `git status -s` библиотеки пуст. Вкладки chrome-devtools приёмки и воспроизведения закрыть.

- [ ] **Step 2: Отчёт**

Сообщение Codex о конце реализации (что сделано и проверено, согласованные отличия, что не проверялось), затем отчёт владельцу: SHA коммитов библиотеки, строки тестов, приёмка Chrome и WebKit, запуски `Test` и `Publish`, `npm view`, коммиты трёх проектов (их пушит владелец), решения из журнала. Каталог `$W` удалить после отчёта.

---

## Отличия от спеки

- Тесты запускаются с `--dir tests`: в `.codex-advisor/` лежат копии исходников и тестов ревьюера, и голый `npm test` подхватывает их (Global Constraints). На CI папки нет.
- В Task 1 добавлена строка «Tab с body — на первый» (Review Focus: клик по затемнению оставляет фокус на `body`).
- В Task 2 добавлены три теста из Review Focus: «закрыта и открыта снова до кадра», «размонтирована до кадра», «кнопки, с которой открыли, уже нет». Два последних и «закрыта до кадра» проходят и до реализации — это стражи того, чего модалка делать не должна; они перечислены в Task 2, Step 2.
- В Task 1, Step 6 и Task 2, Step 6 — временные поломки, доказывающие, что тесты ловят слушатель на всплытии и захват без кадра.
- В Chrome клик по затемнению заменён `blur()`: chrome-devtools не кликает по координатам; настоящий клик по затемнению — в WebKit.
