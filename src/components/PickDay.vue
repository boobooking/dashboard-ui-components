<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-col">
        <div class="bb:relative bb:flex bb:h-full">
            <!-- Календарь — PopoverPanel под полем: открывает и закрывает его
                 браузер по popovertarget кнопки. Обёртка поля и кнопки
                 занимает место рядом с ластиком. Курсор кнопки и межстрочный
                 интервал поля — на них самих, а не на обёртке: панель
                 календаря лежит в обёртке и унаследовала бы их. -->
            <popover-panel
                class="bb:flex bb:w-full"
                v-model="popupIsOpen"
                align="start"
                return-focus
                panel-class="bb:bg-white bb:border bb:border-gray-200 bb:rounded-md bb:shadow-lg"
            >
                <template #trigger="trigger">
                    <!-- Кнопка лежит поверх поля, а не вокруг него: поле внутри
                         кнопки Vimlike считал бы кнопкой вместо неё и отбрасывал
                         как невидимое (см. README, «Клавиатурная навигация»).
                         Кнопка — первой: в порядке табуляции она идёт до поля.
                         Клик по полю достаётся кнопке. -->
                    <button
                        ref="trigger"
                        type="button"
                        :id="trigger.id"
                        :popovertarget="trigger.popovertarget"
                        class="bb:absolute bb:inset-0 bb:cursor-pointer bb:focus-visible:focus-ring"
                    >
                        <!-- Содержимое кнопки не ловит указатель и без курсора-руки:
                             см. README, «Клавиатурная навигация». -->
                        <span class="bb:sr-only bb:pointer-events-none bb:cursor-default" v-text="triggerLabel"></span>
                    </button>
                    <!-- <label> и поле не ловят указатель и под кнопкой: у них
                         своё поведение активации, и клик по тексту даты или
                         подсказке до popovertarget кнопки не дошёл бы. -->
                    <label class="bb:flex bb:w-full bb:items-center bb:leading-none bb:min-w-24 bb:pointer-events-none">
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
                            @keydown="openOnKey"
                            type="text"
                            :value="dayValue"
                            :placeholder="placeholderText"
                            class="bb:w-full bb:h-full bb:py-2 bb:pr-3 bb:leading-none bb:border bb:border-transparent bb:whitespace-nowrap bb:bg-transparent bb:placeholder:text-sm bb:placeholder-gray-300 bb:cursor-pointer bb:focus:outline-hidden"
                        />
                    </label>
                </template>
                <template #default>
                    <!-- Pikaday рисует календарь в этот контейнер; раскладку
                         держит он, а не панель: утилита отображения на панели
                         перебила бы display: none закрытой панели. -->
                    <div ref="container" class="bb:flex"></div>
                </template>
            </popover-panel>

            <cross-button v-if="needsEraser" ref="eraser" size="small" @clicked="clearPicker" class="bb:absolute bb:right-0 bb:top-0 bb:z-10 bb:h-full bb:pr-2" :lang="resolvedLang"/>
        </div>
    </div>
</template>

<script>
import "pikaday/css/pikaday.css";
import PopoverPanel from "./PopoverPanel.vue";
import CrossButton from "./CrossButton.vue";
import { formatDay, parseDay } from "../date.js";
import { moveDayFocus, pickOnClick } from "../dayFocus.js";
import { withLang } from "../lang.js";

export default {
    components: {
        PopoverPanel,
        CrossButton,
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
        // Нереактивные поля: инстанс pikaday нельзя заворачивать в прокси Vue,
        // а снятие слушателей клавиатуры в шаблоне не нужно.
        this.picker = null;
        this.isUnmounted = false;
        this.stopPickOnClick = null;
        this.stopDayFocus = null;
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

        // Календарь с клавиатуры: dayFocus.js.
        this.stopPickOnClick = pickOnClick(this.$refs.container, () => this.$refs.trigger);
        this.syncDayFocus();
    },

    beforeUnmount() {
        this.isUnmounted = true;
        this.stopPickOnClick?.();
        this.stopDayFocus?.();
        this.picker?.destroy();
    },

    data() {
        return {
            popupIsOpen: false,
            dayValue: this.modelValue ?? "",
        };
    },

    watch: {
        popupIsOpen() {
            this.syncDayFocus();
        },

        // null и undefined — как пустая строка: родитель мог сбросить значение в null.
        modelValue(newValue) {
            const day = newValue ?? "";

            this.dayValue = day;
            this.syncPicker(day);
        },
    },

    methods: {
        // Стрелка вниз, Enter и пробел в поле открывают календарь. Порядок
        // обязателен: открытый календарь отключает поле, а фокус с отключённого
        // поля в браузере теряется; PopoverPanel же возвращает фокус на кнопку,
        // только если он был внутри панели. Поэтому фокус — на кнопку до открытия.
        openOnKey(event) {
            if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) {
                return;
            }

            if (!["ArrowDown", "Enter", " "].includes(event.key)) {
                return;
            }

            event.preventDefault();
            this.$refs.trigger.focus({ preventScroll: true });
            this.popupIsOpen = true;
        },

        // Стрелки ведут фокус по дням, пока календарь открыт и создан.
        syncDayFocus() {
            this.stopDayFocus?.();
            this.stopDayFocus = null;

            if (this.popupIsOpen && this.picker !== null) {
                this.stopDayFocus = moveDayFocus(this.$refs.container, this.picker);
            }
        },

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

        // Ластик пропадает после очистки, и фокус с клавиатуры упал бы на body:
        // возвращаем его на кнопку календаря. Касание и мышь :focus-visible не дают,
        // и экранная клавиатура не выезжает.
        moveFocusFromEraser() {
            const eraser = this.$refs.eraser.$el;
            if (document.activeElement === eraser && eraser.matches(":focus-visible")) {
                this.$refs.trigger.focus({ preventScroll: true });
            }
        },

        clearPicker() {
            this.moveFocusFromEraser();
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

        // Доступное имя кнопки календаря: подсказка поля и дата, как их видно.
        triggerLabel() {
            return [this.placeholderText, this.dayValue].filter((part) => part !== "").join(" ");
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
