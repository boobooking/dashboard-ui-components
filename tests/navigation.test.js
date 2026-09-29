import { describe, expect, it } from 'vitest'
import { shouldNavigateInApp } from '../src/navigation.js'

// Минимальный клик по ссылке: левая кнопка, без модификаторов, без target.
const click = (overrides = {}) => ({
    button: 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    defaultPrevented: false,
    target: { isContentEditable: false },
    currentTarget: { target: '' },
    ...overrides,
})

describe('shouldNavigateInApp', () => {
    const cases = [
        { name: 'обычный левый клик', event: click(), expected: true },
        { name: 'target=_self', event: click({ currentTarget: { target: '_self' } }), expected: true },
        { name: 'Alt', event: click({ altKey: true }), expected: false },
        { name: 'Ctrl', event: click({ ctrlKey: true }), expected: false },
        { name: 'Meta (Cmd)', event: click({ metaKey: true }), expected: false },
        { name: 'Shift', event: click({ shiftKey: true }), expected: false },
        { name: 'средняя кнопка', event: click({ button: 1 }), expected: false },
        { name: 'target=_blank', event: click({ currentTarget: { target: '_blank' } }), expected: false },
        { name: 'событие уже отменено', event: click({ defaultPrevented: true }), expected: false },
        { name: 'клик из редактируемого содержимого', event: click({ target: { isContentEditable: true } }), expected: false },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            expect(shouldNavigateInApp(testCase.event)).toBe(testCase.expected)
        })
    }
})
