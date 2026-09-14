<template>
    <div class="bb-dashboard-ui flex flex-col">
        <div class="relative flex h-full cursor-pointer leading-none">
            <button
                ref="trigger"
                type="button"
                class="flex w-full items-center focus:outline-hidden"
                :class="{ 'z-20': popupIsOpen }"
                @click="popupIsOpen = !popupIsOpen"
            >
                <label class="min-w-24 w-full h-full">
                    <!-- Геометрия поля выписана явно: базовый слой пакета обнуляет
                         отступы и рамку, а раньше их неявно задавал @tailwindcss/forms
                         приложения. py-2 pr-3 и рамка в 1 px — те же значения, что
                         давал плагин. Левого отступа нет намеренно: отступ колонки
                         задаёт родитель, а два сложившихся отступа уводили дату правее
                         заголовка. placeholder:text-sm держит подсказку на ступень
                         крупнее заголовка фильтра; размер получает только подсказка,
                         выбранная дата остаётся крупнее. -->
                    <input
                        :disabled="popupIsOpen"
                        ref="field"
                        type="text"
                        :value="dayValue"
                        :placeholder="placeholderText"
                        class="w-full h-full py-2 pr-3 leading-none border border-transparent whitespace-nowrap bg-transparent placeholder:text-sm placeholder-gray-300 cursor-pointer focus:outline-hidden"
                    />
                </label>
            </button>

            <eraser v-if="needsEraser" @click="clearPicker" class="z-10 h-full pr-2"/>
        </div>

        <popup v-model="popupIsOpen">
            <div ref="container" class="flex mt-1 bg-white border border-gray-200 rounded-md shadow-lg"></div>
        </popup>
    </div>
</template>

<script>
import Pikaday from "pikaday";
import "pikaday/css/pikaday.css";
import Popup from "./Popup.vue";
import Eraser from "./Eraser.vue";
import { formatDay, parseDay } from "../date.js";

export default {
    components: {
        Popup,
        Eraser,
    },

    emits: ["update:modelValue", "changed"],

    props: {
        modelValue: {
            type: String,
            default: "",
        },
        withEraser: {
            type: Boolean,
            default: true,
        },
        placeholderText: {
            type: String,
            default: "",
        },
    },

    created() {
        // Нереактивное поле: инстанс pikaday нельзя заворачивать в прокси Vue.
        this.picker = null;
    },

    mounted() {
        this.picker = new Pikaday({
            field: this.$refs.field,
            container: this.$refs.container,
            keyboardInput: false,
            bound: false,
            firstDay: 1,
            parse: (value) => parseDay(value),
            toString: (value) => formatDay(value),
            i18n: {
                previousMonth: "Предыдущий месяц",
                nextMonth: "Следующий месяц",
                months: [
                    "Январь",
                    "Февраль",
                    "Март",
                    "Апрель",
                    "Май",
                    "Июнь",
                    "Июль",
                    "Август",
                    "Сентябрь",
                    "Октябрь",
                    "Ноябрь",
                    "Декабрь",
                ],
                weekdays: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
                weekdaysShort: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
            },
            onSelect: (value) => {
                this.popupIsOpen = false;
                this.$emit("update:modelValue", formatDay(value));
                this.$emit("changed");
            },
        });
    },

    beforeUnmount() {
        this.picker?.destroy();
    },

    data() {
        return {
            popupIsOpen: false,
            dayValue: this.modelValue,
        };
    },

    watch: {
        modelValue(newValue) {
            this.dayValue = newValue;
            this.syncPicker(newValue);
        },
    },

    methods: {
        // Программная установка без onSelect: значение пришло снаружи, и возвращать
        // его родителю незачем — update:modelValue ушёл бы обратно эхом.
        syncPicker(value) {
            const date = parseDay(value);

            if (date === null) {
                this.picker.clear();

                return;
            }

            this.picker.setDate(date, true);
        },

        clearPicker() {
            this.$emit("update:modelValue", "");
            this.dayValue = "";
            this.picker.clear();
            this.$emit("changed");
        },
    },

    computed: {
        hasValue() {
            return this.modelValue.length > 0;
        },

        needsEraser() {
            if (!this.withEraser) {
                return false;
            }

            if (this.popupIsOpen) {
                return false;
            }

            return this.hasValue;
        },
    },
};
</script>
