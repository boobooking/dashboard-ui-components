// Пункты меню DropdownButtonWithAction и HamburgerMenu: проверка для
// валидаторов пропа actions, разбор и цвет для PopoverMenu.
// Внутренний модуль пакета.

import { isColor } from './colors.js'

// Пункт меню — ровно одна из двух форм: переход (href без onSelect) или
// действие (onSelect без href). Поле отсутствует, если оно undefined.
// Цвет — color: имя из общего списка цветов (src/colors.js).
export function isMenuItem(item) {
    if (typeof item !== 'object' || item === null) {
        return false
    }

    if (typeof item.label !== 'string' || item.label === '') {
        return false
    }

    if (item.color !== undefined && !isColor(item.color)) {
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

// Ссылка — только при непустом строковом href; у ссылки onSelect
// не вызывается.
export function isLinkItem(item) {
    return typeof item.href === 'string' && item.href !== ''
}

// Цвет пункта для его классов. Без color и с color вне списка — обычный:
// пункт с неверным color валидатор отклоняет, и рисуется он обычным.
export function itemColor(item) {
    return isColor(item.color) ? item.color : null
}
