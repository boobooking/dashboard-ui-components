<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-col">
        <div class="bb:relative bb:flex bb:h-full bb:cursor-pointer bb:leading-none">
            <!-- Календарь — PopoverPanel под полем: открывает и закрывает его
                 браузер по popovertarget кнопки. Обёртка кнопки занимает
                 место кнопки рядом с ластиком. -->
            <popover-panel
                class="bb:flex bb:w-full"
                v-model="popupIsOpen"
                align="start"
                panel-class="bb:bg-white bb:border bb:border-gray-200 bb:rounded-md bb:shadow-lg"
            >
                <template #trigger="trigger">
                    <button
                        ref="trigger"
                        type="button"
                        :id="trigger.id"
                        :popovertarget="trigger.popovertarget"
                        class="bb:flex bb:w-full bb:items-center bb:focus:outline-hidden"
                    >
                        <!-- Клик по полю достаётся кнопке: у <label> и поля своё
                             поведение активации, и клик по тексту даты или
                             подсказке до popovertarget кнопки не дошёл бы. -->
                        <label class="bb:min-w-24 bb:w-full bb:h-full bb:pointer-events-none">
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
                                class="bb:w-full bb:h-full bb:py-2 bb:pr-3 bb:leading-none bb:border bb:border-transparent bb:whitespace-nowrap bb:bg-transparent bb:placeholder:text-sm bb:placeholder-gray-300 bb:cursor-pointer bb:focus:outline-hidden"
                            />
                        </label>
                    </button>
                </template>
                <template #default>
                    <!-- Pikaday рисует календарь в этот контейнер; раскладку
                         держит он, а не панель: утилита отображения на панели
                         перебила бы display: none закрытой панели. -->
                    <div ref="container" class="bb:flex"></div>
                </template>
            </popover-panel>

            <eraser v-if="needsEraser" @click="clearPicker" class="bb:z-10 bb:h-full bb:pr-2"/>
        </div>
    </div>
</template>

<script>
import "pikaday/css/pikaday.css";
import PopoverPanel from "./PopoverPanel.vue";
import Eraser from "./Eraser.vue";
import { formatDay, parseDay } from "../date.js";
import { withLang } from "../lang.js";

export default {
    components: {
        PopoverPanel,
        Eraser,
    },

    mixins: [withLang],

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
        // Нереактивные поля: инстанс pikaday нельзя заворачивать в прокси Vue.
        this.picker = null;
        this.isUnmounted = false;
    },

    async mounted() {
        // pikaday загружается здесь, а не при загрузке модуля: он обращается к
        // window сразу при выполнении своего модуля, и статический импорт
        // уронил бы загрузку всего пакета на сервере (SSR).
        const { default: Pikaday } = await import("pikaday");

        if (this.isUnmounted) {
            return;
        }

        this.picker = new Pikaday({
            field: this.$refs.field,
            container: this.$refs.container,
            keyboardInput: false,
            bound: false,
            firstDay: 1,
            parse: (value) => parseDay(value),
            toString: (value) => formatDay(value),
            // Язык берётся при создании календаря, после загрузки pikaday:
            // Pikaday собирается один раз.
            i18n: {
                previousMonth: this.texts.previousMonth,
                nextMonth: this.texts.nextMonth,
                months: this.texts.months,
                weekdays: this.texts.weekdays,
                weekdaysShort: this.texts.weekdaysShort,
            },
            onSelect: (value) => {
                this.popupIsOpen = false;
                this.$emit("update:modelValue", formatDay(value));
                this.$emit("changed");
            },
        });
    },

    beforeUnmount() {
        this.isUnmounted = true;
        this.picker?.destroy();
    },

    data() {
        return {
            popupIsOpen: false,
            dayValue: this.modelValue ?? "",
        };
    },

    watch: {
        // null и undefined — как пустая строка: родитель мог сбросить значение в null.
        modelValue(newValue) {
            const day = newValue ?? "";

            this.dayValue = day;
            this.syncPicker(day);
        },
    },

    methods: {
        // Программная установка без onSelect: значение пришло снаружи, и возвращать
        // его родителю незачем — update:modelValue ушёл бы обратно эхом.
        syncPicker(value) {
            // Календаря ещё нет: pikaday при создании прочтёт значение из поля.
            if (this.picker === null) {
                return;
            }

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
            this.picker?.clear();
            this.$emit("changed");
        },
    },

    computed: {
        hasValue() {
            return (this.modelValue ?? "").length > 0;
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
