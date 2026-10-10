<template>
    <button
        type="button"
        class="bb-dashboard-ui bb:inline-flex bb:items-center bb:px-3 bb:py-1.5 bb:rounded-full bb:text-xs bb:font-medium bb:leading-none bb:select-none bb:whitespace-nowrap"
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
             иконка — пилюля без иконки. -->
        <clock-icon v-if="isLoading"/>
        <download-icon v-else-if="icon === 'download'"/>
        <refresh-icon v-else-if="icon === 'refresh'"/>
        <span class="bb:ml-1" v-text="label"></span>
    </button>
</template>

<script>
import Clock from "./icons/Clock.vue";
import Download from "./icons/Download.vue";
import Refresh from "./icons/Refresh.vue";
import { isColor, withColors } from "../colors.js";

// Иконки действий: новое действие — новая иконка и новое имя здесь.
const ICONS = ["download", "refresh"];

// Пилюля, которой запускают действие. Что делает действие, пилюля не знает:
// страница слушает click и сама передаёт isLoading, пока действие идёт.
// Кнопка disabled на время работы: второй клик браузер не пропустит.
export default {
    components: {
        "clock-icon": Clock,
        "download-icon": Download,
        "refresh-icon": Refresh,
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
            validator: (value) => ICONS.includes(value),
        },
        // Имя из общего списка цветов (src/colors.js).
        color: {
            type: String,
            default: "purple",
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
        label() {
            const text = this.isLoading && typeof this.loadingText === "string" && this.loadingText !== ""
                ? this.loadingText
                : this.title;

            return typeof text === "string" ? text : "";
        },
    },
};
</script>
