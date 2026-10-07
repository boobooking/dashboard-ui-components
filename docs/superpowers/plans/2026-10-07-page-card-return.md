# PageCard: возврат туда, откуда открыли — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `PageCard` закрывается крестиком и `close()` ровно на адрес
страницы, с которой его открыли (или на `fallback-url`), без истории
браузера, хранилищ и адреса страницы; выпуск `0.13.0`.

**Architecture:** Чистый модуль `src/windows.js` ведёт окна по правилам
1–5 спеки. Плагин `dashboardUi` следит за `currentUrl()` синхронно
и записывает каждый показ страницы в модуль. `PageCard` назначает себе
окно при монтировании и при смене ключа после отрисовки, рисует крестик
по цели окна и закрывается через `navigate` плагина.

**Tech Stack:** Vue 3.5 (Options API), Vite 8, Vitest 5 + happy-dom,
@vue/test-utils, Tailwind 4 с префиксом `bb`, `@inertiajs/vue3` 3.6.1
только в `devDependencies` для интеграционных тестов.

**Spec:** `docs/superpowers/specs/2026-10-07-page-card-return-design.md`
(в этом репозитории). Перевод certificates — отдельный план
`/Users/boobooking/Code/mars/certificates/src/docs/superpowers/plans/2026-10-07-page-card-return.md`.

## Global Constraints

- Репозиторий — `/Users/boobooking/Code/dashboard-ui-components`, ветка
  `main`. Ветку не переключать и не заводить. Коммиты — conventional,
  на русском, в повелительном наклонении; `--no-verify` не использовать.
  Пуш, тег и публикация — только после явного «да» владельца (Task 6).
- `peerDependencies` — только `"vue": "^3.5.0"`. Inertia не попадает ни
  в `dependencies`, ни в `peerDependencies`, ни в `dist`.
- К `window`, `document`, `location` — только в `mounted()`,
  `beforeUnmount()`, обработчиках событий и наблюдателях, которые
  срабатывают после монтирования; в плагине — только под проверкой
  `typeof window !== 'undefined'`. Загрузка модулей, `data()`,
  `computed`, рендер работают без браузера (`tests/ssr.test.js`).
- Каждый класс в разметке компонентов — с префиксом `bb:`; `:class` —
  только литералы (объект со строковыми ключами, тернарный оператор,
  массив, строка) — так требует `tests/utilityPrefix.test.js`.
  Единственное новое исключение — `$attrs.class` (Task 3, Step 1).
- Тесты: в каждом случае предупреждения и ошибки Vue собираются
  и сравниваются с `[]`, кроме случаев, где тест ждёт конкретное
  предупреждение. Вывод `npm test` — без лишних предупреждений.
- Комментарии — на русском, evergreen, в стиле соседнего кода; файл
  компонента пишет строки в двойных кавычках и с `;`, модули `src/*.js`
  и тесты — в одинарных и без `;`.
- Ширины `PageCard`: `"xl"` (по умолчанию, `sm:max-w-xl`, крестик
  снаружи от `md`), `"4xl"` (`sm:max-w-4xl`, от `lg`), `"7xl"`
  (`sm:max-w-7xl`, от `2xl`). `--bb-closer-space` — `3.5rem` ниже порога
  при видимом крестике, `0px` от порога и без крестика.
- Тексты: предупреждение смены ключа —
  `PageCard: ключ окна сменился на «<новый>» без смены страницы — карточка остаётся в окне «<прежний>»`;
  ошибка опции — `dashboardUi: currentUrl должен быть функцией () => адрес страницы`.

## Review Focus

1. **Двойной клик по крестику.** Каждый клик зовёт `navigate` с той же
   целью, ничего не ломается. Тест — Task 3, Step 2
   («двойной клик…»).
2. **`currentUrl()` с origin или hash.** Абсолютный адрес и адрес
   с `#…` приводятся к пути с query; смена одного hash — не новый показ.
   Тесты — Task 1, Step 1 (`normalizeAddress`) и Task 2, Step 1.
3. **`window-key=""`.** Пустая строка — как не заданный ключ: ключ — путь
   страницы. Тест — Task 3, Step 2 («window-key="" …»).
4. **«Вперёд» в карточку после ухода «Назад».** Новая цепочка от
   страницы, с которой пришли. Тест — Task 1, Step 1 («вперёд в
   карточку…»).
5. **`fallback-url` меняется, пока карточка на экране.** Крестик ведёт на
   новый адрес, окно закрывается по новому адресу. Тесты — Task 1,
   Step 1 («setFallback…») и Task 3, Step 2 («смена fallback-url…»).

## Файлы

- Create: `src/windows.js` — модуль окон (Task 1).
- Create: `tests/windows.test.js` (Task 1).
- Modify: `src/plugin.js` — опция `currentUrl`, состояние окон (Task 2).
- Modify: `tests/plugin.test.js`, `tests/ssr.test.js` (Task 2, 3).
- Modify: `src/components/PageCard.vue` (Task 3).
- Modify: `tests/PageCard.test.js` (переписывается), `tests/hydration.test.js`,
  `tests/ssrFixtures.js`, `tests/utilityPrefix.test.js` (Task 3).
- Create: `tests/inertia/harness.js`, `tests/inertia/flows.test.js`,
  `tests/inertia/cold-fallback.test.js`, `tests/inertia/cold-bare.test.js` (Task 4).
- Modify: `package.json`, `package-lock.json` — `@inertiajs/vue3`
  в `devDependencies` (Task 4), версия `0.13.0` (Task 6).
- Modify: `playground/App.vue`, `playground/host.js`, `playground/bare.js`,
  `README.md` (Task 5).

**Отступление от спеки (решение плана).** Спека, §6, говорит, что
`tests/ssr.test.js` и `tests/hydration.test.js` проверяют новую фикстуру
«без изменений самих тестов». В них есть блоки именно про `PageCard`
и историю вкладки («на сервере крестика нет…», «гидратация PageCard при
истории вкладки»): с `fallback-url` в фикстуре и без истории они
становятся ложными. Task 3 переписывает эти два блока; общий цикл по
фикстурам не меняется. Интеграционные сценарии спеки §6 лежат не
в одном `tests/inertia.test.js`, а в каталоге `tests/inertia/`: холодное
открытие требует свежего приложения Inertia, а роутер Inertia — синглтон
модуля, поэтому холодные сценарии — отдельные файлы (vitest изолирует
файлы).

---

### Task 1: Модуль окон

**Files:**
- Create: `src/windows.js`
- Test: `tests/windows.test.js`

**Interfaces:**
- Produces (для Task 2 и 3):
  - `normalizeAddress(value, origin) → string | null` — путь + query;
    `null`, `undefined`, `''` → `null`;
  - `pathOf(address) → string | null` — путь без query;
  - `createWindows() → state`;
  - `pageShown(state, address) → number` — номер нового перехода;
  - `assign(state, card, key, fallbackAddress) → window`;
  - `sync(state, card, key, fallbackAddress) → { window, rejected, key }`
    (`key` — принятый ключ карточки после вызова);
  - `release(state, card)`;
  - `setFallback(state, card, fallbackAddress)`;
  - `windowOf(state, card) → window | null`;
  - окно — `{ id, key, parent, returnAddress, fallbackAddress }`.

- [ ] **Step 1: Write the failing test**

`tests/windows.test.js`:

