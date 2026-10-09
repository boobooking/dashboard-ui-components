// Пункты меню DropdownButtonWithAction и HamburgerMenu: проверка для
// валидаторов пропа actions, разбор и цвет для PopoverMenu, предупреждение
// об убранном поле danger.
// Внутренний модуль пакета.

// Цвета пункта; пункт без color — обычный.
const COLORS = ['yellow', 'red']

// Пункт меню — ровно одна из двух форм: переход (href без onSelect) или
// действие (onSelect без href). Поле отсутствует, если оно undefined.
// Цвет — color: 'yellow' или 'red'. Поля danger нет: пункт с ним неверен.
export function isMenuItem(item) {
    if (typeof item !== 'object' || item === null) {
        return false
    }

    if (typeof item.label !== 'string' || item.label === '') {
        return false
    }

    if (item.color !== undefined && !COLORS.includes(item.color)) {
        return false
    }

    if (item.danger !== undefined) {
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

// Цвет пункта для его классов. Без color, с неверным color и с убранным
// полем danger — обычный: такой пункт валидатор отклоняет, и рисуется он
// обычным, какой бы color у него ни был.
export function itemColor(item) {
    if (item.danger !== undefined) {
        return null
    }

    return COLORS.includes(item.color) ? item.color : null
}

// Пункт с убранным полем danger валидатор отклоняет без объяснения, поэтому
// компонент называет замену сам. Один раз на экземпляр: список, записанный
// в шаблоне родителя, создаётся заново при каждой его перерисовке, и
// предупреждение повторялось бы на каждую. Наблюдатель глубокий: пункт
// с danger, добавленный в тот же массив, тоже замечен. Проверку
// process.env.NODE_ENV подменяет бандлер проекта, как у самого Vue:
// в продакшен-сборке предупреждения нет.
export function warnsRemovedDanger(componentName) {
    return {
        data() {
            return {
                dangerWarned: false,
            }
        },

        watch: {
            actions: {
                immediate: true,
                deep: true,
                handler(actions) {
                    if (process.env.NODE_ENV === 'production' || this.dangerWarned) {
                        return
                    }

                    if (toMenuItems(actions).some((item) => item.danger !== undefined)) {
                        this.dangerWarned = true
                        console.warn(`[dashboard-ui-components] ${componentName}: поле danger убрано, красный пункт — color: 'red'`)
                    }
                },
            },
        },
    }
}
