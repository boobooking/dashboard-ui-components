import { describe, expect, it } from 'vitest'
import { COLORS, COLOR_NAMES, colorClass, isColor } from '../src/colors.js'

const PARTS = ['pill', 'pillHover', 'button', 'buttonHover', 'menuItem', 'mark']

const BASES = ['gray', 'green', 'yellow', 'red', 'indigo', 'purple']
const SOLID = {
    gray: [500, 600, 'bb:text-white'],
    green: [600, 700, 'bb:text-white'],
    yellow: [300, 400, 'bb:text-yellow-950'],
    red: [600, 700, 'bb:text-white'],
    indigo: [500, 600, 'bb:text-white'],
    purple: [500, 600, 'bb:text-white'],
}

describe('список цветов', () => {
    it('двенадцать имён в порядке списка', () => {
        expect(COLOR_NAMES).toEqual(BASES.flatMap((base) => [`${base}-solid`, `${base}-pale`]))
    })

    it.each(COLOR_NAMES)('%s — ровно шесть наборов', (name) => {
        expect(Object.keys(COLORS[name])).toEqual(PARTS)
    })

    // Строки модуля — не разметка компонента: tests/utilityPrefix.test.js их
    // не видит, префикс проверяется здесь.
    it.each(COLOR_NAMES)('%s — каждая утилита с префиксом bb:', (name) => {
        const tokens = PARTS.flatMap((part) => COLORS[name][part].split(/\s+/))

        expect(tokens.filter((token) => !token.startsWith('bb:'))).toEqual([])
    })

    it.each(BASES)('%s-pale — бледная схема, отличается только цвет', (base) => {
        expect(COLORS[`${base}-pale`]).toEqual({
            pill: `bb:bg-${base}-100 bb:text-${base}-800`,
            pillHover: `bb:hover:text-${base}-600`,
            button: `bb:bg-${base}-100 bb:border-${base}-300 bb:text-${base}-800`,
            buttonHover: `bb:hover:bg-${base}-200`,
            menuItem: `bb:bg-${base}-100 bb:text-${base}-800 bb:hover:bg-${base}-200 bb:focus:bg-${base}-200`,
            mark: `bb:text-${base}-500`,
        })
    })

    it.each(BASES)('%s-solid — яркая схема, отличаются тона и цвет текста', (base) => {
        const [main, dark, text] = SOLID[base]

        expect(COLORS[`${base}-solid`]).toEqual({
            pill: `bb:bg-${base}-${main} ${text}`,
            pillHover: `bb:hover:bg-${base}-${dark}`,
            button: `bb:bg-${base}-${main} bb:border-${base}-${dark} ${text}`,
            buttonHover: `bb:hover:bg-${base}-${dark}`,
            menuItem: `bb:bg-${base}-${main} ${text} bb:hover:bg-${base}-${dark} bb:focus:bg-${base}-${dark}`,
            mark: `bb:text-${base}-500`,
        })
    })

    it.each(COLOR_NAMES)('isColor(%s) — да', (name) => {
        expect(isColor(name)).toBe(true)
    })

    it.each(['green', 'red', 'purple', 'green-light', 'blue', 'Red', '', null, undefined, 42, 'toString', '__proto__'])('isColor(%s) — нет', (value) => {
        expect(isColor(value)).toBe(false)
    })

    it('colorClass: набор цвета; неизвестный цвет или набор — пустая строка', () => {
        expect(colorClass('red-pale', 'pill')).toBe('bb:bg-red-100 bb:text-red-800')
        expect(colorClass('red', 'pill')).toBe('')
        expect(colorClass('blue', 'pill')).toBe('')
        expect(colorClass(null, 'pill')).toBe('')
        expect(colorClass('red-pale', 'shadow')).toBe('')
    })
})
