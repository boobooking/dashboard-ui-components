// Иконки действий DropdownButtonWithAction и HamburgerMenu: имя из поля icon
// пункта — компонент иконки. Новая иконка — файл в components/icons без своего
// размера и новое имя здесь. Внутренний модуль пакета.

import Plus from './components/icons/Plus.vue'

export const ACTION_ICONS = { plus: Plus }

export function isActionIcon(name) {
    return typeof name === 'string' && Object.hasOwn(ACTION_ICONS, name)
}
