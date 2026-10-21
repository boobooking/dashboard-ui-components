// Раскладка пунктов по колонкам для SelectSingleCards и SelectMultipleList.
// Внутренний модуль пакета, правило раскладки — спека §4.3.

export const DEFAULT_COLUMNS = 2

// Валидатор пропа columns: целое число не меньше 1.
export function isColumnCount(value) {
    return Number.isInteger(value) && value >= 1
}

// Число колонок из пропа; при неверном значении — DEFAULT_COLUMNS.
export function columnCount(value) {
    return isColumnCount(value) ? value : DEFAULT_COLUMNS
}

// Стиль сетки: колонки одинаковой ширины, не шире своего содержимого.
export function gridTemplate(columns) {
    return { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
}

// Место пункта по индексу: колонки заполняются по очереди, сверху вниз.
// Первые count % columns колонок получают на одну строку больше остальных.
// Нумерация колонок и строк с 1.
export function gridPlacement(count, columns) {
    const base = Math.floor(count / columns)
    const extra = count % columns
    const placement = []

    for (let column = 0; column < columns; column++) {
        const rows = column < extra ? base + 1 : base

        for (let row = 1; row <= rows; row++) {
            placement.push({ gridColumn: column + 1, gridRow: row })
        }
    }

    return placement
}
