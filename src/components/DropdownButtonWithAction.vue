<template>
    <span class="bb-dashboard-ui relative inline-flex shadow-xs rounded-md">
        <!-- Без дополнительных действий стрелке нечего открывать: её нет,
             и кнопка скругляется с обеих сторон. -->
        <button
            type="button"
            class="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white hover:bg-gray-50 focus:outline-hidden"
            :class="{ 'rounded-r-md': !$slots.actions }"
        >
            <slot name="button"></slot>
        </button>
        <span class="-ml-px relative block" v-if="$slots.actions">
            <button
                @click.prevent="setOpen(!popupIsOpen)"
                :id="menuButtonId"
                type="button"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-10 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
                <span class="sr-only">Открыть меню</span>
                <svg
                    class="h-5 w-5"
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
                class="origin-top-right right-0"
                :model-value="popupIsOpen"
                align="right"
                @update:model-value="setOpen"
            >
                <div
                    class="mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black/5"
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

export default {
    components: {Popup},

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
