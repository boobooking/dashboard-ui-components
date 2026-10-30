export const MAX_DIGITS = 15

// Сумма — целое от 0 до 10^15 в минимальных единицах валюты. Всё остальное,
// включая строки и дроби, считается пустым значением.
export function normalizeAmount(value) {
    if (!Number.isInteger(value) || value < 0 || value >= 10 ** MAX_DIGITS) {
        return null
    }

    return value
}

// Сумма делится на основную часть и копейки в `digits` цифр. Основная часть
// всегда есть: 5 при двух знаках это «0» и «05».
export function splitAmount(amount, digits) {
    if (amount === null) {
        return { whole: '', fraction: '' }
    }

    const text = String(amount).padStart(digits + 1, '0')
    const wholeLength = text.length - digits

    return { whole: text.slice(0, wholeLength), fraction: text.slice(wholeLength) }
}

// Обратное к splitAmount: копейки дополняются нулями справа, пустая основная
// часть — это ноль. Обе части пустые — пустая сумма.
export function joinAmount(whole, fraction, digits) {
    if (whole === '' && fraction === '') {
        return null
    }

    return Number((whole || '0') + fraction.padEnd(digits, '0'))
}

// Основная часть вмещает столько цифр, сколько остаётся после копеек. Лишнее
// справа отбрасывается, ведущие нули убираются, но один ноль остаётся.
export function cleanWhole(text, digits) {
    const stripped = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '')

    return stripped.slice(0, MAX_DIGITS - digits)
}

// Разряды разделяются пробелом в ru и запятой в en.
export function groupWhole(whole, lang) {
    return whole.replace(/\B(?=(\d{3})+$)/g, lang === 'en' ? ',' : ' ')
}

export function decimalSeparator(lang) {
    return lang === 'en' ? '.' : ','
}

// В ru десятичным служат и запятая, и точка (на цифровой клавиатуре точка), в
// en запятая — разделитель разрядов и десятичным не считается.
export function isDecimalKey(key, lang) {
    return key === '.' || (key === ',' && lang !== 'en')
}

// Разбор вставки. Порядок правил:
// 1. пробельные символы по краям убираются;
// 2. остаток — одно неотрицательное число: цифры, разделённые одиночными пробелами,
//    неразрывными пробелами, запятыми или точками;
// 3. если есть оба символа, десятичный — тот, что последний, и он встречается
//    один раз, иначе отказ;
// 4. единственный символ, встреченный один раз, десятичный, кроме запятой в en;
// 5. повторяющийся символ — разделитель разрядов;
// 6. после десятичного символа только цифры;
// 7. целая часть делится разделителями разрядов и пробелами: если групп больше
//    одной, в последней ровно три цифры;
// 8. лишние цифры копеек или цифр всего — отказ (null).
export function parsePastedAmount(text, lang, digits) {
    const trimmed = text.trim()

    if (!/^\d+([ \u00a0\u202f.,]\d+)*$/.test(trimmed)) {
        return null
    }

    const separators = trimmed.match(/[.,]/g) ?? []
    const kinds = new Set(separators)
    let decimal = null

    if (kinds.size === 2) {
        decimal = separators[separators.length - 1]

        if (separators.filter((separator) => separator === decimal).length > 1) {
            return null
        }
    } else if (separators.length === 1 && !(separators[0] === ',' && lang === 'en')) {
        decimal = separators[0]
    }

    let wholeText = trimmed
    let fraction = ''

    if (decimal !== null) {
        const index = trimmed.lastIndexOf(decimal)

        wholeText = trimmed.slice(0, index)
        fraction = trimmed.slice(index + 1)
    }

    const groups = wholeText.split(/[ \u00a0\u202f.,]/)

    if (!/^\d*$/.test(fraction) || (groups.length > 1 && groups[groups.length - 1].length !== 3)) {
        return null
    }

    const whole = groups.join('').replace(/^0+(?=\d)/, '')

    if (fraction.length > digits || whole.length > MAX_DIGITS - digits) {
        return null
    }

    return { whole, fraction }
}
