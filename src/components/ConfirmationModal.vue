<template>
    <!-- Escape в открытой модалке — то же, что кнопка отмены. -->
    <modal :is-open="isOpen" :heading-id="headingId" @escape="$emit('actionCanceled')">
        <!-- Панель Modal не обрезает содержимое, поэтому внешние углы блоков
             скругляются здесь тем же радиусом: иначе их фон закрыл бы скругление панели. -->
        <div class="bb:flex bb:bg-white bb:rounded-t-lg bb:p-6 bb:pb-4">
            <div class="bb:flex bb:items-start">
                <div
                    class="bb:shrink-0 bb:flex bb:items-center bb:justify-center bb:h-10 bb:w-10 bb:rounded-full"
                    :class="{ 'bb:bg-red-100': isDangerous, 'bb:bg-yellow-100': isWarning }"
                >
                    <warning v-if="isWarning"/>
                    <dangerous v-if="isDangerous"/>
                </div>
                <div class="bb:ml-4 bb:text-left">
                    <h3 class="bb:text-lg bb:leading-6 bb:font-medium bb:text-gray-900" :id="headingId">
                        {{ confirmationHeading }}
                    </h3>
                    <div class="bb:mt-2">
                        <p class="bb:text-sm bb:text-gray-500">{{ confirmationText }}</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="bb:bg-gray-50 bb:rounded-b-lg bb:px-6 bb:py-3 bb:flex bb:flex-row-reverse">
            <button
                type="button"
                class="bb:inline-flex bb:justify-center bb:rounded-md bb:border bb:border-transparent bb:shadow-xs bb:px-4 bb:py-2 bb:text-sm bb:font-medium bb:text-white bb:focus:focus-ring bb:ml-3"
                :class="{
                    'bb:bg-red-600 bb:hover:bg-red-700': isDangerous,
                    'bb:bg-yellow-400 bb:hover:bg-yellow-500': isWarning,
                }"
                @click.prevent="$emit('actionConfirmed')"
            >
                {{ actionButtonText }}
            </button>
            <!-- Фокус открытой модалки — на отмене: Enter сразу после
                 открытия действие не выполнит. -->
            <button
                type="button"
                class="bb:inline-flex bb:justify-center bb:rounded-md bb:border bb:border-gray-300 bb:shadow-xs bb:px-4 bb:py-2 bb:bg-white bb:text-sm bb:font-medium bb:text-gray-700 bb:hover:bg-gray-50 bb:focus:focus-ring bb:ml-3"
                data-dialog-focus
                @click.prevent="$emit('actionCanceled')"
            >
                {{ cancelButtonText ?? texts.cancel }}
            </button>
        </div>
    </modal>
</template>

<script>
import { useId } from "vue";
import Modal from "./Modal.vue";
import Dangerous from "./icons/Dangerous.vue";
import Warning from "./icons/Warning.vue";
import { withLang } from "../lang.js";

export default {
    components: {
        Modal,
        Dangerous,
        Warning,
    },

    mixins: [withLang],

    emits: ["actionConfirmed", "actionCanceled"],

    props: {
        isOpen: {
            type: Boolean,
            default: false,
        },
        type: {
            type: String,
            default: "warning",
            validator: (value) => {
                return ["warning", "dangerous"].indexOf(value) !== -1;
            },
        },
        confirmationHeading: {
            type: String,
            default: "",
        },
        confirmationText: {
            type: String,
            default: "",
        },
        // Не задан — текст кнопки из словаря языка; явно переданный главнее языка.
        cancelButtonText: {
            type: String,
            default: null,
        },
        actionButtonText: {
            type: String,
            required: true,
        },
    },

    // useId() уникален в пределах приложения: две модалки на одной странице
    // получают разные id заголовков, и aria-labelledby каждой указывает на
    // свой заголовок, а не на первый попавшийся.
    setup() {
        return {
            headingId: useId(),
        };
    },

    computed: {
        isDangerous() {
            return this.type === "dangerous";
        },

        isWarning() {
            return this.type === "warning";
        },
    },
};
</script>
