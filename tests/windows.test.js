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