```js
import { describe, expect, it } from 'vitest'
import {
    assign,
    createWindows,
    normalizeAddress,
    pageShown,
    pathOf,
    release,
    setFallback,
    sync,
    windowOf,
} from '../src/windows.js'

// Шаги — в том порядке, в каком их видит модуль в Inertia: сначала показ
// страницы (плагин записывает переход до отрисовки), затем Vue
// размонтирует старую карточку и монтирует новую. sync — проверка
// карточки после отрисовки.
function play(steps) {
    const state = createWindows()
    const cards = {}
    const results = []

    for (const step of steps) {
        if (step.show !== undefined) {
            pageShown(state, step.show)
        }
        if (step.unmount !== undefined) {
            release(state, cards[step.unmount])
        }
        if (step.mount !== undefined) {
            cards[step.mount] = { name: step.mount }
            results.push(assign(state, cards[step.mount], step.key, step.fallback ?? null))
        }
        if (step.sync !== undefined) {
            results.push(sync(state, cards[step.sync], step.key, step.fallback ?? null))
        }
    }

    return { state, cards, results }
}

// Цепочка открытых окон снизу вверх: [ключ, адрес возврата].
const chain = (state) => state.windows.map((item) => [item.key, item.returnAddress])

const toGroup = [
    { show: '/groups?status=sending' },
    { show: '/groups/A/orders', mount: 'group', key: 'group:A', fallback: '/groups' },
]
const toForm = [
    ...toGroup,
    { show: '/groups/A/certificates?vendor=X', sync: 'group', key: 'group:A', fallback: '/groups' },
    { show: '/groups/A/keys', unmount: 'group', mount: 'form', key: '/groups/A/keys', fallback: '/groups/A/certificates' },
]

describe('normalizeAddress и pathOf', () => {
    const cases = [
        { value: '/groups?status=sending', expected: '/groups?status=sending' },
        { value: 'https://example.test/groups/A/certificates', expected: '/groups/A/certificates' },
        { value: '/x?a=1#top', expected: '/x?a=1' },
        { value: null, expected: null },
        { value: undefined, expected: null },
        { value: '', expected: null },
    ]

    for (const testCase of cases) {
        it(`normalizeAddress(${JSON.stringify(testCase.value)})`, () => {
            expect(normalizeAddress(testCase.value, 'https://example.test')).toBe(testCase.expected)
        })
    }

    it('pathOf отбрасывает query', () => {
        expect(pathOf('/users/1/edit?tab=a')).toBe('/users/1/edit')
        expect(pathOf(null)).toBe(null)
    })
})

describe('окна: правила назначения', () => {
    it('открытие со списка — корневое окно с адресом списка (правило 5)', () => {
        const { state } = play(toGroup)

        expect(chain(state)).toEqual([['group:A', '/groups?status=sending']])
    })

    it('смена таба с тем же ключом окно не меняет', () => {
        const { state, results } = play([
            ...toGroup,
            { show: '/groups/A/certificates?vendor=X', sync: 'group', key: 'group:A', fallback: '/groups' },
        ])

        expect(results[1].rejected).toBe(false)
        expect(results[1].window).toBe(results[0])
        expect(chain(state)).toEqual([['group:A', '/groups?status=sending']])
    })

    it('форма с таба — вложенное окно с адресом таба (правило 4)', () => {
        const { state } = play(toForm)

        expect(chain(state)).toEqual([
            ['group:A', '/groups?status=sending'],
            ['/groups/A/keys', '/groups/A/certificates?vendor=X'],
        ])
    })

    it('приход на адрес формы закрывает её, таб продолжает окно группы (правила 2, 3)', () => {
        const { state, results } = play([
            ...toForm,
            { show: '/groups/A/certificates?vendor=X', unmount: 'form', mount: 'group2', key: 'group:A', fallback: '/groups' },
        ])

        expect(results.at(-1)).toBe(results[0])
        expect(chain(state)).toEqual([['group:A', '/groups?status=sending']])
    })

    it('прыжок по истории с формы на другой таб — окно группы (правило 3)', () => {
        const { state, results } = play([
            ...toForm,
            { show: '/groups/A/orders', unmount: 'form', mount: 'group2', key: 'group:A', fallback: '/groups' },
        ])

        expect(results.at(-1)).toBe(results[0])
        expect(chain(state)).toEqual([['group:A', '/groups?status=sending']])
    })

    it('F5 на форме: таб после неё получает окно без адреса, а не адрес формы', () => {
        const { state } = play([
            { show: '/groups/A/keys', mount: 'form', key: '/groups/A/keys', fallback: '/groups/A/certificates' },
            { show: '/groups/A/certificates', unmount: 'form', mount: 'group', key: 'group:A', fallback: '/groups' },
        ])

        expect(chain(state)).toEqual([['group:A', null]])
    })

    it('группа A → группа B в одном макете — вложенное окно (правило 4)', () => {
        const { state } = play([
            { show: '/groups' },
            { show: '/groups/A/orders', mount: 'layout', key: 'group:A' },
            { show: '/groups/B/orders', sync: 'layout', key: 'group:B' },
        ])

        expect(chain(state)).toEqual([
            ['group:A', '/groups'],
            ['group:B', '/groups/A/orders'],
        ])
    })

    it('редактор, переиспользованный для другой записи, — вложенное окно; возврат продолжает первое', () => {
        const { state, cards, results } = play([
            { show: '/users?page=2' },
            { show: '/users/1/edit', mount: 'editor', key: '/users/1/edit' },
            { show: '/users/2/edit', sync: 'editor', key: '/users/2/edit' },
        ])

        expect(chain(state)).toEqual([
            ['/users/1/edit', '/users?page=2'],
            ['/users/2/edit', '/users/1/edit'],
        ])

        pageShown(state, '/users/1/edit')
        release(state, cards.editor)
        const editor = { name: 'editor2' }
        const reopened = assign(state, editor, '/users/1/edit', null)

        expect(reopened).toBe(results[0])
        expect(chain(state)).toEqual([['/users/1/edit', '/users?page=2']])
    })

    it('холодное открытие — окно без адреса', () => {
        const { state } = play([
            { show: '/users/1/edit', mount: 'editor', key: '/users/1/edit', fallback: '/users' },
        ])

        expect(chain(state)).toEqual([['/users/1/edit', null]])
    })

    it('пересоздание карточки на том же переходе — то же окно (правило 1)', () => {
        const { state, results } = play([
            { show: '/users' },
            { show: '/users/1/edit', mount: 'e1', key: '/users/1/edit' },
            { unmount: 'e1', mount: 'e2', key: '/users/1/edit' },
            { unmount: 'e2', mount: 'e3', key: '/users/1/edit' },
            { unmount: 'e3', mount: 'e4', key: '/users/1/edit' },
        ])

        expect(new Set(results).size).toBe(1)
        expect(chain(state)).toEqual([['/users/1/edit', '/users']])
    })

    it('правило 1 не возвращает закрытое окно', () => {
        const { state, results } = play([
            { show: '/groups' },
            { show: '/groups/A/orders', mount: 'group', key: 'group:A' },
            { show: '/groups/A/keys', unmount: 'group', mount: 'form', key: '/groups/A/keys' },
            { mount: 'group2', key: 'group:A' },
            { unmount: 'form', mount: 'form2', key: '/groups/A/keys' },
        ])

        expect(results.at(-1)).not.toBe(results[1])
        expect(chain(state)).toEqual([
            ['group:A', '/groups'],
            ['/groups/A/keys', '/groups/A/orders'],
        ])
    })

    it('брошенное окно не находится из новой цепочки (правило 5)', () => {
        const { state } = play([
            { show: '/groups?status=new' },
            { show: '/groups/A/orders', mount: 'group', key: 'group:A' },
            { show: '/orders', unmount: 'group' },
            { show: '/groups/A/orders', mount: 'group2', key: 'group:A' },
        ])

        expect(chain(state)).toEqual([['group:A', '/orders']])
    })

    it('вперёд в карточку после ухода «Назад» — новая цепочка от списка', () => {
        const { state } = play([
            { show: '/list' },
            { show: '/card', mount: 'card', key: '/card' },
            { show: '/list', unmount: 'card' },
            { show: '/card', mount: 'card2', key: '/card' },
        ])

        expect(chain(state)).toEqual([['/card', '/list']])
    })
})

describe('окна: смена ключа', () => {
    it('без нового перехода отклоняется; возврат к принятому ключу — без отказа', () => {
        const { state, results } = play([
            { show: '/list' },
            { show: '/card', mount: 'card', key: 'A' },
            { sync: 'card', key: 'B' },
            { sync: 'card', key: 'A' },
        ])

        expect(results[1]).toEqual({ window: results[0], rejected: true, key: 'A' })
        expect(results[2]).toEqual({ window: results[0], rejected: false, key: 'A' })
        expect(chain(state)).toEqual([['A', '/list']])
    })

    it('после обработанного перехода между табами — тоже отклоняется', () => {
        const { state, results } = play([
            { show: '/list' },
            { show: '/card/1', mount: 'card', key: 'A' },
            { show: '/card/2', sync: 'card', key: 'A' },
            { sync: 'card', key: 'B' },
        ])

        expect(results[1].rejected).toBe(false)
        expect(results[2].rejected).toBe(true)
        expect(chain(state)).toEqual([['A', '/list']])
    })
})

describe('окна: fallback-url', () => {
    it('setFallback меняет цель окна, и закрытие по приходу идёт по новому адресу', () => {
        const { state, cards } = play([
            { show: '/card', mount: 'card', key: '/card', fallback: '/a' },
        ])

        setFallback(state, cards.card, '/b')

        expect(windowOf(state, cards.card).fallbackAddress).toBe('/b')

        pageShown(state, '/b')
        release(state, cards.card)
        assign(state, { name: 'next' }, '/b', null)

        expect(chain(state)).toEqual([['/b', null]])
    })

    it('windowOf без назначения — null', () => {
        expect(windowOf(createWindows(), {})).toBe(null)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/windows.test.js`
Expected: FAIL — `Failed to resolve import "../src/windows.js"`.

- [ ] **Step 3: Write the implementation**

`src/windows.js`:

```js
// Окна PageCard. Окно — открытая карточка с адресом, куда она закрывается.
// Экземпляр PageCard — только временное представление окна: его
// пересоздание окна не открывает и не закрывает. Модуль не знает ни Vue,
// ни DOM: состояние создаёт плагин dashboardUi на каждое приложение,
// адреса приходят уже приведёнными, карточка — любой объект-ключ.
// Правила 1–5 — спека 2026-10-07-page-card-return-design.md, раздел 4.4.

// Адрес — путь и query string: /groups?status=sending. Origin и hash
// отбрасываются: Ziggy отдаёт абсолютные адреса, роутер — пути.
export function normalizeAddress(value, origin) {
    if (value === null || value === undefined || value === '') {
        return null
    }

    const url = new URL(String(value), origin)

    return url.pathname + url.search
}

// Путь адреса без query: ключ окна по умолчанию.
export function pathOf(address) {
    return address === null ? null : address.split('?')[0]
}

export function createWindows() {
    return {
        // Открытые окна снизу вверх: у каждого, кроме корня, родитель —
        // предыдущее окно цепочки.
        windows: [],
        // Карточки на экране: карточка → { key, window, processed }.
        // Порядок вставки — порядок назначения.
        cards: new Map(),
        // Адрес показанной страницы; null до первого показа.
        shown: null,
        // Последний переход: адрес и окно прежней страницы, назначения
        // этого перехода по ключу.
        transition: { number: 0, fromAddress: null, fromWindow: null, assigned: new Map() },
        nextId: 1,
    }
}

function isOpen(state, item) {
    return state.windows.includes(item)
}

function targetOf(item) {
    return item.returnAddress ?? item.fallbackAddress
}

// Окно карточки на экране — последней назначенной.
function windowOnScreen(state) {
    let current = null

    for (const entry of state.cards.values()) {
        current = entry.window
    }

    return current
}

function nearestOpen(state, item) {
    let current = item

    while (current !== null && !isOpen(state, current)) {
        current = current.parent
    }

    return current
}

export function pageShown(state, address) {
    state.transition = {
        number: state.transition.number + 1,
        fromAddress: state.shown,
        fromWindow: windowOnScreen(state),
        assigned: new Map(),
    }
    state.shown = address

    return state.transition.number
}

function chooseWindow(state, key, fallbackAddress) {
    const transition = state.transition

    // Правило 1: пересоздание карточки на том же переходе — то же окно,
    // если оно ещё открыто.
    const repeated = transition.assigned.get(key)
    if (repeated !== undefined && isOpen(state, repeated)) {
        return repeated
    }

    let from = transition.fromWindow
    let fromAddress = transition.fromAddress

    // Окно прежней страницы могло закрыться на этом же переходе: тогда
    // прежняя страница — его ближайший открытый предок, а на страницу
    // закрытого окна вести нельзя.
    if (from !== null && !isOpen(state, from)) {
        from = nearestOpen(state, from)
        fromAddress = null
    }

    // Правило 2: пришли на цель окна прежней страницы — оно закрыто.
    if (from !== null && targetOf(from) === state.shown) {
        state.windows.splice(state.windows.indexOf(from))
        from = from.parent === null ? null : nearestOpen(state, from.parent)
        fromAddress = null
    }

    // Правило 3: окно с этим ключом — в цепочке окна прежней страницы.
    for (let item = from; item !== null; item = item.parent) {
        if (item.key === key && isOpen(state, item)) {
            state.windows.splice(state.windows.indexOf(item) + 1)

            return item
        }
    }

    // Правило 4 — вложенное окно; правило 5 — новая цепочка.
    if (from !== null) {
        state.windows.splice(state.windows.indexOf(from) + 1)
    } else {
        state.windows = []
    }

    const opened = {
        id: state.nextId,
        key,
        parent: from,
        returnAddress: fromAddress,
        fallbackAddress,
    }
    state.nextId += 1
    state.windows.push(opened)

    return opened
}

export function assign(state, card, key, fallbackAddress) {
    const assigned = chooseWindow(state, key, fallbackAddress)

    assigned.fallbackAddress = fallbackAddress
    state.transition.assigned.set(key, assigned)
    // Удаление перед вставкой ставит карточку в конец: она — на экране.
    state.cards.delete(card)
    state.cards.set(card, { key, window: assigned, processed: state.transition.number })

    return assigned
}

// Проверка карточки после отрисовки. Ключ можно сменить только на новом
// переходе: окно без смены страницы закрывать было бы некуда.
export function sync(state, card, key, fallbackAddress) {
    const entry = state.cards.get(card)

    if (entry === undefined) {
        return { window: assign(state, card, key, fallbackAddress), rejected: false, key }
    }

    if (entry.key === key) {
        entry.processed = state.transition.number

        return { window: entry.window, rejected: false, key }
    }

    if (entry.processed === state.transition.number) {
        return { window: entry.window, rejected: true, key: entry.key }
    }

    state.cards.delete(card)

    return { window: assign(state, card, key, fallbackAddress), rejected: false, key }
}

export function release(state, card) {
    state.cards.delete(card)
}

export function setFallback(state, card, fallbackAddress) {
    const entry = state.cards.get(card)

    if (entry !== undefined) {
        entry.window.fallbackAddress = fallbackAddress
    }
}

export function windowOf(state, card) {
    return state.cards.get(card)?.window ?? null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/windows.test.js`
