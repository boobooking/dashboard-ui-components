import { describe, it, expect } from 'vitest'
import { CURRENCIES, pickCurrencies, currencyLabel } from '../src/currencies.js'

const digitsOf = (code) => CURRENCIES.find((currency) => currency.code === code).digits

describe('CURRENCIES', () => {
    it('156 записей, коды уникальны и отсортированы', () => {
        const codes = CURRENCIES.map((currency) => currency.code)

        expect(codes).toHaveLength(156)
        expect(new Set(codes).size).toBe(156)
        expect(codes).toEqual([...codes].sort())
    })

    it.each(['BOV', 'CHE', 'CHW', 'CLF', 'COU', 'MXV', 'USN', 'UYI', 'UYW'])('фондового кода %s нет', (code) => {
        expect(CURRENCIES.some((currency) => currency.code === code)).toBe(false)
    })

    it('digits — только 0, 2, 3', () => {
        for (const currency of CURRENCIES) {
            expect([0, 2, 3]).toContain(currency.digits)
        }
    })

    it.each(['AFN', 'ALL', 'COP', 'HUF', 'IDR', 'IRR', 'KPW', 'LAK', 'LBP', 'MGA', 'MMK', 'SOS', 'SYP', 'YER'])(
        '%s — 2 знака, а не 0 из Intl',
        (code) => {
            expect(digitsOf(code)).toBe(2)
        },
    )

    it('IQD — 3 знака, JPY — 0, KWD — 3', () => {
        expect(digitsOf('IQD')).toBe(3)
        expect(digitsOf('JPY')).toBe(0)
        expect(digitsOf('KWD')).toBe(3)
    })
})

describe('pickCurrencies', () => {
    it('выбирает записи по кодам', () => {
        expect(pickCurrencies(null)).toBe(CURRENCIES)
        expect(pickCurrencies(undefined)).toBe(CURRENCIES)
        expect(pickCurrencies([])).toEqual([])
        expect(pickCurrencies('USD')).toEqual([])
        expect(pickCurrencies(['USD', 'RUB']).map((c) => c.code)).toEqual(['USD', 'RUB'])
        expect(pickCurrencies(['USD', 'XXX', 'USD', 'usd']).map((c) => c.code)).toEqual(['USD'])
    })
})

describe('currencyLabel', () => {
    it('символ после кода, без символа — один код', () => {
        const find = (code) => CURRENCIES.find((currency) => currency.code === code)

        expect(currencyLabel(find('USD'))).toBe('USD $')
        expect(currencyLabel(find('AED'))).toBe('AED')
        expect(currencyLabel(find('XOF'))).toBe('XOF F CFA')
    })
})
