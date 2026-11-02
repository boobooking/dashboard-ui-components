<template>
    <component :is="icon" class="bb:w-4 bb:h-4 bb:shrink-0 bb:pointer-events-none bb:cursor-default"/>
</template>

<script>
import { ACTION_ICONS, isActionIcon } from "../actionIcons.js";

// Иконка действия по имени. Размер иконок действий задан только здесь, рядом
// с подписью иконка не сжимается. Без имени — пустой блок того же размера:
// пункт меню без иконки держит им текст на одной линии с соседями. Содержимое
// кнопки не ловит указатель и без курсора-руки: см. README, «Клавиатурная
// навигация». Внутренний компонент пакета.
export default {
    props: {
        // Имя из списка src/actionIcons.js.
        name: {
            type: String,
            default: null,
        },
    },

    computed: {
        icon() {
            return isActionIcon(this.name) ? ACTION_ICONS[this.name] : "span";
        },
    },
};
</script>
