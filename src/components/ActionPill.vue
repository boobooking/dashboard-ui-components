<template>
    <button
        type="button"
        class="bb-dashboard-ui bb:inline-flex bb:items-center bb:px-3 bb:py-1.5 bb:rounded-full bb:text-xs bb:font-medium bb:leading-none bb:select-none bb:whitespace-nowrap bb:focus-visible:focus-ring"
        :class="[
            colorClass(color, 'pill'),
            isLoading ? 'bb:opacity-60 bb:cursor-not-allowed' : 'bb:cursor-pointer',
            isLoading ? '' : colorClass(color, 'pillHover'),
        ]"
        :title="label"
        :disabled="isLoading"
        :aria-busy="isLoading ? 'true' : null"
        @click="$emit('click')"
    >
        <!-- Пока идёт работа — часы вместо иконки действия. Неизвестная
             иконка — пилюля без иконки. Содержимое кнопки не ловит указатель
             и без курсора-руки: см. README, «Клавиатурная навигация». -->
        <clock-icon v-if="isLoading" class="bb:pointer-events-none bb:cursor-default"/>
        <action-icon v-else-if="hasIcon" :name="icon"/>
        <span class="bb:ml-1 bb:pointer-events-none bb:cursor-default" v-text="label"></span>
    </button>
</template>

<script>
import Clock from "./icons/Clock.vue";
import ActionIcon from "./ActionIcon.vue";
import { isActionIcon } from "../actionIcons.js";
import { isColor, withColors } from "../colors.js";

// Пилюля, которой запускают действие. Что делает действие, пилюля не знает:
// страница слушает click и сама передаёт isLoading, пока действие идёт.
// Кнопка disabled на время работы: второй клик браузер не пропустит.
export default {
    components: {
        "clock-icon": Clock,
        "action-icon": ActionIcon,
    },

    mixins: [withColors],

    emits: ["click"],

    props: {
        // Подпись и всплывающая подсказка.
        title: {
            type: String,
            required: true,
        },
        icon: {
            type: String,
            required: true,
            validator: isActionIcon,
        },
        // Имя из общего списка цветов (src/colors.js).
        color: {
            type: String,
            default: "purple-pale",
            validator: isColor,
        },
        // Идёт работа: пилюля погашена, вместо иконки — часы.
        isLoading: {
            type: Boolean,
            default: false,
        },
        // Подпись на время работы; null и пустая строка — остаётся title.
        loadingText: {
            type: String,
            default: null,
        },
    },

    computed: {
        hasIcon() {
            return isActionIcon(this.icon);
        },

        label() {
            const text = this.isLoading && typeof this.loadingText === "string" && this.loadingText !== ""
                ? this.loadingText
                : this.title;

            return typeof text === "string" ? text : "";
        },
    },
};
</script>
