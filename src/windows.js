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
