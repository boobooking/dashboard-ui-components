// Общий список цветов пакета: имя цвета — классы каждого места, где цвет
// встречается. Правка оттенка или новый цвет — только здесь. Классы
// записаны целиком, литералами: Tailwind пакета генерирует только те
// утилиты, которые видит в исходниках (@source '../colors.js' в
// styles/index.css), а префикс bb: у каждой проверяет tests/colors.test.js.
// Внутренний модуль пакета.
//
// pill — InfoPill и ActionPill; pillHover — ActionPill, пока не идёт
// работа; button — основная кнопка и стрелка DropdownButtonWithAction;
// menuItem — пункт PopoverMenu; mark — Dot и полоска строки DataTable.
// mark — цвет текста, а не фона: точка красится fill-current, полоска —
// bb:bg-current, и набор у них один.
//
// «Без цвета» — белая кнопка, обычный пункт, строка без полоски — в список
// не входит: это вид компонента по умолчанию, его классы в компоненте.
export const COLORS = {
    gray: {
        pill: 'bb:bg-gray-100 bb:text-gray-800',
        pillHover: 'bb:hover:text-gray-600',
        button: 'bb:bg-gray-100 bb:border-gray-300 bb:text-gray-800 bb:hover:bg-gray-200',
        menuItem: 'bb:text-gray-800 bb:focus:bg-gray-100',
        mark: 'bb:text-gray-500',
    },
    green: {
        pill: 'bb:bg-green-100 bb:text-green-800',
        pillHover: 'bb:hover:text-green-600',
        button: 'bb:bg-green-100 bb:border-green-300 bb:text-green-800 bb:hover:bg-green-200',
        menuItem: 'bb:text-green-800 bb:focus:bg-green-100',
        mark: 'bb:text-green-500',
    },
    yellow: {
        pill: 'bb:bg-yellow-100 bb:text-yellow-800',
        pillHover: 'bb:hover:text-yellow-600',
        button: 'bb:bg-yellow-100 bb:border-yellow-300 bb:text-yellow-800 bb:hover:bg-yellow-200',
        menuItem: 'bb:text-yellow-800 bb:focus:bg-yellow-100',
        mark: 'bb:text-yellow-500',
    },
    red: {
        pill: 'bb:bg-red-100 bb:text-red-800',
        pillHover: 'bb:hover:text-red-600',
        button: 'bb:bg-red-100 bb:border-red-300 bb:text-red-800 bb:hover:bg-red-200',
        menuItem: 'bb:text-red-800 bb:focus:bg-red-100',
        mark: 'bb:text-red-500',
    },
    indigo: {
        pill: 'bb:bg-indigo-100 bb:text-indigo-800',
        pillHover: 'bb:hover:text-indigo-600',
        button: 'bb:bg-indigo-100 bb:border-indigo-300 bb:text-indigo-800 bb:hover:bg-indigo-200',
        menuItem: 'bb:text-indigo-800 bb:focus:bg-indigo-100',
        mark: 'bb:text-indigo-500',
    },
    purple: {
        pill: 'bb:bg-purple-100 bb:text-purple-800',
        pillHover: 'bb:hover:text-purple-600',
        button: 'bb:bg-purple-100 bb:border-purple-300 bb:text-purple-800 bb:hover:bg-purple-200',
        menuItem: 'bb:text-purple-800 bb:focus:bg-purple-100',
        mark: 'bb:text-purple-500',
    },
}

export const COLOR_NAMES = Object.keys(COLORS)

// Только имя из списка: не строка, чужое имя и имена свойств объекта
// (toString, __proto__) — не цвет.
export function isColor(name) {
    return COLOR_NAMES.includes(name)
}

// Неизвестный цвет или набор — пустая строка: компонент рисуется без
// цветовых классов и не падает.
export function colorClass(name, part) {
    return isColor(name) ? COLORS[name][part] ?? '' : ''
}

// Для шаблонов: :class="colorClass(color, 'pill')". Эту форму
// tests/utilityPrefix.test.js принимает в :class.
export const withColors = {
    methods: {
        colorClass,
    },
}
