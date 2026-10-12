// Календарь PickDay с клавиатуры. Внутренний модуль пакета.

// Дни и стрелки месяцев Pikaday — кнопки; день — с датой в data-pika-*,
// месяц в data-pika-month считается с нуля.
const DAY = '.pika-button.pika-day'
const PICKS = '.pika-button, .pika-prev, .pika-next'

// Pikaday выбирает день и листает месяцы по mousedown, а Enter и пробел
// на кнопке и element.click() расширений клавиатурной навигации (Vimlike,
// Vimari) дают только click. Такой click — без нажатия мыши, detail у него 0 —
// календарь получает как mousedown, и выбор идёт тем же путём, что мышью.
// Клик мышью или касанием (detail от 1) Pikaday уже обработал по mousedown
// или touchend.
//
// mousedown — следующей задачей, когда click уже всплыл: Pikaday тут же
// перерисовывает календарь, и оторванная от документа кнопка показалась бы
// слушателям выше по дереву кликом вне панели — и закрытию по клику вне
// тоже. Фокус со стрелки месяца после перерисовки переходит на новую стрелку:
// иначе он ушёл бы на body, и следующий Enter не листал бы дальше. Фокус
// с выбранного дня — на элемент из findReturnFocus (кнопку поля): Pikaday
// перерисовывает календарь до того, как сообщает о выборе, и панель
// закрывается, когда фокус уже потерян. Возвращает функцию, снимающую
// слушатель.
export function pickOnClick(calendar, findReturnFocus = () => null) {
    const onClick = (event) => {
        if (event.detail !== 0) {
            return
        }

        const target = event.target.closest(PICKS)
        if (target === null || !calendar.contains(target)) {
            return
        }

        setTimeout(() => {
            const hadFocus = document.activeElement === target
            target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))

            if (!hadFocus || target.isConnected) {
                return
            }

            const arrow = ['pika-prev', 'pika-next'].find((name) => target.classList.contains(name))
            if (arrow !== undefined) {
                calendar.querySelector(`.${arrow}`)?.focus()
            } else {
                findReturnFocus()?.focus({ preventScroll: true })
            }
        }, 0)
    }

    calendar.addEventListener('click', onClick)

    return () => calendar.removeEventListener('click', onClick)
}

const STEPS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }

// Стрелки ведут фокус по дням открытого календаря: влево и вправо — на день,
// вверх и вниз — на неделю; день за краем месяца календарь показывает,
// листая месяц, и дата при этом не выбирается. Пока фокус не на дне, первая
// стрелка ставит его на выбранный день, без выбранного — на сегодня. Слушатель
// висит на document в фазе захвата, как у меню (menuFocus.js): фокус может
// быть где угодно, а расширения браузера останавливают keydown на body.
// Стрелки в поле или выпадающем списке месяца и года остаются им. Перехваченные
// стрелки страницу не прокручивают. Возвращает функцию, снимающую слушатель.
export function moveDayFocus(calendar, picker) {
    const onKeydown = (event) => {
        const step = STEPS[event.key]
        if (step === undefined || isField(document.activeElement)) {
            return
        }

        event.preventDefault()

        const focused = document.activeElement?.closest(DAY) ?? null
        const target = focused !== null && calendar.contains(focused)
            ? addDays(dateOf(focused), step)
            : picker.getDate() ?? today()

        if (dayButton(calendar, target) === null) {
            picker.gotoDate(target)
        }

        dayButton(calendar, target)?.focus()
    }

    document.addEventListener('keydown', onKeydown, true)

    return () => document.removeEventListener('keydown', onKeydown, true)
}

function isField(element) {
    return element !== null && element.matches('input, select, textarea, [contenteditable]')
}

function dateOf(day) {
    return new Date(day.dataset.pikaYear, day.dataset.pikaMonth, day.dataset.pikaDay)
}

function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function today() {
    const now = new Date()

    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function dayButton(calendar, date) {
    return calendar.querySelector(
        `${DAY}[data-pika-year="${date.getFullYear()}"][data-pika-month="${date.getMonth()}"][data-pika-day="${date.getDate()}"]`,
    )
}
