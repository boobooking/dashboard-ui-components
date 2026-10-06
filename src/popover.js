// Всплывающий элемент на Popover API: браузер выводит его в верхний слой
// поверх страницы, и его не обрезает ни одна обёртка с прокруткой.
// Внутренний модуль пакета: им ставят на место меню DropdownButtonWithAction.

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

// Правый край элемента — по правому краю кнопки: кнопки стоят у правого края
// строк и ячеек, и элемент растёт влево, к середине страницы. По вертикали —
// туда, где больше места; высота ограничена этим местом, а ширина — местом
// слева, если задан maxWidth. Размер самого элемента для расчёта не нужен,
// поэтому функцию зовут в beforetoggle, до его появления: он открывается
// сразу на своём месте.
export function placePopover(anchor, popover, { maxWidth = null } = {}) {
    const rect = anchor.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth
    const viewportHeight = document.documentElement.clientHeight

    const right = Math.max(VIEWPORT_MARGIN, viewportWidth - rect.right)
    const spaceLeft = Math.max(0, viewportWidth - right - VIEWPORT_MARGIN)
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom - GAP - VIEWPORT_MARGIN)
    const spaceAbove = Math.max(0, rect.top - GAP - VIEWPORT_MARGIN)
    const opensBelow = spaceBelow >= spaceAbove

    Object.assign(popover.style, {
        top: opensBelow ? `${rect.bottom + GAP}px` : 'auto',
        bottom: opensBelow ? 'auto' : `${viewportHeight - rect.top + GAP}px`,
        right: `${right}px`,
        left: 'auto',
        maxHeight: `${opensBelow ? spaceBelow : spaceAbove}px`,
    })

    if (maxWidth !== null) {
        popover.style.maxWidth = `${Math.min(maxWidth, spaceLeft)}px`
    }
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
