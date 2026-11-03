// Общий список цветов пакета: имя цвета — классы каждого места, где цвет
// встречается. Каждый цвет в двух видах: <цвет>-solid — яркий,
// <цвет>-pale — бледный. Правка оттенка или новый цвет — только здесь. Классы
// записаны целиком, литералами: Tailwind пакета генерирует только те
// утилиты, которые видит в исходниках (@source '../colors.js' в
// styles/index.css), а префикс bb: у каждой проверяет tests/colors.test.js.
// Внутренний модуль пакета.
//
// pill — InfoPill и ActionPill; pillHover — ActionPill, пока не идёт
// работа; button — основная кнопка и стрелка DropdownButtonWithAction;
// buttonHover — наведение кнопки и стрелки отдельным набором, чтобы
// не брать его у выключенной кнопки; menuItem — пункт PopoverMenu: фон
// цвета всегда, темнее при наведении и фокусе; mark — Dot и полоска
// строки DataTable.
// mark — цвет текста, а не фона: точка красится fill-current, полоска —
// bb:bg-current, и набор у них один.
//
// «Без цвета» — белая кнопка, обычный пункт, строка без полоски — в список
// не входит: это вид компонента по умолчанию, его классы в компоненте.
export const COLORS = {
    'gray-solid': {
        pill: 'bb:bg-gray-500 bb:text-white',
        pillHover: 'bb:hover:bg-gray-600',
        button: 'bb:bg-gray-500 bb:border-gray-600 bb:text-white',
        buttonHover: 'bb:hover:bg-gray-600',
        menuItem: 'bb:bg-gray-500 bb:text-white bb:hover:bg-gray-600 bb:focus:bg-gray-600',
        mark: 'bb:text-gray-500',
    },
    'gray-pale': {
        pill: 'bb:bg-gray-100 bb:text-gray-800',
        pillHover: 'bb:hover:text-gray-600',
        button: 'bb:bg-gray-100 bb:border-gray-300 bb:text-gray-800',
        buttonHover: 'bb:hover:bg-gray-200',
        menuItem: 'bb:bg-gray-100 bb:text-gray-800 bb:hover:bg-gray-200 bb:focus:bg-gray-200',
        mark: 'bb:text-gray-500',
    },
    'green-solid': {
        pill: 'bb:bg-green-600 bb:text-white',
        pillHover: 'bb:hover:bg-green-700',
        button: 'bb:bg-green-600 bb:border-green-700 bb:text-white',
        buttonHover: 'bb:hover:bg-green-700',
        menuItem: 'bb:bg-green-600 bb:text-white bb:hover:bg-green-700 bb:focus:bg-green-700',
        mark: 'bb:text-green-500',
    },
    'green-pale': {
        pill: 'bb:bg-green-100 bb:text-green-800',
        pillHover: 'bb:hover:text-green-600',
        button: 'bb:bg-green-100 bb:border-green-300 bb:text-green-800',
        buttonHover: 'bb:hover:bg-green-200',
        menuItem: 'bb:bg-green-100 bb:text-green-800 bb:hover:bg-green-200 bb:focus:bg-green-200',
        mark: 'bb:text-green-500',
    },
    'yellow-solid': {
        pill: 'bb:bg-yellow-300 bb:text-yellow-950',
        pillHover: 'bb:hover:bg-yellow-400',
        button: 'bb:bg-yellow-300 bb:border-yellow-400 bb:text-yellow-950',
        buttonHover: 'bb:hover:bg-yellow-400',
        menuItem: 'bb:bg-yellow-300 bb:text-yellow-950 bb:hover:bg-yellow-400 bb:focus:bg-yellow-400',
        mark: 'bb:text-yellow-500',
    },
    'yellow-pale': {
        pill: 'bb:bg-yellow-100 bb:text-yellow-800',
        pillHover: 'bb:hover:text-yellow-600',
        button: 'bb:bg-yellow-100 bb:border-yellow-300 bb:text-yellow-800',
        buttonHover: 'bb:hover:bg-yellow-200',
        menuItem: 'bb:bg-yellow-100 bb:text-yellow-800 bb:hover:bg-yellow-200 bb:focus:bg-yellow-200',
        mark: 'bb:text-yellow-500',
    },
    'red-solid': {
        pill: 'bb:bg-red-600 bb:text-white',
        pillHover: 'bb:hover:bg-red-700',
        button: 'bb:bg-red-600 bb:border-red-700 bb:text-white',
        buttonHover: 'bb:hover:bg-red-700',
        menuItem: 'bb:bg-red-600 bb:text-white bb:hover:bg-red-700 bb:focus:bg-red-700',
        mark: 'bb:text-red-500',
    },
    'red-pale': {
        pill: 'bb:bg-red-100 bb:text-red-800',
        pillHover: 'bb:hover:text-red-600',
        button: 'bb:bg-red-100 bb:border-red-300 bb:text-red-800',
        buttonHover: 'bb:hover:bg-red-200',
        menuItem: 'bb:bg-red-100 bb:text-red-800 bb:hover:bg-red-200 bb:focus:bg-red-200',
        mark: 'bb:text-red-500',
    },
    'indigo-solid': {
        pill: 'bb:bg-indigo-500 bb:text-white',
        pillHover: 'bb:hover:bg-indigo-600',
        button: 'bb:bg-indigo-500 bb:border-indigo-600 bb:text-white',
        buttonHover: 'bb:hover:bg-indigo-600',
        menuItem: 'bb:bg-indigo-500 bb:text-white bb:hover:bg-indigo-600 bb:focus:bg-indigo-600',
        mark: 'bb:text-indigo-500',
    },
    'indigo-pale': {
        pill: 'bb:bg-indigo-100 bb:text-indigo-800',
        pillHover: 'bb:hover:text-indigo-600',
        button: 'bb:bg-indigo-100 bb:border-indigo-300 bb:text-indigo-800',
        buttonHover: 'bb:hover:bg-indigo-200',
        menuItem: 'bb:bg-indigo-100 bb:text-indigo-800 bb:hover:bg-indigo-200 bb:focus:bg-indigo-200',
        mark: 'bb:text-indigo-500',
    },
    'purple-solid': {
        pill: 'bb:bg-purple-500 bb:text-white',
        pillHover: 'bb:hover:bg-purple-600',
        button: 'bb:bg-purple-500 bb:border-purple-600 bb:text-white',
        buttonHover: 'bb:hover:bg-purple-600',
        menuItem: 'bb:bg-purple-500 bb:text-white bb:hover:bg-purple-600 bb:focus:bg-purple-600',
        mark: 'bb:text-purple-500',
    },
    'purple-pale': {
        pill: 'bb:bg-purple-100 bb:text-purple-800',
        pillHover: 'bb:hover:text-purple-600',
        button: 'bb:bg-purple-100 bb:border-purple-300 bb:text-purple-800',
        buttonHover: 'bb:hover:bg-purple-200',
        menuItem: 'bb:bg-purple-100 bb:text-purple-800 bb:hover:bg-purple-200 bb:focus:bg-purple-200',
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
