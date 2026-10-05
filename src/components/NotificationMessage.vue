<template>
    <div
        class="bb-dashboard-ui bb:fixed bb:inset-0 bb:flex bb:items-end bb:justify-center bb:px-4 bb:py-6 bb:pointer-events-none bb:sm:p-6 bb:sm:items-start bb:sm:justify-end"
        :role="isDangerous ? 'alert' : 'status'"
    >
        <!-- Живая область есть всегда: скринридер объявляет изменение области,
             которую уже отслеживает, а область, созданная сразу с текстом,
             может остаться необъявленной (W3C ARIA22). Пустая — невидима и не
             перехватывает клики. -->
        <div
            v-if="hasMessage"
            class="bb:max-w-sm bb:w-full bb:shadow-lg bb:rounded-lg bb:pointer-events-auto bb:ring-1 bb:ring-black/5 bb:overflow-hidden"
            :class="{ 'bb:bg-red-50': isDangerous, 'bb:bg-yellow-50': isWarning, 'bb:bg-gray-50': isConfirmation }"
        >
            <div class="bb:p-4">
                <div class="bb:flex bb:items-start">
                    <div class="bb:shrink-0">
                        <warning v-if="isWarning"/>
                        <dangerous v-if="isDangerous"/>
                        <check v-if="isConfirmation"/>
                    </div>
                    <div class="bb:ml-3 bb:w-0 bb:flex-1 bb:pt-0.5">
                        <p class="bb:text-sm bb:font-medium bb:text-gray-900">{{ notificationHeading }}</p>
                        <p class="bb:mt-1 bb:text-sm bb:text-gray-500">{{ text }}</p>
                    </div>
                    <div class="bb:ml-4 bb:shrink-0 bb:flex">
                        <button
                            type="button"
                            class="bb:rounded-md bb:inline-flex bb:text-gray-400 bb:hover:text-gray-500 bb:focus:outline-hidden bb:focus:ring-2 bb:focus:ring-offset-2 bb:focus:ring-indigo-500"
                            :class="{ 'bb:bg-red-50': isDangerous, 'bb:bg-yellow-50': isWarning, 'bb:bg-gray-50': isConfirmation }"
                            @click.prevent="$emit('update:modelValue', '')"
                        >
                            <span class="bb:sr-only">{{ texts.close }}</span>
                            <close/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import Check from "./icons/Check.vue";
import Close from "./icons/Close.vue";
import Dangerous from "./icons/Dangerous.vue";
import Warning from "./icons/Warning.vue";
import { withLang } from "../lang.js";

// Всплывающее уведомление. Крестик закрывает его сам: эмитит пустой текст,
// поэтому странице достаточно v-model.
export default {
    components: {
        Check,
        Close,
        Dangerous,
        Warning,
    },

    mixins: [withLang],

    emits: ["update:modelValue"],

    props: {
        modelValue: {
            type: String,
            default: "",
        },
        type: {
            type: String,
            default: "warning",
            validator: (value) => {
                return ["confirmation", "warning", "dangerous"].indexOf(value) !== -1;
            },
        },
        notificationHeading: {
            type: String,
            default: "",
        },
    },

    computed: {
        // null — пустой текст: компонент не падает ни на каком значении.
        text() {
            return this.modelValue ?? "";
        },

        hasMessage() {
            return this.text.length > 0;
        },

        isDangerous() {
            return this.type === "dangerous";
        },

        isWarning() {
            return this.type === "warning";
        },

        isConfirmation() {
            return this.type === "confirmation";
        },
    },
};
</script>