Expected: PASS, все случаи; вывод без предупреждений.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS (модуль ещё никем не используется).

- [ ] **Step 6: Commit**

```bash
git add src/windows.js tests/windows.test.js
git commit -m "feat: добавить модуль окон PageCard"
```

---

### Task 2: Опция `currentUrl` плагина

**Files:**
- Modify: `src/plugin.js`
- Test: `tests/plugin.test.js`, `tests/ssr.test.js`

**Interfaces:**
- Consumes: `createWindows`, `normalizeAddress`, `pageShown` (Task 1).
- Produces (для Task 3): настройки `uiSettings.windows` —
  `null` или `{ state, page }`, где `state` — состояние модуля окон,
  `page` — `shallowReactive({ number, address })`: номер последнего
  перехода и адрес показанной страницы.

- [ ] **Step 1: Write the failing tests**

В `tests/plugin.test.js` дописать случаи в таблицу `cases` (после
`navigate: undefined`):

```js
        { name: 'currentUrl — функция', options: { currentUrl: () => '/list' }, throws: null },
        { name: 'currentUrl не функция', options: { currentUrl: '/list' }, throws: /currentUrl должен быть функцией/ },
        { name: 'currentUrl: null', options: { currentUrl: null }, throws: /currentUrl должен быть функцией/ },
        { name: 'currentUrl: undefined', options: { currentUrl: undefined }, throws: /currentUrl должен быть функцией/ },
```

и в конец файла — новый блок; импорт поменять на
`import { createApp, defineComponent, ref } from 'vue'` и
`import { dashboardUi, injectSettings } from '../src/plugin.js'`:

```js
// Настройки приложения читает компонент-зонд: ключ provide наружу не отдаётся.
function mountProbe(currentUrl) {
    let settings = null
    const app = createApp(defineComponent({
        inject: injectSettings,
        created() {
            settings = this.uiSettings
        },
        render: () => null,
    }))

    app.use(dashboardUi, { currentUrl })
    app.mount(document.createElement('div'))

    return { app, windows: () => settings.windows }
}

describe('dashboardUi: currentUrl', () => {
    it('без опции окон нет', () => {
        let settings = null
        const app = createApp(defineComponent({
            inject: injectSettings,
            created() {
                settings = this.uiSettings
            },
            render: () => null,
        }))

        app.use(dashboardUi, {})
        app.mount(document.createElement('div'))

        expect(settings.windows).toBe(null)
        app.unmount()
    })

    it('undefined и null до готовности роутера показом не считаются', () => {
        const current = ref(undefined)
        const { app, windows } = mountProbe(() => current.value)

        expect(windows().page.number).toBe(0)

        current.value = null
        expect(windows().page.number).toBe(0)

        current.value = '/list'
        expect(windows().page).toEqual({ number: 1, address: '/list' })
        expect(windows().state.transition.fromAddress).toBe(null)
        app.unmount()
    })

    it('показ записывается синхронно, с адресом прежней страницы', () => {
        const current = ref('/list?page=2')
        const { app, windows } = mountProbe(() => current.value)

        current.value = '/card'

        expect(windows().page).toEqual({ number: 2, address: '/card' })
        expect(windows().state.transition.fromAddress).toBe('/list?page=2')
        app.unmount()
    })

    it('абсолютный адрес и hash приводятся к пути с query; смена одного hash — не показ', () => {
        const current = ref('https://example.test/groups?status=sending#top')
        const { app, windows } = mountProbe(() => current.value)

        expect(windows().page).toEqual({ number: 1, address: '/groups?status=sending' })

        current.value = '/groups?status=sending#bottom'
        expect(windows().page.number).toBe(1)
        app.unmount()
    })

    it('после app.unmount() смена адреса состояние не меняет', () => {
        const current = ref('/list')
        const { app, windows } = mountProbe(() => current.value)
        const page = windows().page

        app.unmount()
        current.value = '/other'

        expect(page).toEqual({ number: 1, address: '/list' })
    })
})
```

В `tests/ssr.test.js` дописать в конец:

```js
describe('SSR: плагин', () => {
    it('currentUrl на сервере не вызывается', async () => {
        let calls = 0
        const app = createSSRApp({ render: () => h('div') })

        app.use(pkg.dashboardUi, {
            currentUrl: () => {
                calls += 1

                return '/list'
            },
        })
        await renderToString(app)

        expect(calls).toBe(0)
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/plugin.test.js tests/ssr.test.js`
Expected: FAIL — случаи «currentUrl не функция / null / undefined» не
бросают; `settings.windows` — `undefined`; на сервере `calls` = 0 уже
сейчас (этот случай может пройти — он закрепляет поведение).

- [ ] **Step 3: Write the implementation**

`src/plugin.js` целиком:

```js
import { effectScope, shallowReactive, watch } from 'vue'
import { isLang, LANGS } from './i18n.js'
import { createWindows, normalizeAddress, pageShown } from './windows.js'

// Ключ настроек в provide приложения. Наружу не экспортируется: приложение
// задаёт настройки через dashboardUi, компоненты читают их через injectSettings.
const settingsKey = Symbol('dashboardUi')

// Без плагина: русский язык, ссылки — обычные <a> без перехвата клика,
// окон PageCard нет.
const defaultSettings = Object.freeze({ lang: 'ru', navigate: null, windows: null })

export const injectSettings = {
    uiSettings: { from: settingsKey, default: () => defaultSettings },
}

// Слежение за адресом страницы: каждый показ — переход в модуле окон.
// Синхронно, чтобы переход был записан до того, как Vue создаст
// компоненты новой страницы. До готовности роутера currentUrl() может
// вернуть undefined или null — такое значение показом не считается.
// Смена одного hash — тоже не показ: адрес окна — путь и query.
function followPages(app, currentUrl) {
    const state = createWindows()
    const page = shallowReactive({ number: 0, address: null })
    const scope = effectScope(true)

    scope.run(() => {
        watch(currentUrl, (value) => {
            const address = normalizeAddress(value, window.location.origin)

            if (address === null || address === page.address) {
                return
            }

            page.number = pageShown(state, address)
            page.address = address
        }, { flush: 'sync', immediate: true })
    })
    app.onUnmount(() => scope.stop())

    return { state, page }
}

export const dashboardUi = {
    install(app, options) {
        const given = options ?? {}

        // Не передан (ключа нет) — умолчание; переданное значение, включая
        // null и undefined, проверяется.
        const lang = Object.hasOwn(given, 'lang') ? given.lang : 'ru'
        // Неверный язык ловится сразу, а не русским текстом в английском приложении.
        if (!isLang(lang)) {
            throw new Error(`dashboardUi: неизвестный lang «${lang}», допустимы: ${LANGS.join(', ')}`)
        }

        const hasNavigate = Object.hasOwn(given, 'navigate')
        const navigate = hasNavigate ? given.navigate : null
        if (hasNavigate && typeof navigate !== 'function') {
            throw new Error('dashboardUi: navigate должен быть функцией (href) => …')
        }

        const hasCurrentUrl = Object.hasOwn(given, 'currentUrl')
        const currentUrl = hasCurrentUrl ? given.currentUrl : null
        if (hasCurrentUrl && typeof currentUrl !== 'function') {
            throw new Error('dashboardUi: currentUrl должен быть функцией () => адрес страницы')
        }

        // Окна ведутся только в браузере: на сервере страницы не
        // показываются, и слежение там остановить было бы некому.
        const windows = currentUrl !== null && typeof window !== 'undefined'
            ? followPages(app, currentUrl)
            : null

        app.provide(settingsKey, Object.freeze({ lang, navigate, windows }))
    },
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/plugin.test.js tests/ssr.test.js`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS; `PageCard` ещё работает по истории и окон не касается.

