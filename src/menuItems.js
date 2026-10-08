// Пункты меню DropdownButtonWithAction и HamburgerMenu: проверка для
// валидаторов пропа actions и разбор для PopoverMenu.
// Внутренний модуль пакета.

// Пункт меню — ровно одна из двух форм: переход (href без onSelect) или
// действие (onSelect без href). Поле отсутствует, если оно undefined.
export function isMenuItem(item) {
    if (typeof item !== 'object' || item === null) {
        return false
    }

    if (typeof item.label !== 'string' || item.label === '') {
        return false
    }

    if (item.danger !== undefined && typeof item.danger !== 'boolean') {
        return false
    }

    const isLink = typeof item.href === 'string' && item.href !== '' && item.onSelect === undefined
    const isCommand = typeof item.onSelect === 'function' && item.href === undefined

    return isLink || isCommand
}

// Валидатор только предупреждает и данные не исправляет, поэтому меню
// не падает ни на каком значении: не массив — пустой список, элементы-
// необъекты пропускаются.
export function toMenuItems(actions) {
    if (!Array.isArray(actions)) {
        return []
    }

    return actions.filter((item) => typeof item === 'object' && item !== null)
}
