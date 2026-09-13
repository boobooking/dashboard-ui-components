const MAX_DIGITS = 10;

// Из произвольного текста — национальные цифры номера. Ведущие 7 и 8 это код
// страны, набранный по привычке: отбрасываем их, если следом идёт 9, с которой
// начинается любой российский мобильный. На длину не смотрим — неполная
// вставка «8 912» так же законна, как полная.
export function normalizePhoneDigits(text) {
    let digits = text.replace(/\D/g, '');

    if ((digits.startsWith('7') || digits.startsWith('8')) && digits[1] === '9') {
        digits = digits.slice(1);
    }

    return digits.slice(0, MAX_DIGITS);
}

// Наружу компонент отдаёт цифры номера вместе с кодом страны: «+» — неудачный
// символ для URL, поэтому в параметре только цифры, а плюс дописывает бэкенд.
// Внутри компонент живёт национальными цифрами, потому что ими оперирует маска.
export function toParam(digits) {
    return digits === '' ? '' : `7${digits}`;
}

// Плюс терпим: он мог приехать из старой ссылки.
export function toDigits(param) {
    const digits = param.startsWith('+') ? param.slice(1) : param;

    return digits.startsWith('7') ? digits.slice(1) : digits;
}
