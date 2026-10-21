// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { DEFAULT_COLUMNS, isColumnCount, columnCount, gridTemplate, gridPlacement } from '../src/columns.js'

const at = (column, row) => ({ gridColumn: column, gridRow: row })

describe('gridPlacement', () => {
    it.each([
        [14, 2, [...[1, 2, 3, 4, 5, 6, 7].map((row) => at(1, row)), ...[1, 2, 3, 4, 5, 6, 7].map((row) => at(2, row))]],
        [14, 3, [...[1, 2, 3, 4, 5].map((row) => at(1, row)), ...[1, 2, 3, 4, 5].map((row) => at(2, row)), ...[1, 2, 3, 4].map((row) => at(3, row))]],
        [4, 3, [at(1, 1), at(1, 2), at(2, 1), at(3, 1)]],
        [2, 2, [at(1, 1), at(2, 1)]],
        [2, 3, [at(1, 1), at(2, 1)]],
        [1, 2, [at(1, 1)]],
        [0, 2, []],
    ])('%i пунктов в %i колонки', (count, columns, expected) => {
        expect(gridPlacement(count, columns)).toEqual(expected)
    })
})

describe('isColumnCount', () => {
    it.each([
        [1, true],
        [2, true],
        [0, false],
        [-1, false],
        [1.5, false],
        [null, false],
        ['3', false],
    ])('isColumnCount(%j) — %s', (value, expected) => {
        expect(isColumnCount(value)).toBe(expected)
    })
})

describe('columnCount', () => {
    it.each([[3, 3], [1, 1], [0, 2], [-1, 2], [1.5, 2], [null, 2], [undefined, 2], ['3', 2]])('columnCount(%j) — %i', (value, expected) => {
        expect(columnCount(value)).toBe(expected)
    })

    it('DEFAULT_COLUMNS — 2', () => {
        expect(DEFAULT_COLUMNS).toBe(2)
    })
})

describe('gridTemplate', () => {
    it('колонки одинаковой ширины, содержимое их не распирает', () => {
        expect(gridTemplate(3)).toEqual({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' })
    })
})
