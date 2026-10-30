import { describe, it, expect } from 'vitest'
import {
    MAX_DIGITS,
    normalizeAmount,
    splitAmount,
    joinAmount,
    cleanWhole,
    groupWhole,
    decimalSeparator,
    isDecimalKey,
    parsePastedAmount,
} from '../src/amount.js'

describe('MAX_DIGITS', () => {
    it('равен 15', () => {
        expect(MAX_DIGITS).toBe(15)
    })
})

describe('normalizeAmount', () => {
    it.each([0, 123456, 999999999999999])('число %s остаётся как есть', (value) => {
        expect(normalizeAmount(value)).toBe(value)
    })

    it.each([-1, 1.5, NaN, '5', null, undefined, 10 ** 15])('значение %s даёт null', (value) => {
        expect(normalizeAmount(value)).toBeNull()
    })
})

describe('splitAmount', () => {
    it.each([
        { amount: 123456, digits: 2, expected: { whole: '1234', fraction: '56' } },
        { amount: 123456, digits: 0, expected: { whole: '123456', fraction: '' } },
        { amount: 123456, digits: 3, expected: { whole: '123', fraction: '456' } },
        { amount: 5, digits: 2, expected: { whole: '0', fraction: '05' } },
        { amount: null, digits: 2, expected: { whole: '', fraction: '' } },
    ])('$amount при digits $digits', ({ amount, digits, expected }) => {
        expect(splitAmount(amount, digits)).toEqual(expected)
    })
})

describe('joinAmount', () => {
    it.each([
        { whole: '1234', fraction: '', digits: 2, expected: 123400 },
        { whole: '1234', fraction: '5', digits: 2, expected: 123450 },
        { whole: '', fraction: '50', digits: 2, expected: 50 },
        { whole: '', fraction: '', digits: 2, expected: null },
        { whole: '123456', fraction: '', digits: 0, expected: 123456 },
    ])('«$whole» + «$fraction» при digits $digits', ({ whole, fraction, digits, expected }) => {
        expect(joinAmount(whole, fraction, digits)).toBe(expected)
    })
})

describe('cleanWhole', () => {
    it.each([
        { name: 'буквы и пробелы выбрасываются, ведущие нули убираются', text: '00a1 2', digits: 2, expected: '12' },
        { name: 'одни нули дают один ноль', text: '000', digits: 2, expected: '0' },
        { name: 'при digits 2 остаётся 13 цифр', text: '1'.repeat(20), digits: 2, expected: '1'.repeat(13) },
        { name: 'при digits 0 остаётся 15 цифр', text: '1'.repeat(20), digits: 0, expected: '1'.repeat(15) },
    ])('$name', ({ text, digits, expected }) => {
        expect(cleanWhole(text, digits)).toBe(expected)
    })
})

describe('groupWhole', () => {
    it.each([
        { whole: '1234567', lang: 'ru', expected: '1 234 567' },
        { whole: '1234567', lang: 'en', expected: '1,234,567' },
        { whole: '', lang: 'ru', expected: '' },
        { whole: '123', lang: 'en', expected: '123' },
    ])('«$whole» в $lang', ({ whole, lang, expected }) => {
        expect(groupWhole(whole, lang)).toBe(expected)
    })
})

describe('decimalSeparator', () => {
    it.each([
        { lang: 'ru', expected: ',' },
        { lang: 'en', expected: '.' },
    ])('$lang', ({ lang, expected }) => {
        expect(decimalSeparator(lang)).toBe(expected)
    })
})

describe('isDecimalKey', () => {
    it.each([
        { key: ',', lang: 'ru', expected: true },
        { key: '.', lang: 'ru', expected: true },
        { key: '.', lang: 'en', expected: true },
        { key: ',', lang: 'en', expected: false },
        { key: '1', lang: 'ru', expected: false },
    ])('«$key» в $lang', ({ key, lang, expected }) => {
        expect(isDecimalKey(key, lang)).toBe(expected)
    })
})

describe('parsePastedAmount', () => {
    it.each([
        { text: '1 234,56', lang: 'ru', digits: 2, expected: { whole: '1234', fraction: '56' } },
        { text: '1234.56', lang: 'ru', digits: 2, expected: { whole: '1234', fraction: '56' } },
        { text: '1,234.56', lang: 'ru', digits: 2, expected: { whole: '1234', fraction: '56' } },
        { text: '1.234,56', lang: 'ru', digits: 2, expected: { whole: '1234', fraction: '56' } },
        { text: '1.234.567', lang: 'ru', digits: 2, expected: { whole: '1234567', fraction: '' } },
        { text: ' 1 234,5', lang: 'ru', digits: 2, expected: { whole: '1234', fraction: '5' } },
        { text: '0,50', lang: 'ru', digits: 2, expected: { whole: '0', fraction: '50' } },
        { text: '007', lang: 'ru', digits: 2, expected: { whole: '7', fraction: '' } },
        { text: '1,234', lang: 'ru', digits: 2, expected: null },
        { text: '1,234', lang: 'en', digits: 2, expected: { whole: '1234', fraction: '' } },
        { text: '1,234.56', lang: 'en', digits: 2, expected: { whole: '1234', fraction: '56' } },
        { text: '1,234,567', lang: 'en', digits: 2, expected: { whole: '1234567', fraction: '' } },
        { text: '1 234,56', lang: 'ru', digits: 0, expected: null },
        { text: '1234', lang: 'ru', digits: 0, expected: { whole: '1234', fraction: '' } },
        { text: '1'.repeat(14), lang: 'ru', digits: 2, expected: null },
        { text: '1'.repeat(13), lang: 'ru', digits: 2, expected: { whole: '1'.repeat(13), fraction: '' } },
        { text: '-100.00', lang: 'ru', digits: 2, expected: null },
        { text: '1e3', lang: 'ru', digits: 2, expected: null },
        { text: '100–200', lang: 'ru', digits: 2, expected: null },
        { text: '1 234,56 ₽', lang: 'ru', digits: 2, expected: null },
        { text: '.50', lang: 'ru', digits: 2, expected: null },
        { text: '', lang: 'ru', digits: 2, expected: null },
    ])('«$text» в $lang при digits $digits', ({ text, lang, digits, expected }) => {
        expect(parsePastedAmount(text, lang, digits)).toEqual(expected)
    })

    it('неразрывные пробелы убираются', () => {
        expect(parsePastedAmount('1 234,56', 'ru', 2)).toEqual({ whole: '1234', fraction: '56' })
    })
})