- [ ] **Step 6: Commit**

```bash
git add src/plugin.js tests/plugin.test.js tests/ssr.test.js
git commit -m "feat: следить за адресом страницы в плагине dashboardUi"
```

---

### Task 3: `PageCard` на окнах

**Files:**
- Modify: `src/components/PageCard.vue` (целиком)
- Modify: `tests/utilityPrefix.test.js` (исключение `$attrs.class`)
- Test: `tests/PageCard.test.js` (переписывается целиком),
  `tests/ssrFixtures.js`, `tests/ssr.test.js` (блок «SSR: PageCard»),
  `tests/hydration.test.js` (блок «гидратация PageCard…»),
  `tests/i18n.test.js` (блок «недопустимый lang: крестик PageCard»)

**Interfaces:**
- Consumes: `assign`, `sync`, `release`, `setFallback`,
  `normalizeAddress`, `pathOf` (Task 1); `uiSettings.windows`
  и `uiSettings.navigate` (Task 2).
- Produces (для Task 4, 5 и certificates): пропы `width`
  (`"xl"|"4xl"|"7xl"`), `fallback-url`, `window-key`, `lang`; публичный
  метод `close()`; проп слота по умолчанию `close`; на корень —
  `class`, `style`, `data-*`, `aria-*`.

- [ ] **Step 1: Allow `$attrs.class` in the prefix test**

В `tests/utilityPrefix.test.js`, функция `classLiterals`, перед
`default:` добавить ветку:

```js
        case 'MemberExpression':
            // $attrs.class — классы приложения на корне компонента: это
            // утилиты приложения, а не пакета, и префикса у них нет.
            if (node.object.type === 'Identifier' && node.object.name === '$attrs'
                && node.property.type === 'Identifier' && node.property.name === 'class' && !node.computed) {
                return []
            }
            throw new Error('форма MemberExpression в :class не проверяется — запишите классы литералами')
```

- [ ] **Step 2: Write the failing tests**

`tests/ssrFixtures.js` — строка `PageCard` становится:

```js
    PageCard: { props: { fallbackUrl: '/list' }, slots: { default: () => h('h3', 'Заголовок') } },
```

`tests/ssr.test.js` — блок `describe('SSR: PageCard', …)` заменить:

```js
describe('SSR: PageCard', () => {
    it('с fallback-url сервер рисует крестик и место под него', async () => {
        const { html, warnings, errors } = await renderOnServer('PageCard')

        expect(html).toContain('M6 18L18 6M6 6l12 12')
        expect(html).toContain('bb:[--bb-closer-space:3.5rem]')
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    it('без fallback-url крестика и места под него нет', async () => {
        const app = createSSRApp({ render: () => h(pkg.PageCard, null, () => h('h3', 'Заголовок')) })
        const warnings = []
        app.config.warnHandler = (message) => warnings.push(message)

        const html = await renderToString(app)

        expect(html).not.toContain('M6 18L18 6M6 6l12 12')
        expect(html).toContain('bb:[--bb-closer-space:0px]')
        expect(warnings).toEqual([])
    })
})
```

`tests/hydration.test.js` — блок `describe('гидратация PageCard при
истории вкладки', …)` целиком (с `beforeAll` и `pushState`) заменить;
из импорта `vitest` убрать `beforeAll`, если он больше нигде не нужен:

```js
describe('гидратация PageCard', () => {
    it('с fallback-url крестик есть и на сервере, и после гидратации', async () => {
        const result = await hydrate(renderFixture('PageCard'))

        expect(result.html).toContain('M6 18L18 6M6 6l12 12')

        await nextTick()

        expect(result.container.querySelector(CROSS_PATH)).not.toBeNull()
        expect(result.warnings).toEqual([])
        expect(result.errors).toEqual([])
        expect(result.consoleErrors).toEqual([])
        expect(result.consoleWarns).toEqual([])
        result.client.unmount()
    })

    it('без fallback-url и без плагина крестика нет ни до, ни после гидратации', async () => {
        const result = await hydrate(() => h(pkg.PageCard, null, () => h('h3', 'Заголовок')))

        await nextTick()

        expect(result.html).not.toContain('M6 18L18 6M6 6l12 12')
        expect(result.container.querySelector(CROSS_PATH)).toBeNull()
        expect(result.warnings).toEqual([])
        expect(result.consoleErrors).toEqual([])
        expect(result.consoleWarns).toEqual([])
        result.client.unmount()
    })
})
```

`tests/i18n.test.js` — в блоке `describe('недопустимый lang: крестик
PageCard', …)` удалить `beforeAll` с `history.pushState` и его
комментарий («Крестик рисуется, только если в истории больше одной
записи…»), а пропы монтирования заменить на
`props: { lang: 'de', fallbackUrl: '/list' },` с комментарием над
`it(…)`:

```js
    // Крестик рисуется, когда у карточки есть цель: здесь — fallback-url.
```

Если `beforeAll` в файле больше нигде не используется, убрать его из
импорта `vitest`.

`tests/PageCard.test.js` — заменить целиком:

