// Всплывающий элемент на Popover API: браузер выводит его в верхний слой
// поверх страницы, и его не обрезает ни одна обёртка с прокруткой.
// Внутренний модуль пакета: им ставит на место панель PopoverPanel — меню
// DropdownButtonWithAction и HamburgerMenu, список SelectSingle и календарь
// PickDay.

// Зазор от кнопки и отступ от края окна, px.
const GAP = 4
const VIEWPORT_MARGIN = 8

// Popover API нет в браузерах старше Safari 17, Chrome 114 и Firefox 125:
// там элемент виден в потоке всегда, и управлять им нечем.
export function canControlPopover(element) {
    return typeof element?.showPopover === 'function'
}

export function isPopoverOpen(element) {
    return canControlPopover(element) && element.matches(':popover-open')
}

// Место элемента у кнопки. align "end" — правый край элемента по правому
// краю кнопки: кнопки меню стоят у правого края строк и ячеек, и элемент
// растёт влево, к середине страницы. align "start" — левый край по левому
// краю кнопки, как у списка и календаря поля; если справа места меньше, чем
// слева, элемент прижимается правым краем: у правого края окна он ушёл бы
// за экран, а верхний слой не прокручивается. По вертикали — туда, где
// больше места; высота ограничена этим местом. Ширина у "start" ограничена
// местом с той стороны, куда элемент растёт, и у обоих — maxWidth, если он
// задан. Размер самого элемента для расчёта не нужен, поэтому функцию зовут
// в beforetoggle, до его появления: он открывается сразу на своём месте.
// Координаты ставятся все каждый раз: прошлое открытие могло быть у другой
// кнопки или другой стороной.
export function placePopover(anchor, popover, { maxWidth = null, align = 'end' } = {}) {
    const rect = anchor.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth
    const viewportHeight = document.documentElement.clientHeight

    const left = Math.max(VIEWPORT_MARGIN, rect.left)
    const right = Math.max(VIEWPORT_MARGIN, viewportWidth - rect.right)
    const spaceRight = Math.max(0, viewportWidth - left - VIEWPORT_MARGIN)
    const spaceLeft = Math.max(0, viewportWidth - right - VIEWPORT_MARGIN)
    const growsRight = align === 'start' && spaceRight >= spaceLeft
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom - GAP - VIEWPORT_MARGIN)
    const spaceAbove = Math.max(0, rect.top - GAP - VIEWPORT_MARGIN)
    const opensBelow = spaceBelow >= spaceAbove

    // Меню без maxWidth ширину задаёт себе само (bb:w-56).
    let width = ''
    if (align === 'start') {
        const space = growsRight ? spaceRight : spaceLeft
        width = `${maxWidth === null ? space : Math.min(maxWidth, space)}px`
    } else if (maxWidth !== null) {
        width = `${Math.min(maxWidth, spaceLeft)}px`
    }

    Object.assign(popover.style, {
        top: opensBelow ? `${rect.bottom + GAP}px` : 'auto',
        bottom: opensBelow ? 'auto' : `${viewportHeight - rect.top + GAP}px`,
        right: growsRight ? 'auto' : `${right}px`,
        left: growsRight ? `${left}px` : 'auto',
        maxHeight: `${opensBelow ? spaceBelow : spaceAbove}px`,
        maxWidth: width,
    })
}

// Прокрутка любого блока страницы и изменение размера окна закрывают элемент:
// догонять кнопку — лишний код. capture — потому что scroll не всплывает,
// а прокручиваться может обёртка таблицы. Прокрутка самого элемента — чтение
// длинного содержимого, она не закрывает. Возвращает функцию, снимающую
// оба слушателя.
export function closeOnScrollAndResize(popover, close) {
    const onScroll = (event) => {
        if (popover.contains(event.target)) {
            return
        }

        close()
    }

    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', close)

    return () => {
        window.removeEventListener('scroll', onScroll, { capture: true })
        window.removeEventListener('resize', close)
    }
}
