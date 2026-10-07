// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { moveMenuFocus } from '../src/menuFocus.js'

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

    it('движение мыши по пункту ставит на него фокус', () => {
        stop = moveMenuFocus(menu)
        items[0].focus()

        items[1].dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))

        expect(focused()).toBe('B')
    })

    // Пункт под курсором уже виден: прокрутка к частично видному пункту у края
    // окна сдвигала бы страницу под мышью, и следующий пункт снова уезжал бы.
    it('движение мыши ставит фокус без прокрутки к пункту', () => {
        stop = moveMenuFocus(menu)
        const focus = vi.spyOn(items[1], 'focus')

        items[1].dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))

        expect(focus).toHaveBeenCalledWith({ preventScroll: true })
        expect(focused()).toBe('B')
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

    it('после снятия стрелки снова прокручивают страницу', () => {
        moveMenuFocus(menu)()
        outside.focus()

        expect(press('ArrowDown').defaultPrevented).toBe(false)
        expect(focused()).toBe('')
    })
})