```js
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import PageCard from '../src/components/PageCard.vue'
import { dashboardUi, injectSettings } from '../src/plugin.js'

enableAutoUnmount(afterEach)
afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
})

const CROSS_PATH = 'path[d="M6 18L18 6M6 6l12 12"]'

// Карточка открыта, монтирование назначило окно, перерисовка прошла.
const settle = async () => {
    await nextTick()
    await nextTick()
}

// Страница приложения: пока page.show — false, на экране «список», после —
// карточка. Адрес страницы — ref, его читает currentUrl плагина: как
// в Inertia, он меняется до того, как создаются компоненты новой страницы.
// plugin: 'windows' — плагин с navigate-шпионом и currentUrl; объект —
// эти опции плагина; null — без плагина.
function mountPage({ address = '/list', plugin = 'windows', props = {}, attrs = {}, show = false } = {}) {
    const errors = []
    const warnings = []
    const current = ref(address)
    const navigate = vi.fn()
    const page = reactive({ show, props, attrs })
    let plugins = []

    if (plugin === 'windows') {
        plugins = [[dashboardUi, { navigate, currentUrl: () => current.value }]]
    } else if (plugin !== null) {
        plugins = [[dashboardUi, plugin]]
    }

    const Host = defineComponent({
        inject: injectSettings,
        render() {
            if (!page.show) {
                return h('div', { id: 'list' }, 'Список')
            }

            return h(PageCard, { ...page.attrs, ...page.props }, {
                default: ({ close }) => [
                    h('h3', { id: 'card-heading' }, 'Заголовок'),
                    h('button', { id: 'cancel', type: 'button', onClick: close }, 'Отмена'),
                ],
            })
        },
    })

    const wrapper = mount(Host, {
        attachTo: document.body,
        global: {
            plugins,
            config: {
                errorHandler: (error) => errors.push(error),
                warnHandler: (message) => warnings.push(message),
            },
        },
    })

    // Переход на страницу с карточкой: сначала адрес, затем отрисовка.
    async function open(nextAddress) {
        current.value = nextAddress
        page.show = true
        await settle()
    }

    // Переход внутри карточки: адрес меняется, карточка остаётся.
    async function goTo(nextAddress) {
        current.value = nextAddress
        await settle()
    }

    const card = () => wrapper.findComponent(PageCard)
    const cross = () => wrapper.findAll('button').find((button) => button.find(CROSS_PATH).exists())
    const chain = () => wrapper.vm.uiSettings.windows.state.windows.map((item) => [item.key, item.returnAddress])

    return { wrapper, page, current, navigate, open, goTo, card, cross, chain, errors, warnings }
}

describe('PageCard: адрес возврата', () => {
    it('крестик ведёт на адрес прежней страницы с query', async () => {
        const page = mountPage({ address: '/groups?status=sending' })
        await page.open('/groups/A/orders')

        await page.cross().trigger('click')

        expect(page.navigate).toHaveBeenCalledTimes(1)
        expect(page.navigate).toHaveBeenCalledWith('/groups?status=sending')
        expect(page.errors).toEqual([])
        expect(page.warnings).toEqual([])
    })

    it('close() слотом и через ref — тот же переход', async () => {
        const page = mountPage()
        await page.open('/card')

        await page.wrapper.get('#cancel').trigger('click')
        page.card().vm.close()

        expect(page.navigate.mock.calls).toEqual([['/list'], ['/list']])
        expect(page.warnings).toEqual([])
    })

    it('двойной клик по крестику — два перехода на одну цель', async () => {
        const page = mountPage()
        await page.open('/card')

        await page.cross().trigger('click')
        await page.cross().trigger('click')

        expect(page.navigate.mock.calls).toEqual([['/list'], ['/list']])
    })

    it('уходящая карточка окно новой страницы не берёт', async () => {
        const page = mountPage()
        await page.open('/card')

        page.current.value = '/other'
        page.page.show = false
        await settle()

        expect(page.chain()).toEqual([['/card', '/list']])
        expect(page.warnings).toEqual([])
    })
})

describe('PageCard: без адреса возврата', () => {
    it('холодное открытие без fallback-url — крестика нет, close() ничего не делает', async () => {
        const page = mountPage({ address: '/card', show: true })
        await settle()

        expect(page.cross()).toBeUndefined()
        expect(page.card().classes()).toContain('bb:[--bb-closer-space:0px]')
        page.card().vm.close()
        expect(page.navigate).not.toHaveBeenCalled()
        expect(page.warnings).toEqual([])
    })

    it('холодное открытие с fallback-url — крестик ведёт на него', async () => {
        const page = mountPage({ address: '/card', show: true, props: { fallbackUrl: '/users' } })
        await settle()

        await page.cross().trigger('click')

        expect(page.navigate).toHaveBeenCalledWith('/users')
    })

    it('смена fallback-url на экране — новая цель', async () => {
        const page = mountPage({ address: '/card', show: true, props: { fallbackUrl: '/a' } })
        await settle()

        page.page.props.fallbackUrl = '/b'
        await settle()
        await page.cross().trigger('click')

        expect(page.navigate).toHaveBeenCalledWith('/b')
        expect(page.warnings).toEqual([])
    })

    it('fallback-url="" — цели нет', async () => {
        const page = mountPage({ address: '/card', show: true, props: { fallbackUrl: '' } })
        await settle()

        expect(page.cross()).toBeUndefined()
    })

    it('плагин без currentUrl — только fallback-url', async () => {
        const navigate = vi.fn()
        const page = mountPage({ plugin: { navigate }, show: true, props: { fallbackUrl: '/users' } })
        await settle()

        await page.cross().trigger('click')

        expect(navigate).toHaveBeenCalledWith('/users')
    })

    it('без плагина — fallback-url полной загрузкой страницы', async () => {
        const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
        const page = mountPage({ plugin: null, show: true, props: { fallbackUrl: '/users' } })
        await settle()

        await page.cross().trigger('click')

        expect(assign).toHaveBeenCalledWith('/users')
    })

    it('плагин без navigate — close() зовёт location.assign', async () => {
        const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
        const current = ref('/list')
        const page = mountPage({ plugin: { currentUrl: () => current.value } })
        current.value = '/card'
        page.page.show = true
        await settle()

        await page.cross().trigger('click')

        expect(assign).toHaveBeenCalledWith('/list')
    })
})

describe('PageCard: ключ окна', () => {
    it('смена window-key вместе с показом страницы — новое окно', async () => {
        const page = mountPage({ address: '/groups', props: { windowKey: 'group:A' } })
        await page.open('/groups/A/orders')

        page.current.value = '/groups/B/orders'
        page.page.props.windowKey = 'group:B'
        await settle()
        await page.cross().trigger('click')

        expect(page.navigate).toHaveBeenCalledWith('/groups/A/orders')
        expect(page.warnings).toEqual([])
    })

    it('смена window-key без показа — предупреждение, окно прежнее; возврат ключа — без предупреждения', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const page = mountPage({ props: { windowKey: 'A' } })
        await page.open('/card')

        page.page.props.windowKey = 'B'
        await settle()
        page.page.props.windowKey = 'A'
        await settle()
        await page.cross().trigger('click')

        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn.mock.calls[0][0]).toBe('PageCard: ключ окна сменился на «B» без смены страницы — карточка остаётся в окне «A»')
        expect(page.navigate).toHaveBeenCalledWith('/list')
    })

    it('после смены таба смена ключа без показа — предупреждение, окно прежнее', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const page = mountPage({ props: { windowKey: 'A' } })
        await page.open('/card/1')
        await page.goTo('/card/2')

        page.page.props.windowKey = 'B'
        await settle()
        await page.cross().trigger('click')

        expect(warn).toHaveBeenCalledTimes(1)
        expect(page.chain()).toEqual([['A', '/list']])
        expect(page.navigate).toHaveBeenCalledWith('/list')
    })

    it('ключ по умолчанию следует за путём: переиспользованная карточка — новое окно', async () => {
        const page = mountPage({ address: '/users?page=2' })
        await page.open('/users/1/edit')
        await page.goTo('/users/2/edit')

        await page.cross().trigger('click')

        expect(page.navigate).toHaveBeenCalledWith('/users/1/edit')
        expect(page.warnings).toEqual([])
    })

    it('window-key="" — как ключ по умолчанию', async () => {
        const page = mountPage({ address: '/users?page=2', props: { windowKey: '' } })
        await page.open('/users/1/edit')
        await page.goTo('/users/2/edit')

        await page.cross().trigger('click')

        expect(page.navigate).toHaveBeenCalledWith('/users/1/edit')
    })
})

describe('PageCard: карточка', () => {
    const widthCases = [
        { width: undefined, card: 'bb:sm:max-w-xl', closer: ['bb:md:right-auto', 'bb:md:left-full', 'bb:md:mr-0', 'bb:md:ml-4'], space: 'bb:md:[--bb-closer-space:0px]' },
        { width: 'xl', card: 'bb:sm:max-w-xl', closer: ['bb:md:right-auto', 'bb:md:left-full', 'bb:md:mr-0', 'bb:md:ml-4'], space: 'bb:md:[--bb-closer-space:0px]' },
        { width: '4xl', card: 'bb:sm:max-w-4xl', closer: ['bb:lg:right-auto', 'bb:lg:left-full', 'bb:lg:mr-0', 'bb:lg:ml-4'], space: 'bb:lg:[--bb-closer-space:0px]' },
        { width: '7xl', card: 'bb:sm:max-w-7xl', closer: ['bb:2xl:right-auto', 'bb:2xl:left-full', 'bb:2xl:mr-0', 'bb:2xl:ml-4'], space: 'bb:2xl:[--bb-closer-space:0px]' },
    ]

    for (const testCase of widthCases) {
        it(`ширина ${testCase.width ?? 'по умолчанию'}: классы карточки, крестика и места под него`, async () => {
            const props = { fallbackUrl: '/list', ...(testCase.width === undefined ? {} : { width: testCase.width }) }
            const page = mountPage({ plugin: null, show: true, props })
            await settle()

            expect(page.card().classes()).toContain(testCase.card)
            expect(page.card().classes()).toContain('bb:[--bb-closer-space:3.5rem]')
            expect(page.card().classes()).toContain(testCase.space)
            for (const name of testCase.closer) {
                expect(page.cross().classes()).toContain(name)
            }
            expect(page.warnings).toEqual([])
        })
    }

    it('недопустимая ширина — вид xl и предупреждение валидатора', async () => {
        const page = mountPage({ plugin: null, show: true, props: { fallbackUrl: '/list', width: 'wide' } })
        await settle()

        expect(page.card().classes()).toContain('bb:sm:max-w-xl')
        expect(page.warnings).toHaveLength(1)
        expect(page.warnings[0]).toContain('width')
    })

    it('на корне — классы карточки, нет ресета пакета, слот внутри корня', async () => {
        const page = mountPage({ plugin: null, show: true })
        await settle()

        for (const name of ['bb:box-border', 'bb:relative', 'bb:my-6', 'bb:mx-auto', 'bb:bg-white', 'bb:shadow-xl', 'bb:sm:rounded-lg']) {
            expect(page.card().classes()).toContain(name)
        }
        expect(page.card().classes()).not.toContain('bb-dashboard-ui')
        expect(page.wrapper.get('#card-heading').element.parentElement).toBe(page.card().element)
        expect(page.warnings).toEqual([])
    })

    it('class, style, data-*, aria-* — на корне; id и пропы страницы — нет', async () => {
        const page = mountPage({
            plugin: null,
            show: true,
            attrs: {
                class: 'px-4',
                style: 'color: red',
                'data-test': 'card',
                'aria-describedby': 'hint',
                id: 'page',
                group: { uuid: '1' },
            },
        })
        await settle()
        const root = page.card()

        expect(root.classes()).toContain('px-4')
        expect(root.attributes('style')).toContain('color: red')
        expect(root.attributes('data-test')).toBe('card')
        expect(root.attributes('aria-describedby')).toBe('hint')
        expect(root.attributes('id')).toBeUndefined()
        expect(root.attributes('group')).toBeUndefined()
        expect(page.errors).toEqual([])
        expect(page.warnings).toEqual([])
    })

    it('крестик после слота и доступен с клавиатуры', async () => {
        const page = mountPage({ plugin: null, show: true, props: { fallbackUrl: '/list' } })
        await settle()

        expect(page.card().element.lastElementChild).toBe(page.cross().element)
        expect(page.cross().attributes('tabindex')).toBe('0')
        for (const name of ['bb:absolute', 'bb:sm:mt-6', 'bb:focus-visible:ring-2', 'bb:focus-visible:ring-indigo-500']) {
            expect(page.cross().classes()).toContain(name)
        }
    })

    const labelCases = [
        { name: 'без плагина — «Назад»', plugin: null, props: {}, expected: 'Назад' },
        { name: 'плагин en — «Back»', plugin: { lang: 'en' }, props: {}, expected: 'Back' },
        { name: 'проп lang ru главнее плагина en', plugin: { lang: 'en' }, props: { lang: 'ru' }, expected: 'Назад' },
    ]

    for (const testCase of labelCases) {
        it(`доступное имя крестика: ${testCase.name}`, async () => {
            const page = mountPage({ plugin: testCase.plugin, show: true, props: { fallbackUrl: '/list', ...testCase.props } })
            await settle()

            expect(page.cross().attributes('aria-label')).toBe(testCase.expected)
            expect(page.warnings).toEqual([])
        })
    }
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/PageCard.test.js tests/ssr.test.js tests/hydration.test.js`
Expected: FAIL — нет пропов `fallbackUrl`/`width`/`windowKey`,
крестик по истории.

- [ ] **Step 4: Write the implementation**

`src/components/PageCard.vue` целиком:

