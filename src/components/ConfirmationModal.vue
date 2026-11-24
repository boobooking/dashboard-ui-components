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
                    <!-- Слот — тело с разметкой страницы вместо абзаца confirmationText. -->
                    <div v-if="$slots.default" class="bb:mt-2 bb:text-sm bb:text-gray-500">
                        <slot/>
                    </div>
                    <div v-else class="bb:mt-2">
                        <p class="bb:text-sm bb:text-gray-500">{{ confirmationText }}</p>
                    </div>
                    <!-- Галочка согласия: пока она снята, действие недоступно. Метка
                         data-dialog-agreement включает её в круг фокуса модалки. -->
                    <label v-if="agreementText" class="bb:mt-4 bb:flex bb:items-center">
                        <span class="bb:relative bb:flex bb:shrink-0">
                            <input
                                v-model="agreed"
                                type="checkbox"
                                data-dialog-agreement
                                class="bb:size-4 bb:rounded bb:choice-border bb:bg-none bb:focus-visible:focus-ring bb:forced-colors:appearance-auto"
                                :class="agreed ? 'bb:border-indigo-600 bb:bg-indigo-600' : 'bb:border-gray-300 bb:bg-white'"
                            />
                            <svg v-if="agreed" class="bb:pointer-events-none bb:absolute bb:inset-0 bb:size-4 bb:fill-white bb:forced-colors:hidden" viewBox="0 0 16 16" aria-hidden="true">
                                <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"/>
                            </svg>
                        </span>
                        <span class="bb:ml-2 bb:text-sm bb:text-gray-900">{{ agreementText }}</span>
                    </label>
                </div>
            </div>
        </div>
        <div class="bb:bg-gray-50 bb:rounded-b-lg bb:px-6 bb:py-3 bb:flex bb:flex-row-reverse">
            <action-button
                class="bb:ml-3"
                :label="actionButtonText"
                :color="actionColor"
                :is-disabled="actionDisabled"
                @click.prevent="$emit('actionConfirmed')"
            />
            <!-- Фокус открытой модалки — на отмене: Enter сразу после
                 открытия действие не выполнит. -->
            <action-button
                class="bb:ml-3"
                :label="cancelButtonText ?? texts.cancel"
                data-dialog-focus
                @click.prevent="$emit('actionCanceled')"
            />
        </div>
    </modal>
</template>

<script>
import { useId } from "vue";
import ActionButton from "./ActionButton.vue";
import Modal from "./Modal.vue";
import Dangerous from "./icons/Dangerous.vue";
import Warning from "./icons/Warning.vue";
import { withLang } from "../lang.js";

export default {
    components: {
        ActionButton,
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
        // Подпись галочки согласия; пустая строка или null — галочки нет.
        agreementText: {
            type: String,
            default: null,
        },
    },

    data() {
        return {
            agreed: false,
        };
    },

    // Модалка смонтирована всегда, видимость задаёт isOpen, поэтому галочку
    // снимает каждое открытие, а не монтирование.
    watch: {
        isOpen(value) {
            if (value) {
                this.agreed = false;
            }
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

        // Условие булево: пустая строка agreementText, переданная в isDisabled,
        // стала бы для Vue true и выключила бы кнопку без галочки на экране.
        actionDisabled() {
            return Boolean(this.agreementText) && !this.agreed;
        },

        actionColor() {
            if (this.isDangerous) {
                return "red-solid";
            }
            if (this.isWarning) {
                return "yellow-solid";
            }
            return null;
        },
    },
};
</script>
