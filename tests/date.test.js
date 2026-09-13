import { describe, it, expect } from 'vitest'
import { formatDay, parseDay } from '../src/date.js'

describe('parseDay', () => {
    const valid = [
        { name: 'обычная дата', input: '13.09.2026', year: 2026, month: 8, day: 13 },
        { name: 'однозначные день и месяц', input: '1.2.2026', year: 2026, month: 1, day: 1 },
        { name: 'последний день февраля високосного года', input: '29.02.2024', year: 2024, month: 1, day: 29 },
        // Конструктор Date для года 0–99 трактует его как 19xx; компонент
        // обходит это через setFullYear, и обход надо удержать.
        { name: 'двузначный год не подменяется на 19xx', input: '01.01.0016', year: 16, month: 0, day: 1 },
    ]

    for (const testCase of valid) {
        it(testCase.name, () => {
            const date = parseDay(testCase.input)

            expect(date).not.toBeNull()
            expect(date.getFullYear()).toBe(testCase.year)
            expect(date.getMonth()).toBe(testCase.month)
            expect(date.getDate()).toBe(testCase.day)
            expect(date.getHours()).toBe(0)
        })
    }

    const invalid = [
        { name: 'переполнение дня', input: '31.02.2026' },
        { name: 'переполнение месяца', input: '01.13.2026' },
        { name: 'нулевой день', input: '00.01.2026' },
        { name: 'год не из четырёх цифр', input: '01.01.26' },
        { name: 'другой разделитель', input: '01/01/2026' },
        { name: 'мусор', input: 'вчера' },
        { name: 'пустая строка', input: '' },
    ]

    for (const testCase of invalid) {
        it(`отклоняет: ${testCase.name}`, () => {
            expect(parseDay(testCase.input)).toBeNull()
        })
    }
})

describe('formatDay', () => {
    const cases = [
        { name: 'двузначные день и месяц', input: new Date(2026, 8, 13), expected: '13.09.2026' },
        { name: 'однозначные дополняются нулём', input: new Date(2026, 0, 1), expected: '01.01.2026' },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            expect(formatDay(testCase.input)).toBe(testCase.expected)
        })
    }

    it('дополняет нулями год короче четырёх цифр', () => {
        const date = new Date(0)
        date.setFullYear(16, 0, 1)

        expect(formatDay(date)).toBe('01.01.0016')
    })
})