```vue
<template>
    <div
        class="bb:box-border bb:relative bb:my-6 bb:mx-auto bb:bg-white bb:shadow-xl bb:sm:rounded-lg"
        :class="[
            {
                'bb:sm:max-w-xl': resolvedWidth === 'xl',
                'bb:sm:max-w-4xl': resolvedWidth === '4xl',
                'bb:sm:max-w-7xl': resolvedWidth === '7xl',
            },
            canClose
                ? {
                    'bb:[--bb-closer-space:3.5rem] bb:md:[--bb-closer-space:0px]': resolvedWidth === 'xl',
                    'bb:[--bb-closer-space:3.5rem] bb:lg:[--bb-closer-space:0px]': resolvedWidth === '4xl',
                    'bb:[--bb-closer-space:3.5rem] bb:2xl:[--bb-closer-space:0px]': resolvedWidth === '7xl',
                }
                : 'bb:[--bb-closer-space:0px]',
            $attrs.class,
        ]"
        :style="$attrs.style"
        v-bind="{ ...forwardedAttrs() }"
    >
        <!-- Место под крестик для заголовка страницы: --bb-closer-space — 3.5rem,
             пока крестик в углу (ниже порога ширины), 0 — когда он снаружи или
             его нет. -->
        <slot :close="close"></slot>

        <!-- После слота: в углу карточки крестик рисуется поверх содержимого.
             tabindex и aria-label перекрывают собственные атрибуты Closer.
             Порог, от которого крестик снаружи, зависит от ширины: снаружи
             нужно 1rem зазора и 2rem крестика по обе стороны карточки. -->
        <closer
            v-if="canClose"
            class="bb:absolute bb:top-0 bb:right-0 bb:mt-4 bb:mr-4 bb:w-8 bb:h-8 bb:sm:mt-6 bb:rounded-md bb:focus-visible:ring-2 bb:focus-visible:ring-indigo-500"
            :class="{
                'bb:md:right-auto bb:md:left-full bb:md:mr-0 bb:md:ml-4': resolvedWidth === 'xl',
                'bb:lg:right-auto bb:lg:left-full bb:lg:mr-0 bb:lg:ml-4': resolvedWidth === '4xl',
                'bb:2xl:right-auto bb:2xl:left-full bb:2xl:mr-0 bb:2xl:ml-4': resolvedWidth === '7xl',
            }"
            tabindex="0"
            :aria-label="texts.back"
            @clicked="close"
        />
    </div>
</template>

<script>
import Closer from "./Closer.vue";
import { withLang } from "../lang.js";
import { assign, normalizeAddress, pathOf, release, setFallback, sync } from "../windows.js";

const WIDTHS = ["xl", "4xl", "7xl"];

// Карточка отдельной страницы. Крестик и close() ведут туда, откуда
// карточку открыли: адрес прежней страницы помнит окно плагина
// dashboardUi (src/windows.js), а без него — fallback-url. Истории
// браузера карточка не касается. У корня нет bb-dashboard-ui: ресет
// пакета накрыл бы разметку страницы в слоте, в том числе поля
// @tailwindcss/forms. box-border задан явно — ресет его не даёт, а без
// preflight приложения карточка с отступами стала бы шире.
export default {
    components: { Closer },

    mixins: [withLang],

    // Когда PageCard — постоянный макет Inertia, ему атрибутами приходят
    // пропы страницы, и в разметку они попасть не должны. Классы и стиль
    // приложения ставятся на корень явно, data-* и aria-* — через
    // forwardedAttrs(). Комментарий стоит здесь, а не над корнем шаблона:
    // комментарий перед корнем превратил бы его во фрагмент.
    inheritAttrs: false,

    props: {
        width: {
            type: String,
            default: "xl",
            validator: (value) => WIDTHS.includes(value),
        },
        // Куда закрываться, если адреса возврата нет: F5, новая вкладка,
        // прямая ссылка, приложение без currentUrl.
        fallbackUrl: {
            type: String,
            default: null,
        },
        // Общий ключ окна для карточки из нескольких страниц; без него —
        // путь страницы.
        windowKey: {
            type: String,
            default: null,
        },
    },

    data() {
        return {
            // Адрес возврата окна карточки; null — окна нет или открыли
            // без прежней страницы. Назначается после монтирования: на
            // сервере окон нет.
            returnAddress: null,
        };
    },

    computed: {
        resolvedWidth() {
            return WIDTHS.includes(this.width) ? this.width : "xl";
        },

        windows() {
            return this.uiSettings.windows;
        },

        resolvedKey() {
            if (this.windowKey !== null && this.windowKey !== "") {
                return this.windowKey;
            }

            return this.windows === null ? null : pathOf(this.windows.page.address);
        },

        target() {
            if (this.returnAddress !== null) {
                return this.returnAddress;
            }

            return this.fallbackUrl === null || this.fallbackUrl === "" ? null : this.fallbackUrl;
        },

        canClose() {
            return this.target !== null;
        },
    },

    watch: {
        fallbackUrl() {
            if (this.windows !== null) {
                setFallback(this.windows.state, this, this.fallbackAddress());
            }
        },
    },

    mounted() {
        if (this.windows === null) {
            return;
        }

        this.returnAddress = assign(this.windows.state, this, this.resolvedKey, this.fallbackAddress()).returnAddress;

        // После отрисовки: карточку, которую уносит переход, к этому
        // моменту уже размонтировали, её слежение остановлено, и окно
        // новой страницы она себе не возьмёт.
        this.$watch(
            () => [this.windows.page.number, this.resolvedKey],
            () => this.syncWindow(),
            { flush: "post" },
        );
    },

    beforeUnmount() {
        if (this.windows !== null) {
            release(this.windows.state, this);
        }
    },

    methods: {
        fallbackAddress() {
            return normalizeAddress(this.fallbackUrl, window.location.origin);
        },

        // Атрибуты приложения, которые не могут быть пропами страницы:
        // пропы Inertia — имена вида group и orders, без data- и aria-.
        forwardedAttrs() {
            return Object.fromEntries(
                Object.entries(this.$attrs).filter(([name]) => name.startsWith("data-") || name.startsWith("aria-")),
            );
        },

        syncWindow() {
            const result = sync(this.windows.state, this, this.resolvedKey, this.fallbackAddress());

            if (result.rejected) {
                console.warn(`PageCard: ключ окна сменился на «${this.resolvedKey}» без смены страницы — карточка остаётся в окне «${result.key}»`);
            }

            this.returnAddress = result.window.returnAddress;
        },

        // То же, что крестик: «Отмена» страницы и возврат после успешного
        // действия. Окно закрывается не здесь, а когда страница-цель
        // показана: неуспешный переход оставляет его открытым.
        close() {
            const target = this.target;

            if (target === null) {
                return;
            }

            const navigate = this.uiSettings.navigate;

            if (navigate === null) {
                window.location.assign(target);

                return;
            }

            navigate(target);
        },
    },
};
</script>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/PageCard.test.js tests/ssr.test.js tests/hydration.test.js tests/utilityPrefix.test.js tests/i18n.test.js`
Expected: PASS. (`vi.spyOn(window.location, 'assign')` в happy-dom 20
работает — проверено.)

- [ ] **Step 6: Run the whole suite and the build**

Run: `npm test && npm run build && grep -o 'max-w-4xl\|max-w-7xl\|lg\\:left-full\|2xl\\:left-full' dist/style.css | sort -u`
Expected: тесты PASS без лишних предупреждений; сборка без ошибок;
`grep` печатает четыре строки: `2xl\:left-full`, `lg\:left-full`,
`max-w-4xl`, `max-w-7xl` — классы ширин и порогов собраны.

- [ ] **Step 7: Commit**

```bash
git add src/components/PageCard.vue tests/PageCard.test.js tests/ssrFixtures.js tests/ssr.test.js tests/hydration.test.js tests/utilityPrefix.test.js tests/i18n.test.js
git commit -m "feat: закрывать PageCard туда, откуда открыли, без истории браузера"
```

---

### Task 4: Интеграционные тесты с Inertia

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `tests/inertia/harness.js`, `tests/inertia/flows.test.js`,
  `tests/inertia/cold-fallback.test.js`, `tests/inertia/cold-bare.test.js`

**Interfaces:**
- Consumes: `PageCard` (Task 3), `dashboardUi` с `currentUrl` (Task 2).

- [ ] **Step 1: Install Inertia for tests only**

Run: `npm install --save-dev --save-exact @inertiajs/vue3@3.6.1`
Expected: в `package.json` появился `"@inertiajs/vue3": "3.6.1"`
в `devDependencies` — точная версия, на которой README обещает проверку
рецепта; `peerDependencies` и `dependencies` не изменились
(`git diff package.json`).

- [ ] **Step 2: Write the harness**

`tests/inertia/harness.js`:

```js
import { createApp, defineComponent, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { vi, expect } from 'vitest'
import { createInertiaApp, router, usePage } from '@inertiajs/vue3'
import PageCard from '../../src/components/PageCard.vue'
import { dashboardUi } from '../../src/plugin.js'

// Настоящие Inertia и Vue, сервер — функция serve(): по адресу отдаёт объект
// страницы. Страницы — как в приложении: табы группы объявляют PageCard
// постоянным макетом с ключом окна, форма и редактор держат PageCard
// в своём шаблоне.

const Tab = defineComponent({
    props: { group: String, tab: String },
    layout: (props) => [PageCard, { windowKey: `group:${props.group}`, fallbackUrl: '/groups' }],
    render() {
        return h('div', { id: 'tab' }, `${this.group} ${this.tab}`)
    },
})

const Form = defineComponent({
    props: { fallback: String },
    render() {
        return h(PageCard, { fallbackUrl: this.fallback }, () => h('h3', 'Форма'))
    },
})

const Editor = defineComponent({
    render: () => h(PageCard, { fallbackUrl: '/users' }, () => h('h3', 'Редактор')),
})

const Bare = defineComponent({
    render: () => h(PageCard, null, () => h('h3', 'Без запасного адреса')),
})

const List = defineComponent({
    render: () => h('div', { id: 'list' }, 'Список'),
})

const pages = { Tab, Form, Editor, Bare, List }

const page = (component, url, props) => ({ component, props, url, version: '' })

export function serve(address) {
    const path = new URL(address, 'https://example.test').pathname
    let match = path.match(/^\/groups\/(\w+)\/(orders|certificates)$/)

    if (match) {
        return page('Tab', address, { group: match[1], tab: match[2] })
    }

    match = path.match(/^\/groups\/(\w+)\/keys$/)

    if (match) {
        return page('Form', address, { fallback: `/groups/${match[1]}/certificates` })
    }

    if (/^\/users\/\d+\/edit$/.test(path)) {
        return page('Editor', address, {})
    }

    if (/^\/bare\/\d+$/.test(path)) {
        return page('Bare', address, {})
    }

    return page('List', address, {})
}

// Адреса, ответ на которые обрывается (blocked) или не приходит, пока
// запрос не отменят (hanging).
export const blocked = new Set()
export const hanging = new Set()

const http = {
    async request(config) {
        const url = new URL(config.url, window.location.origin)
        const address = url.pathname + url.search

        if (blocked.has(address)) {
            throw new Error(`адрес заблокирован тестом: ${address}`)
        }

        if (hanging.has(address)) {
            return new Promise((resolve, reject) => {
                config.signal?.addEventListener('abort', () => reject(new Error(`запрос отменён: ${address}`)))
            })
        }

        return {
            status: 200,
            data: JSON.stringify(serve(address)),
            headers: { 'x-inertia': 'true', 'content-type': 'application/json' },
        }
    },
}

export const warnings = []

export async function settle() {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await flushPromises()
}

// Порядок установки — как в app.js приложения: .use(plugin)
// .use(dashboardUi).mount(el). Начальную страницу Inertia задаёт уже
// после установки плагинов.
export async function start(address) {
    document.body.innerHTML = '<div id="app"></div>'
    window.history.replaceState(null, '', address)

    await createInertiaApp({
        page: serve(address),
        resolve: (name) => pages[name],
        http,
        progress: false,
        setup({ el, App, props, plugin }) {
            const app = createApp({ render: () => h(App, props) })

            app.config.warnHandler = (message) => warnings.push(message)
            app.use(plugin)
                .use(dashboardUi, {
                    navigate: (href) => router.visit(href, { onNetworkError: () => false }),
                    currentUrl: () => usePage().url,
                })
                .mount(el)

            return app
        },
    })
    await settle()
}

export async function visit(href, options = {}) {
    await new Promise((resolve) => router.visit(href, { ...options, onFinish: () => resolve() }))
    await settle()
}

export const address = () => window.location.pathname + window.location.search

export const hasCross = () => document.querySelector('button[aria-label="Назад"]') !== null

export async function clickCross() {
    document.querySelector('button[aria-label="Назад"]').click()
    await settle()
}

export async function waitForAddress(expected) {
    await vi.waitFor(() => expect(address()).toBe(expected))
    await settle()
}

export async function back() {
    window.history.back()
    await settle()
}

export async function go(delta) {
    window.history.go(delta)
    await settle()
}
```

