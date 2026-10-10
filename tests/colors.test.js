import { describe, expect, it } from 'vitest'
import { COLORS, COLOR_NAMES, colorClass, isColor } from '../src/colors.js'

const PARTS = ['pill', 'pillHover', 'button', 'menuItem', 'mark']

describe('список цветов', () => {
    it('шесть имён в порядке списка', () => {
        expect(COLOR_NAMES).toEqual(['gray', 'green', 'yellow', 'red', 'indigo', 'purple'])
    })

    it.each(COLOR_NAMES)('%s — ровно пять наборов', (name) => {
        expect(Object.keys(COLORS[name])).toEqual(PARTS)
    })

    // Строки модуля — не разметка компонента: tests/utilityPrefix.test.js их
    // не видит, префикс проверяется здесь.
    it.each(COLOR_NAMES)('%s — каждая утилита с префиксом bb:', (name) => {
        const tokens = PARTS.flatMap((part) => COLORS[name][part].split(/\s+/))

        expect(tokens.filter((token) => !token.startsWith('bb:'))).toEqual([])
    })

    it.each(COLOR_NAMES)('%s — одна схема на все цвета, отличается только тон', (name) => {
        expect(COLORS[name]).toEqual({
            pill: `bb:bg-${name}-100 bb:text-${name}-800`,
            pillHover: `bb:hover:text-${name}-600`,
            button: `bb:bg-${name}-100 bb:border-${name}-300 bb:text-${name}-800 bb:hover:bg-${name}-200`,
            menuItem: `bb:text-${name}-800 bb:focus:bg-${name}-100`,
            mark: `bb:text-${name}-500`,
        })
    })

    it.each(COLOR_NAMES)('isColor(%s) — да', (name) => {
        expect(isColor(name)).toBe(true)
    })

    it.each(['blue', 'Red', '', null, undefined, 42, 'toString', '__proto__'])('isColor(%s) — нет', (value) => {
        expect(isColor(value)).toBe(false)
    })

    it('colorClass: набор цвета; неизвестный цвет или набор — пустая строка', () => {
        expect(colorClass('red', 'pill')).toBe('bb:bg-red-100 bb:text-red-800')
        expect(colorClass('blue', 'pill')).toBe('')
        expect(colorClass(null, 'pill')).toBe('')
        expect(colorClass('red', 'shadow')).toBe('')
    })
})
