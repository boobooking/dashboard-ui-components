// Все тексты пакета. Ключи в словарях одинаковые: компонент берёт текст по
// ключу из словаря своего языка (миксин withLang), а не пишет строку сам.
export const LANGS = ['ru', 'en']

export function isLang(value) {
    return LANGS.includes(value)
}

export const messages = {
    ru: {
        cancel: 'Отмена',
        openMenu: 'Открыть меню',
        previousMonth: 'Предыдущий месяц',
        nextMonth: 'Следующий месяц',
        months: [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
        ],
        // Pikaday ждёт дни недели с воскресенья, какой бы ни был firstDay.
        weekdays: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
        weekdaysShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
        dateFrom: 'от',
        dateTo: 'до',
        previousPage: 'Предыдущая',
        nextPage: 'Следующая',
        // «Показаны результаты [1 - 15] из [40]»: числа — в отдельных элементах,
        // поэтому фраза хранится кусками вокруг них.
        resultsBefore: 'Показаны результаты',
        resultsOf: 'из',
        resultsAfter: '',
        // PageCard: доступное имя крестика «назад по истории».
        back: 'Назад',
        // NotificationMessage: подпись крестика для скринридера.
        close: 'Закрыть',
        // TextPopover: подпись кнопки для скринридера и имя области с текстом.
        showText: 'Показать текст',
        fullText: 'Полный текст',
    },
    en: {
        cancel: 'Cancel',
        openMenu: 'Open menu',
        previousMonth: 'Previous month',
        nextMonth: 'Next month',
        months: [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ],
        weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        dateFrom: 'from',
        dateTo: 'to',
        previousPage: 'Previous',
        nextPage: 'Next',
        // «Showing [1 - 15] of [40] results»
        resultsBefore: 'Showing',
        resultsOf: 'of',
        resultsAfter: 'results',
        back: 'Back',
        close: 'Close',
        showText: 'Show text',
        fullText: 'Full text',
    },
}