- [ ] **Step 3: Write the scenarios**

`tests/inertia/flows.test.js`:

```js
// @vitest-environment happy-dom
import { afterEach, beforeAll, expect, it } from 'vitest'
import { router } from '@inertiajs/vue3'
import {
    address,
    back,
    blocked,
    clickCross,
    go,
    hanging,
    hasCross,
    settle,
    start,
    visit,
    waitForAddress,
    warnings,
} from './harness.js'

// Одно приложение на файл: роутер Inertia — синглтон модуля. Каждый
// сценарий начинает со страницы без карточки, поэтому цепочка окон
// начинается заново (правило 5).
beforeAll(async () => {
    await start('/groups?status=new')
})

afterEach(() => {
    blocked.clear()
    hanging.clear()
    expect(warnings).toEqual([])
})

it('1. фильтр списка через replace, затем карточка: крестик — на заменённый фильтр', async () => {
    await visit('/groups?status=new')
    await visit('/groups?status=sending', { replace: true })
    await visit('/groups/A/orders')

    await clickCross()

    await waitForAddress('/groups?status=sending')
})

it('2. переход на текущий адрес с пересозданием страницы: крестик — на источник', async () => {
    await visit('/users?page=2')
    await visit('/users/1/edit')
    await visit('/users/1/edit')
    await visit('/users/1/edit')

    await clickCross()

    await waitForAddress('/users?page=2')
    expect(hasCross()).toBe(false)
})

it('3. таб → форма → закрытие формы → таб с фильтром → закрытие карточки', async () => {
    await visit('/groups?landing=1')
    await visit('/groups/A/orders')
    await visit('/groups/A/certificates?vendor=X')
    await visit('/groups/A/keys')

    await clickCross()
    await waitForAddress('/groups/A/certificates?vendor=X')
    await clickCross()

    await waitForAddress('/groups?landing=1')
})

it('4a. «Назад» с формы, затем крестик карточки — источник', async () => {
    await visit('/groups?landing=2')
    await visit('/groups/A/orders')
    await visit('/groups/A/certificates?vendor=Y')
    await visit('/groups/A/keys')

    await back()
    await waitForAddress('/groups/A/certificates?vendor=Y')
    await clickCross()

    await waitForAddress('/groups?landing=2')
})

it('4b. прыжок по истории с формы через промежуточный таб — источник', async () => {
    await visit('/groups?landing=3')
    await visit('/groups/A/orders')
    await visit('/groups/A/certificates?vendor=Z')
    await visit('/groups/A/keys')

    await go(-2)
    await waitForAddress('/groups/A/orders')
    await clickCross()

    await waitForAddress('/groups?landing=3')
})

it('5a. переход назад оборвался: карточка на экране, повторный крестик уходит на ту же цель', async () => {
    await visit('/users?page=3')
    await visit('/users/2/edit')
    blocked.add('/users?page=3')

    await clickCross()

    expect(address()).toBe('/users/2/edit')
    expect(hasCross()).toBe(true)

    blocked.clear()
    await clickCross()

    await waitForAddress('/users?page=3')
})

it('5b. переход назад отменён: карточка на экране, повторный крестик уходит на ту же цель', async () => {
    await visit('/users?page=4')
    await visit('/users/3/edit')
    hanging.add('/users?page=4')

    document.querySelector('button[aria-label="Назад"]').click()
    await settle()
    router.cancelAll()
    await settle()

    expect(address()).toBe('/users/3/edit')
    expect(hasCross()).toBe(true)

    hanging.clear()
    await clickCross()

    await waitForAddress('/users?page=4')
})

it('6. группа A → группа B в том же макете: крестик B — таб A, крестик A — источник', async () => {
    await visit('/groups?landing=4')
    await visit('/groups/A/orders')
    await visit('/groups/B/orders')

    await clickCross()
    await waitForAddress('/groups/A/orders')
    await clickCross()

    await waitForAddress('/groups?landing=4')
})

it('8. редактор переиспользован для другой записи (preserveState): крестик — первый редактор, затем источник', async () => {
    await visit('/users?page=5')
    await visit('/users/1/edit')
    await visit('/users/2/edit', { preserveState: true })

    await clickCross()
    await waitForAddress('/users/1/edit')
    await clickCross()

    await waitForAddress('/users?page=5')
})
```

`tests/inertia/cold-fallback.test.js`:

```js
// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { address, clickCross, hasCross, start, waitForAddress, warnings } from './harness.js'

it('7a. холодное открытие карточки с fallback-url: крестик ведёт на него, /undefined не появляется', async () => {
    await start('/users/7/edit')

    expect(hasCross()).toBe(true)

    await clickCross()

    await waitForAddress('/users')
    expect(address()).not.toContain('undefined')
    expect(warnings).toEqual([])
})
```

`tests/inertia/cold-bare.test.js`:

```js
// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { hasCross, start, warnings } from './harness.js'

it('7b. холодное открытие карточки без fallback-url: крестика нет', async () => {
    await start('/bare/1')

    expect(hasCross()).toBe(false)
    expect(warnings).toEqual([])
})
```

- [ ] **Step 4: Run the integration tests**

Run: `npx vitest run tests/inertia`
Expected: PASS, все сценарии.

Если ни один сценарий не видит смены адреса (крестик ведёт на
`fallback-url` даже в сценарии 1), значит, тесты и Inertia получили
разные копии Vue: `npm ls vue` должен показать одну версию (`deduped`).
Если копий две — `npm dedupe` и повторить.

- [ ] **Step 5: Run the whole suite and check dist**

Run: `npm test && npm run build && ! grep -q "inertiajs" dist/index.js && echo "Inertia в dist нет"`
Expected: PASS; «Inertia в dist нет».

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tests/inertia
git commit -m "test: проверить окна PageCard на настоящей Inertia"
```

---

### Task 5: Playground и README

**Files:**
- Modify: `playground/App.vue`, `playground/host.js`, `playground/bare.js`
- Modify: `README.md`

- [ ] **Step 1: Playground**

В `playground/host.js` и `playground/bare.js` удалить комментарий
«Крестик PageCard виден, только если в истории вкладки больше одной
записи, поэтому демо добавляет свою запись до монтирования.» и строку
`history.pushState({ pageCardDemo: true }, '')` — карточка больше не
читает историю. `currentUrl` в playground не подключается.

В `playground/App.vue` секция PageCard:

```vue
        <section id="page-card">
            <h2>PageCard</h2>
            <!-- Адреса возврата в playground нет: currentUrl не подключён.
                 Крестик ведёт на fallback-url, переход виден в строке
                 «Последний переход». -->
            <page-card class="page-card-demo" fallback-url="#page-card">
                <h3 class="page-card-demo-heading">Длинный заголовок карточки: на узком экране он переносится и не заходит под крестик</h3>
                <input class="page-card-demo-input" type="text" value="Поле формы">
            </page-card>
        </section>
```

- [ ] **Step 2: README — подключение**

В разделе «Подключение к приложению» пример становится:

```js
import { dashboardUi } from '@boobooking/dashboard-ui-components'
import { router, usePage } from '@inertiajs/vue3'

createApp(App).use(dashboardUi, {
    lang: 'en',
    navigate: (href) => router.visit(href),
    currentUrl: () => usePage().url,
})
```

первое предложение раздела: «Плагин `dashboardUi` задаёт язык, переход
по ссылкам пакета и адрес страницы на экране. Все параметры
необязательны; без плагина компоненты русскоязычные, ссылки — обычные
`<a>`, а `PageCard` закрывается только на `fallback-url`.» После пункта
про `navigate` добавить:

```markdown
- `currentUrl()` — адрес страницы на экране, по нему `PageCard` знает,
  откуда его открыли. Для Inertia — `() => usePage().url` (проверено на
  `@inertiajs/vue3` 3.6.1). Договор для другого роутера: функция читает
  реактивное состояние роутера; её значение меняется при каждом показе
  страницы с новым адресом, в том числе при замене записи истории,
  «Назад»/«Вперёд» и первой загрузке, и меняется до создания компонентов
  новой страницы; неуспешный или отменённый переход значения не меняет;
  пока роутер не готов, функция возвращает `null` или `undefined`.
  У Vue Router, например, до первой навигации `currentRoute` —
  `START_LOCATION` с `fullPath === '/'`, и его надо отдавать как `null`.
  Плагин следит за адресом только в браузере и перестаёт при
  размонтировании приложения.
