<template>
    <modal :is-open="isOpen" :heading-id="headingId">
        <div class="flex bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
                <div
                    class="mx-auto shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10"
                    :class="{ 'bg-red-100': isDangerous, 'bg-yellow-100': isWarning }"
                >
                    <warning v-if="isWarning"/>
                    <dangerous v-if="isDangerous"/>
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 class="text-lg leading-6 font-medium text-gray-900" :id="headingId">
                        {{ confirmationHeading }}
                    </h3>
                    <div class="mt-2">
                        <p class="text-sm text-gray-500">{{ confirmationText }}</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
                type="button"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-xs px-4 py-2 text-base font-medium text-white focus:outline-hidden focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                :class="{
                    'bg-red-600 hover:bg-red-700 focus:ring-red-500': isDangerous,
                    'bg-yellow-400 hover:bg-yellow-500 focus:ring-yellow-300': isWarning,
                }"
                @click.prevent="$emit('actionConfirmed')"
            >
                {{ actionButtonText }}
            </button>
            <button
                type="button"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-xs px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                @click.prevent="$emit('actionCanceled')"
            >
                {{ cancelButtonText }}
            </button>
        </div>
    </modal>
</template>

<script>
import { useId } from "vue";
import Modal from "./Modal.vue";
import Dangerous from "./icons/Dangerous.vue";
import Warning from "./icons/Warning.vue";

export default {
    components: {
        Modal,
        Dangerous,
        Warning,
    },

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
        cancelButtonText: {
            type: String,
            default: "Отмена",
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
