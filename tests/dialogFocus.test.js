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

    // Возвращать некуда: закрытая панель видна ещё 200 мс анимации ухода,
    // и Enter нажал бы её кнопку — фокус с неё снимается.
    it('прежнего элемента уже нет — фокус снят с панели', () => {
        release = holdDialogFocus(panel, () => {})
        opener.remove()

        release()

        expect(focused()).toBe('body')
    })

    it('прежним был body — фокус снят с панели', () => {
        opener.blur()
        release = holdDialogFocus(panel, () => {})

        release()

        expect(focused()).toBe('body')
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
