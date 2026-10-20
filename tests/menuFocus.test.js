// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { holdTabFocus, moveMenuFocus } from '../src/menuFocus.js'

// Меню из трёх пунктов и кнопка вне меню, с которой фокус уходит в меню.
let outside
let menu
let items
let stop

beforeEach(() => {
    outside = document.createElement('button')
    menu = document.createElement('div')
    items = ['A', 'B', 'C'].map((name) => {
        const item = document.createElement(name === 'B' ? 'a' : 'button')
        if (name === 'B') {
            item.href = '#'
        }
        item.textContent = name
        menu.append(item)
        return item
    })
    document.body.append(outside, menu)
    stop = null
})

afterEach(() => {
    stop?.()
    outside.remove()
    menu.remove()
})

function press(key, target = document.activeElement) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    target.dispatchEvent(event)
    return event
}

function focused() {
    return document.activeElement.textContent
}

describe('moveMenuFocus', () => {
    it.each([
        { name: 'фокус вне меню, выбранного нет: вниз — на первый', from: null, selected: null, key: 'ArrowDown', want: 'A' },
        { name: 'фокус вне меню, выбранного нет: вверх — на последний', from: null, selected: null, key: 'ArrowUp', want: 'C' },
        { name: 'с первого вниз — на второй', from: 'A', selected: null, key: 'ArrowDown', want: 'B' },
        { name: 'со второго вверх — на первый', from: 'B', selected: null, key: 'ArrowUp', want: 'A' },
        { name: 'с последнего вниз — по кругу на первый', from: 'C', selected: null, key: 'ArrowDown', want: 'A' },
        { name: 'с первого вверх — по кругу на последний', from: 'A', selected: null, key: 'ArrowUp', want: 'C' },
        { name: 'фокус вне меню: вниз — на пункт после выбранного', from: null, selected: 'B', key: 'ArrowDown', want: 'C' },
        { name: 'фокус вне меню: вверх — на пункт перед выбранным', from: null, selected: 'B', key: 'ArrowUp', want: 'A' },
        { name: 'фокус вне меню, выбран последний: вниз — по кругу на первый', from: null, selected: 'C', key: 'ArrowDown', want: 'A' },
        { name: 'фокус в меню важнее выбранного', from: 'A', selected: 'C', key: 'ArrowDown', want: 'B' },
    ])('$name', ({ from, selected, key, want }) => {
        const byName = (name) => items.find((item) => item.textContent === name)
        stop = moveMenuFocus(menu, () => (selected === null ? null : byName(selected)))
        ;(from === null ? outside : byName(from)).focus()

        press(key)

        expect(focused()).toBe(want)
    })

    it('гасит прокрутку страницы стрелками', () => {
        stop = moveMenuFocus(menu)
        outside.focus()

        expect(press('ArrowDown').defaultPrevented).toBe(true)
        expect(press('ArrowUp').defaultPrevented).toBe(true)
    })

    it('другие клавиши не трогает', () => {
        stop = moveMenuFocus(menu)
        items[0].focus()

        expect(press('Enter').defaultPrevented).toBe(false)
        expect(press('a').defaultPrevented).toBe(false)
        expect(focused()).toBe('A')
    })

    // Так делает расширение Safari: его обработчик на body останавливает
    // keydown, и до слушателей document на всплытии событие не доходит.
    it('работает, даже если keydown остановили на body', () => {
        const stopOnBody = (event) => event.stopPropagation()
        document.body.addEventListener('keydown', stopOnBody)

        try {
            stop = moveMenuFocus(menu)
            press('ArrowDown', document.body)

            expect(focused()).toBe('A')
        } finally {
            document.body.removeEventListener('keydown', stopOnBody)
        }
    })

    it('движение мыши по пункту фокус не ставит', () => {
        stop = moveMenuFocus(menu)
        items[0].focus()

        items[1].dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))

        expect(focused()).toBe('A')
    })

    it('движение мыши по меню вне пунктов фокус не трогает', () => {
        stop = moveMenuFocus(menu)
        items[0].focus()

        menu.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))

        expect(focused()).toBe('A')
    })

    it('после снятия движение мыши фокус не ставит', () => {
        moveMenuFocus(menu)()
        outside.focus()

        items[1].dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))

        expect(focused()).toBe('')
    })

    it('стрелка после движения мыши идёт от пункта в фокусе', () => {
        stop = moveMenuFocus(menu)
        items[0].focus()

        items[2].dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))
        press('ArrowDown')

        expect(focused()).toBe('B')
    })

    it('после снятия стрелки снова прокручивают страницу', () => {
        moveMenuFocus(menu)()
        outside.focus()

        expect(press('ArrowDown').defaultPrevented).toBe(false)
        expect(focused()).toBe('')
    })
})

