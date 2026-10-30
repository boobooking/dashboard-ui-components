import { describe, it, expect } from 'vitest'
import { CURRENCIES, pickCurrencies, currencyLabel, currencyItems } from '../src/currencies.js'

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

    it('symbol — null или непустая строка без пробелов по краям и не «-»', () => {
        for (const currency of CURRENCIES) {
            if (currency.symbol === null) {
                continue
            }

            expect(typeof currency.symbol, currency.code).toBe('string')
            expect(currency.symbol, currency.code).not.toBe('')
            expect(currency.symbol, currency.code).toBe(currency.symbol.trim())
            expect(currency.symbol, currency.code).not.toBe('-')
        }
    })

    it('IQD — 3 знака, JPY — 0, KWD — 3', () => {
        expect(digitsOf('IQD')).toBe(3)
        expect(digitsOf('JPY')).toBe(0)
        expect(digitsOf('KWD')).toBe(3)
    })
})

describe('pickCurrencies', () => {
    const codesOf = (codes) => pickCurrencies(codes).map((currency) => currency.code)

    it('null — весь список', () => {
        expect(pickCurrencies(null)).toBe(CURRENCIES)
    })

    it('undefined — весь список', () => {
        expect(pickCurrencies(undefined)).toBe(CURRENCIES)
    })

    it('пустой массив — пустой список', () => {
        expect(pickCurrencies([])).toEqual([])
    })

    it('не массив — пустой список', () => {
        expect(pickCurrencies('USD')).toEqual([])
    })

    it('записи идут в порядке массива', () => {
        expect(codesOf(['USD', 'RUB'])).toEqual(['USD', 'RUB'])
    })

    it('повторы, неизвестные коды и другой регистр пропускаются', () => {
        expect(codesOf(['USD', 'XXX', 'USD', 'usd'])).toEqual(['USD'])
    })
})

describe('currencyLabel', () => {
    it('символ после кода, без символа — один код', () => {
        const find = (code) => CURRENCIES.find((currency) => currency.code === code)

        expect(currencyLabel(find('USD'))).toBe('USD $')
        expect(currencyLabel(find('AED'))).toBe('AED')
        expect(currencyLabel(find('XOF'))).toBe('XOF F CFA')
        expect(currencyLabel(find('ZWG'))).toBe('ZWG')
    })
})

describe('currencyItems', () => {
    it('записи таблицы становятся пунктами списка в том же порядке', () => {
        expect(currencyItems(pickCurrencies(['USD', 'AED']))).toEqual([
            { id: 'USD', name: 'USD $' },
            { id: 'AED', name: 'AED' },
        ])
    })

    it('пустой список — нет пунктов', () => {
        expect(currencyItems([])).toEqual([])
    })
})
