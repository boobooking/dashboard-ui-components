<template>
    <span class="bb-dashboard-ui bb:relative bb:inline-flex bb:shadow-xs bb:rounded-md">
        <!-- Без дополнительных действий стрелке нечего открывать: её нет,
             и кнопка скругляется с обеих сторон. -->
        <button
            type="button"
            class="bb:relative bb:inline-flex bb:items-center bb:rounded-l-md bb:border bb:border-gray-300 bb:bg-white bb:hover:bg-gray-50 bb:focus:outline-hidden"
            :class="{ 'bb:rounded-r-md': !$slots.actions }"
        >
            <slot name="button"></slot>
        </button>
        <span class="bb:-ml-px bb:relative bb:block" v-if="$slots.actions">
            <button
                @click.prevent="setOpen(!popupIsOpen)"
                :id="menuButtonId"
                type="button"
                class="bb:relative bb:inline-flex bb:items-center bb:px-2 bb:py-2 bb:rounded-r-md bb:border bb:border-gray-300 bb:bg-white bb:text-sm bb:font-medium bb:text-gray-500 bb:hover:bg-gray-50 bb:focus:z-10 bb:focus:outline-hidden bb:focus:ring-1 bb:focus:ring-indigo-500 bb:focus:border-indigo-500"
            >
                <span class="bb:sr-only">{{ texts.openMenu }}</span>
                <svg
                    class="bb:h-5 bb:w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path
                        fill-rule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                    />
                </svg>
            </button>
            <popup
                class="bb:origin-top-right bb:right-0"
                :model-value="popupIsOpen"
                align="right"
                @update:model-value="setOpen"
            >
                <div
                    class="bb:mt-1 bb:w-56 bb:rounded-md bb:shadow-lg bb:bg-white bb:ring-1 bb:ring-black/5"
                    role="menu"
                    aria-orientation="vertical"
                    :aria-labelledby="menuButtonId"
                >
                    <slot name="actions"></slot>
                </div>
            </popup>
        </span>
    </span>
</template>

<script>
import { useId } from "vue";
import Popup from "./Popup.vue";
import { withLang } from "../lang.js";

export default {
    components: {Popup},

    mixins: [withLang],

    emits: ["update:modelValue"],

    props: {
        modelValue: {
            type: Boolean,
            default: false,
        },
    },

    setup() {
        return {
            menuButtonId: useId(),
        };
    },

    data() {
        return {
            popupIsOpen: this.modelValue,
        };
    },

    watch: {
        // Входящее значение только принимается. Ответное событие вернуло бы
        // родителю его же решение, и обработчик вида «закрыли — сбросить
        // выбор» сбросил бы строку, которую родитель только что выбрал.
        modelValue(newValue) {
            this.popupIsOpen = newValue;
        },
    },

    methods: {
        // Единственный путь, которым меню открывается или закрывается по
        // инициативе самого компонента: клик по стрелке или закрытие через
        // Popup (клик вне меню, Escape). Повтор текущего значения не
        // эмитится — так гасится эхо Popup, который возвращает полученное
        // значение обратно.
        setOpen(isOpen) {
            if (isOpen === this.popupIsOpen) {
                return;
            }

            this.popupIsOpen = isOpen;
            this.$emit("update:modelValue", isOpen);
        },
    },
};
</script>