```

- [ ] **Step 3: README — раздел PageCard**

Раздел `### PageCard` целиком (до `### NotificationMessage`) заменить:

````markdown
### PageCard

Карточка отдельной страницы — формы или просмотра записи — по центру
с крестиком, который ведёт туда, откуда карточку открыли.

    <page-card class="px-4 pt-4 sm:px-6 sm:pt-6" :fallback-url="route('users')">
        <h3 class="pr-(--bb-closer-space) text-lg font-medium">Создание администратора</h3>
        …поля формы…
    </page-card>

Страница просмотра, у секций которой свои отступы:

    <page-card :fallback-url="route('payments')">
        <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 class="pr-(--bb-closer-space) text-lg font-medium">{{ name }}</h3>
        </div>
        <div class="overflow-hidden sm:rounded-b-lg">…строки…</div>
    </page-card>

**Куда ведёт крестик.** Плагин `dashboardUi` с `currentUrl` (см.
«Подключение к приложению») помнит адрес страницы, которая была на экране
перед карточкой, со всеми её фильтрами и номером страницы, и крестик
ведёт ровно туда. Адрес не попадает ни в адрес страницы, ни в хранилища
браузера, ни в историю: он живёт в памяти приложения. «Как было» — это
адрес: прокрутку, несохранённый ввод и раскрытые элементы
страницы-источника карточка не возвращает.

Если адреса нет — карточку открыли в новой вкладке, прямой ссылкой, после
F5 или в приложении без `currentUrl`, — крестик ведёт на `fallback-url`.
Без `fallback-url` крестика нет. Истории браузера карточка не касается.

**Окна.** Открытая карточка — окно. Карточка, открытая со страницы
другой карточки (например, форма с таба), — вложенное окно: её крестик
ведёт на страницу, с которой её открыли, а крестик внешней карточки —
по-прежнему туда, откуда открыли её. Окно закрывается, когда показана
страница, куда оно возвращает: крестиком, «Отменой», после успешного
действия или кнопкой «Назад» браузера.

**Карточка из нескольких страниц** (табы) — постоянный макет этих страниц
Inertia с общим ключом окна:

    export default {
        layout: (props) => [PageCard, {
            width: '7xl',
            windowKey: `group:${props.group.data.uuid}`,
            fallbackUrl: route('groups'),
            class: 'px-4 py-4 sm:px-6 sm:py-6',
        }],
    }

`layout` — стрелочная функция одного аргумента или кортеж: обычную
функцию Inertia примет за компонент. Пока соседние страницы объявляют тот
же макет, карточка не пересоздаётся, и смена таба, фильтров и страницы
таблицы окна не меняет. Ключ окна по умолчанию — путь страницы без query:
отдельной странице-карточке его задавать не нужно, а если роутер
переиспользовал её для другой записи (`/users/1/edit` → `/users/2/edit`),
у неё новое окно. Ключ меняется только вместе со сменой страницы: смена
без неё оставляет карточку в прежнем окне и пишет предупреждение
в консоль. Рецепт проверен на `@inertiajs/vue3` 3.6.1.

**«Отмена» и закрытие из кода.** `close()` делает то же, что крестик.
Он доступен пропом слота по умолчанию и методом компонента:

    <page-card ref="card" v-slot="{ close }" :fallback-url="route('users')">
        …
        <button type="button" @click="close">Отмена</button>
    </page-card>

    // после успешного сохранения
    this.$refs.card.close()

`close()` переходит через `navigate` плагина, без него — полной загрузкой
страницы. Без адреса возврата и `fallback-url` он ничего не делает.

**Ширина и крестик.** От `width` зависят ширина карточки и порог, от
которого крестик стоит снаружи, на `1rem` правее её края; ниже порога —
в правом верхнем углу:

| `width` | Ширина от `sm` | Крестик снаружи |
| --- | --- | --- |
| `xl` (по умолчанию) | `max-w-xl` (36rem) | от `md` |
| `4xl` | `max-w-4xl` (56rem) | от `lg` |
| `7xl` | `max-w-7xl` (80rem) | от `2xl` |

Пороги рассчитаны на карточку по центру области на всю ширину страницы:
в узкой колонке или рядом с боковой панелью места снаружи может не
хватить.

Заголовок оставляет место под крестик правым отступом из переменной
`--bb-closer-space`: `3.5rem`, пока крестик в углу, `0` — когда он снаружи
или его нет. В Tailwind это `pr-(--bb-closer-space)`; без Tailwind 4 —
обычный CSS `padding-right: var(--bb-closer-space)`, а в Tailwind 3 —
`pr-[var(--bb-closer-space)]`. Вне `PageCard` отступ равен нулю.

**Атрибуты.** Карточка — `relative my-6 mx-auto bg-white shadow-xl
sm:rounded-lg`, `box-sizing: border-box`. Отступов у неё нет: форма
передаёт их классом на корень, страница просмотра — не передаёт. На корень
попадают `class`, `style`, `data-*` и `aria-*` приложения; классы
приложения сильнее классов пакета. Остальные атрибуты, в том числе `id`,
не переносятся: в роли макета карточка получает атрибутами пропы
страницы. Ресет пакета на карточку и её содержимое не распространяется:
разметка страницы, в том числе поля `@tailwindcss/forms`, выглядит так же,
как вне карточки.

Карточка не обрезает содержимое, как у `ConfirmationModal`: выпадающие
списки и календари могут выходить за её край. Блок со своим фоном у края
карточки скругляет свои углы сам — например, нижний блок строк:
`overflow-hidden sm:rounded-b-lg`.

Крестик доступен с клавиатуры: Tab, Enter, пробел; в порядке табуляции
крестик идёт после содержимого карточки; при фокусе с клавиатуры вокруг
него кольцо. Доступное имя — «Назад» / «Back».

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `width` | `String` | `"xl"` | `"xl"`, `"4xl"` или `"7xl"` |
| `fallback-url` | `String` | `null` | куда закрываться без адреса возврата; `""` — как `null` |
| `window-key` | `String` | путь страницы | общий ключ окна карточки из нескольких страниц |
| `lang` | `String` | язык плагина | `"ru"` или `"en"` |

Событий нет. Проп слота по умолчанию — `close`.

Ограничения:

- память плагина не переживает F5 и новую вкладку: тогда работает
  `fallback-url`;
- адреса сравниваются строкой: равнозначный адрес с другим порядком
  параметров или с лишним `page=1` — другой адрес;
- если вернуться в карточку «Назад» или «Вперёд» после ухода из неё не
  через крестик, адрес возврата — страница, с которой пришли в этот раз;
- на одной странице — одна карточка.
````

- [ ] **Step 4: README — SSR и обновление**

В разделе «SSR» пункт про `PageCard` заменить на:

```markdown
- `PageCard` на сервере рисует крестик, только если задан `fallback-url`:
  адрес возврата известен только в браузере, и крестик, ведущий на него,
  появляется после монтирования;
```

Перед разделом «## Обновление с 0.11» вставить:

```markdown
## Обновление с 0.12

- Крестик `PageCard` больше не ходит по истории: подключите `currentUrl`
  к плагину и дайте карточкам `fallback-url`. Без них крестика нет.
- На корень `PageCard` переносятся только `class`, `style`, `data-*`
  и `aria-*`.
- Карточка из нескольких страниц объявляет `PageCard` постоянным макетом
  с `window-key` (см. раздел `PageCard`).
```

- [ ] **Step 5: Check playground and README**

Run: `npm test && npm run playground` — остановить сервер, убедившись,
что сборка прошла; затем собрать playground статикой в
`/Users/boobooking/Code/mars/certificates/src/public/build/ui-playground/`
командой из плана
`/Users/boobooking/Code/mars/certificates/src/docs/superpowers/plans/2026-09-22-dashboard-ui-components-shared.md`
и открыть в Chrome через MCP
`https://certificates.test/build/ui-playground/index.html` и `…/host.html`.
Expected: в секции PageCard крестик виден; клик — «Последний переход:
#page-card»; консоль без ошибок. После проверки каталог
`public/build/ui-playground` в certificates удалить.

- [ ] **Step 6: Commit**

```bash
git add playground/App.vue playground/host.js playground/bare.js README.md
git commit -m "docs: описать возврат PageCard и опцию currentUrl в README"
```

---

### Task 6: Выпуск `0.13.0`

Выполняется после того, как certificates прошёл Tasks 1–5 своего плана на
архиве этого пакета (Global Constraints того плана), включая все шаги
§10 спеки certificates. Шаги с формами (3–7), которые без подготовки
данных проверяет владелец, считаются пройденными только по его
результатам: разрешение на публикацию их не заменяет, и без этих
результатов задача не начинается. Если certificates нашёл ошибку пакета,
её исправляют отдельным коммитом до этой задачи.

- [ ] **Step 1: Version**

Run: `npm version 0.13.0 --no-git-tag-version`
Expected: `version` `0.13.0` в `package.json` и двух местах
`package-lock.json`; других изменений нет (`git diff --stat`).

- [ ] **Step 2: Test, build, commit**

```bash
npm test && npm run build
git add package.json package-lock.json
git commit -m "chore: поднять версию пакета до 0.13.0"
```

- [ ] **Step 3: Stop and ask the owner**

Остановиться и спросить владельца: «Пуш `main` пакета, тег `v0.13.0`
и публикация — да?» Без явного «да» дальше не идти.

- [ ] **Step 4: Push and wait for Test**

```bash
git push origin main
SHA=$(git rev-parse HEAD)
gh run list --commit "$SHA" --workflow Test
```

Дождаться зелёного `Test` (оба джоба) по полному SHA.

- [ ] **Step 5: Tag**

```bash
git tag v0.13.0 "$SHA"
git push origin v0.13.0
```

Дождаться зелёного `Publish`; `npm view @boobooking/dashboard-ui-components version`
— `0.13.0`.
