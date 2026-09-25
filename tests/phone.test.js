import { describe, it, expect } from 'vitest'
import { normalizePhoneDigits, toDigits, toParam } from '../src/phone.js'

describe('normalizePhoneDigits', () => {
    const cases = [
        { name: 'маска целиком', input: '+7 (903) 123 45 67', expected: '9031234567' },
        { name: 'восьмёрка кода страны отбрасывается', input: '89031234567', expected: '9031234567' },
        { name: 'семёрка кода страны отбрасывается', input: '79031234567', expected: '9031234567' },
        { name: 'неполная вставка тоже разбирается', input: '8 912', expected: '912' },
        // Ведущая семёрка отбрасывается только перед девяткой: иначе это первая
        // цифра самого номера, а не код страны.
        { name: 'семёрка не перед девяткой остаётся', input: '7777777777', expected: '7777777777' },
        { name: 'буквы выбрасываются', input: 'тел. 903', expected: '903' },
        { name: 'хвост длиннее десяти цифр обрезается', input: '89031234567890', expected: '9031234567' },
        { name: 'пустой текст', input: '', expected: '' },
        { name: 'текст без цифр', input: 'нет номера', expected: '' },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            expect(normalizePhoneDigits(testCase.input)).toBe(testCase.expected)
        })
    }
})

describe('toParam', () => {
    const cases = [
        { name: 'пустое значение остаётся пустым', input: '', expected: '' },
        { name: 'к полному номеру приписывается код страны', input: '9031234567', expected: '79031234567' },
        { name: 'к неполному тоже', input: '903', expected: '7903' },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            expect(toParam(testCase.input)).toBe(testCase.expected)
        })
    }
})

describe('toDigits', () => {
    const cases = [
        { name: 'пустое значение остаётся пустым', input: '', expected: '' },
        { name: 'код страны снимается', input: '79031234567', expected: '9031234567' },
        { name: 'плюс из старой ссылки терпим', input: '+79031234567', expected: '9031234567' },
        { name: 'значение без кода страны не трогаем', input: '9031234567', expected: '9031234567' },
        { name: 'null — пустое значение', input: null, expected: '' },
        { name: 'undefined — пустое значение', input: undefined, expected: '' },
    ]

    for (const testCase of cases) {
        it(testCase.name, () => {
            expect(toDigits(testCase.input)).toBe(testCase.expected)
        })
    }
})
