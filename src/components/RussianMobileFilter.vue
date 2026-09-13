<template>
    <div class="bb-dashboard-ui flex flex-none">
        <div class="flex w-full flex-col border border-white bg-white">
            <element-header :text="header" :is-required="isRequired" :is-loading="isLoading" />
            <div class="relative flex h-full w-full">
                <label class="flex w-full h-full items-center justify-center">
                    <input
                        ref="input"
                        type="tel"
                        inputmode="tel"
                        autocomplete="off"
                        class="flex w-phone h-full px-3 py-2 cursor-pointer truncate hover:bg-blue-100 focus:bg-white focus:outline-hidden border-none"
                        @focus="onFocus"
                        @blur="onBlur"
                        @keydown.enter="commit"
                        @paste.prevent="onPaste"
                    />
                    <eraser
                        v-show="digits.length > 0"
                        @mousedown.prevent
                        @click="clear"
                        class="pr-2 h-full"
                    />
                </label>
            </div>
        </div>
    </div>
</template>

<script>
import IMask from "imask";
import ElementHeader from "./ElementHeader.vue";
import Eraser from "./Eraser.vue";
import { normalizePhoneDigits, toDigits, toParam } from "../phone.js";

const DEBOUNCE_MS = 400;
const MIN_DIGITS_FOR_DEBOUNCE = 3;

export default {
    components: {
        ElementHeader,
        Eraser,
    },

    emits: ["update:modelValue", "changed"],

    props: {
        modelValue: {
            type: String,
            default: '',
        },
        header: {
            type: String,
            required: true,
        },
        isRequired: {
            type: Boolean,
            default: false,
        },
        isLoading: {
            type: Boolean,
            default: false,
        },
    },

    data() {
        return {
            digits: toDigits(this.modelValue),
        };
    },

    created() {
        // Нереактивные поля: маску нельзя заворачивать в прокси Vue, а таймер и
        // lastCommitted в шаблоне не нужны.
        this.mask = null;
        this.debounceTimer = null;
        this.isWritingProgrammatically = false;
        this.lastCommitted = toDigits(this.modelValue);
    },

    mounted() {
        this.mask = IMask(this.$refs.input, {
            mask: '+7 (000) 000 00 00',
            lazy: true,
            // Национальный номер всегда начинается с 9, поэтому ведущие 7 и 8 —
            // код страны. Без этого набранное «8 912» уехало бы в слоты маски и
            // дало «+7 (891) 2».
            prepare: (str, masked) => (
                masked.unmaskedValue === '' && (str === '7' || str === '8') ? '' : str
            ),
        });

        this.mask.on('accept', () => {
            if (this.isWritingProgrammatically) {
                return;
            }

            this.digits = this.mask.unmaskedValue;
            this.$emit('update:modelValue', toParam(this.digits));
            this.scheduleCommit();
        });

        this.syncFromModelValue(this.modelValue);
    },

    beforeUnmount() {
        clearTimeout(this.debounceTimer);
        this.mask?.destroy();
    },

    watch: {
        modelValue(value) {
            if (value === toParam(this.digits)) {
                return;
            }

            this.syncFromModelValue(value);
        },
    },

    methods: {
        // Программная запись без эмитов: значение пришло снаружи, возвращать
        // его родителю незачем.
        syncFromModelValue(value) {
            this.writeToMask(toDigits(value));
            this.digits = this.mask.unmaskedValue;
            // Значение пришло снаружи и уже отражает то, по чему идёт выдача:
            // без этого следующий же blur без правок счёл бы его изменением
            // и отправил лишний запрос.
            this.lastCommitted = this.digits;
        },

        // Программная запись как действие пользователя — вставка и ластик.
        // Обработчик accept подавлен флагом, поэтому update:modelValue эмитим
        // сами: иначе родительский v-model остался бы со старым номером и
        // запрос ушёл бы по нему.
        applyUserDigits(value) {
            this.writeToMask(value);
            this.digits = this.mask.unmaskedValue;
            this.$emit('update:modelValue', toParam(this.digits));
        },

        writeToMask(value) {
            this.isWritingProgrammatically = true;

            if (value === '') {
                // Пустой unmaskedValue оставил бы на экране набранный
                // фиксированный префикс «+7 (» — чистим поле целиком.
                this.mask.value = '';
            } else {
                // В lazy-режиме IMask не дорисовывает фиксированные символы
                // после последней цифры, и «903» осталось бы на экране как
                // «+7 (903» без закрывающей скобки. Пишем с развёрнутой
                // направляющей — так же, как это происходит при вводе с
                // клавиатуры, — и возвращаем режим на место.
                const lazy = this.mask.masked.lazy;

                this.mask.updateOptions({ lazy: false });
                this.mask.unmaskedValue = value;
                this.mask.updateOptions({ lazy });
            }

            this.isWritingProgrammatically = false;
        },

        // Переключение lazy меняет отображение направляющей, а не значение.
        // IMask стреляет на нём accept, и без флага разворачивание направляющей
        // на фокусе выглядело бы как правка пользователя.
        setLazy(lazy) {
            this.isWritingProgrammatically = true;
            this.mask.updateOptions({ lazy });
            this.isWritingProgrammatically = false;
        },

        onFocus() {
            this.setLazy(false);

            this.$nextTick(() => {
                const position = this.$refs.input.value.indexOf('_');

                if (position !== -1) {
                    this.$refs.input.setSelectionRange(position, position);
                }
            });
        },

        onBlur() {
            this.setLazy(true);

            if (this.digits === '') {
                this.writeToMask('');
            }

            this.commit();
        },

        onPaste(event) {
            this.applyUserDigits(normalizePhoneDigits(event.clipboardData?.getData('text') ?? ''));
            this.scheduleCommit();
        },

        clear() {
            this.applyUserDigits('');
            this.commit();
        },

        scheduleCommit() {
            clearTimeout(this.debounceTimer);

            if (this.digits.length === 0) {
                this.commit();
                return;
            }

            if (this.digits.length < MIN_DIGITS_FOR_DEBOUNCE) {
                return;
            }

            this.debounceTimer = setTimeout(() => this.commit(), DEBOUNCE_MS);
        },

        // Единственная точка эмита changed. Совпадение с lastCommitted значит,
        // что этот запрос уже уходил: пустой blur на пустом фильтре, Enter после
        // отработавшего дебаунса, повторный клик по ластику.
        commit() {
            clearTimeout(this.debounceTimer);

            if (this.digits === this.lastCommitted) {
                return;
            }

            this.lastCommitted = this.digits;
            this.$emit('changed');
        },
    },
};
</script>
