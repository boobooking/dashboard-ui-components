export function formatDay(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).padStart(4, "0");

    return `${day}.${month}.${year}`;
}

export function parseDay(value) {
    const parts = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);

    if (parts === null) {
        return null;
    }

    const [, day, month, year] = parts.map(Number);
    // Конструктор Date для года 0–99 трактует его как 19xx (new Date(16, 0, 1) —
    // это 1916-й, а не 16-й), setFullYear такой подмены не делает.
    const date = new Date(0);

    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);

    // Переполнение (например, 31.02.2026) Date не отклоняет, а тихо переносит на
    // следующий месяц — сверяем компоненты после сборки и отсекаем такие даты сами.
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
        return null;
    }

    return date;
}
