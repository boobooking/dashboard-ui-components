<template>
    <span
        class="bb-dashboard-ui bb:inline-flex bb:items-center bb:px-3 bb:py-2 bb:rounded-full bb:text-xs bb:font-medium bb:leading-none bb:select-none bb:whitespace-nowrap"
        :class="colorClass(color, 'pill')"
        v-text="text"
    ></span>
</template>

<script>
import { isColor, withColors } from "../colors.js";

// Пилюля, которая только показывает текст: статус, счётчик, флаг, пометку.
// Цвет — имя из общего списка (src/colors.js). Текст не переносится.
export default {
    mixins: [withColors],

    props: {
        text: {
            type: String,
            required: true,
        },
        color: {
            type: String,
            required: true,
            validator: isColor,
        },
    },
};
</script>