// Поле поиска над пунктами входит в круг стрелок, пункт B — нет.
describe('moveMenuFocus: findStops', () => {
    let field
    let stops

    beforeEach(() => {
        field = document.createElement('input')
        menu.prepend(field)
        stops = () => [field, items[0], items[2]]
    })

    it('из поля вниз — первый стоп после поля', () => {
        stop = moveMenuFocus(menu, () => null, () => stops())
        field.focus()

        const event = press('ArrowDown')

        expect(event.defaultPrevented).toBe(true)
        expect(focused()).toBe('A')
    })

    it('с первого пункта вверх — в поле', () => {
        stop = moveMenuFocus(menu, () => null, () => stops())
        items[0].focus()

        press('ArrowUp')

        expect(document.activeElement).toBe(field)
    })

    it('с последнего вниз — в поле', () => {
        stop = moveMenuFocus(menu, () => null, () => stops())
        items[2].focus()

        press('ArrowDown')

        expect(document.activeElement).toBe(field)
    })

    it('пункт вне стопов пропускается', () => {
        stop = moveMenuFocus(menu, () => null, () => stops())
        items[0].focus()

        press('ArrowDown')

        expect(focused()).toBe('C')
    })

    it('фокус вне стопов — от выбранного', () => {
        stop = moveMenuFocus(menu, () => items[0], () => stops())
        outside.focus()

        press('ArrowDown')

        expect(focused()).toBe('C')
    })

    it('мышь над элементом вне стопов фокус не трогает', () => {
        stop = moveMenuFocus(menu, () => null, () => stops())
        items[0].focus()

        items[1].dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))

        expect(focused()).toBe('A')
    })

    it('пустые стопы — стрелка не гасится', () => {
        stops = () => []
        stop = moveMenuFocus(menu, () => null, () => stops())
        outside.focus()

        expect(press('ArrowDown').defaultPrevented).toBe(false)
    })
})

describe('holdTabFocus', () => {
    function pressTab(shiftKey = false) {
        const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })
        document.activeElement.dispatchEvent(event)
        return event
    }

    it.each([
        { name: 'с последнего Tab — по кругу на первый', from: 2, shiftKey: false, want: 'A' },
        { name: 'с первого Shift+Tab — по кругу на последний', from: 0, shiftKey: true, want: 'C' },
        { name: 'со второго Tab — на последний', from: 1, shiftKey: false, want: 'C' },
        { name: 'со второго Shift+Tab — на первый', from: 1, shiftKey: true, want: 'A' },
    ])('круг: $name', ({ from, shiftKey, want }) => {
        stop = holdTabFocus(() => items)
        items[from].focus()

        const event = pressTab(shiftKey)

        expect(event.defaultPrevented).toBe(true)
        expect(focused()).toBe(want)
    })

    it.each([
        { name: 'Tab — на первый', shiftKey: false, want: 'A' },
        { name: 'Shift+Tab — на последний', shiftKey: true, want: 'C' },
    ])('фокус вне остановок: $name', ({ shiftKey, want }) => {
        stop = holdTabFocus(() => items)
        outside.focus()

        pressTab(shiftKey)

        expect(focused()).toBe(want)
    })

    it('пустые остановки — Tab не гасится', () => {
        stop = holdTabFocus(() => [])
        outside.focus()

        expect(pressTab().defaultPrevented).toBe(false)
    })

    it.each(['ctrlKey', 'altKey', 'metaKey'])('Tab с модификатором не перехватывается: %s', (modifier) => {
        stop = holdTabFocus(() => items)
        items[0].focus()

        const event = new KeyboardEvent('keydown', { key: 'Tab', [modifier]: true, bubbles: true, cancelable: true })
        items[0].dispatchEvent(event)

        expect(event.defaultPrevented).toBe(false)
        expect(focused()).toBe('A')
    })

    it('после снятия Tab не перехватывается', () => {
        holdTabFocus(() => items)()
        items[0].focus()

        const event = pressTab()

        expect(event.defaultPrevented).toBe(false)
        expect(focused()).toBe('A')
    })

    it.each(['ArrowDown', 'a'])('другие клавиши не перехватываются: %s', (key) => {
        stop = holdTabFocus(() => items)
        items[0].focus()

        expect(press(key).defaultPrevented).toBe(false)
    })
})
