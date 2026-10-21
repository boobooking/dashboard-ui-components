<template>
    <div class="bb-dashboard-ui">
        <div class="bb:flex bb:items-center">
            <span :id="labelId" class="bb:block bb:text-sm bb:font-medium bb:leading-5 bb:text-gray-700" v-text="label ?? ''"/>
            <dot v-show="isRequired" color="red" class="bb:ml-2"/>
        </div>
        <div v-if="itemList.length > 0" role="group" :aria-labelledby="labelId" class="bb:mt-1 bb:grid bb:gap-x-4 bb:gap-y-2" :style="gridStyle">
            <!-- :key="index": id бывают булевыми и повторяться, а checked всё равно задаёт проп.
                 bb:bg-none снимает галочку @tailwindcss/forms приложения у :checked: ресет пакета
                 background-image не трогает. Белая галочка svg лежит поверх input; путь тот же, что у плагина.
                 В режиме высокой контрастности браузер красит отмеченный квадрат цветом фона, и белой
                 галочки svg на нём не видно: там галочка — родная (appearance: auto), svg скрыт. -->
            <label v-for="(item, index) in itemList" :key="index" :style="itemStyles[index]" class="bb:flex bb:items-center">
                <span class="bb:relative bb:flex bb:shrink-0">
                    <input
                        type="checkbox"
                        :checked="isChecked(item)"
                        class="bb:size-4 bb:rounded bb:border bb:bg-none bb:focus-visible:focus-ring bb:forced-colors:appearance-auto"
                        :class="isChecked(item) ? 'bb:border-indigo-600 bb:bg-indigo-600' : 'bb:border-gray-300 bb:bg-white'"
                        @change="toggle(item)"
                    />
                    <svg v-if="isChecked(item)" class="bb:pointer-events-none bb:absolute bb:inset-0 bb:size-4 bb:fill-white bb:forced-colors:hidden" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"/>
                    </svg>
                </span>
                <span class="bb:ml-3 bb:text-sm bb:font-medium bb:text-gray-700" v-text="itemName(item)"/>
            </label>
        </div>
    </div>
</template>

<script>
import { useId } from "vue";
import { columnCount, gridPlacement, gridTemplate, isColumnCount } from "../columns.js";
import Dot from "./Dot.vue";

// Поле формы вида FormInput: подпись над списком галочек с выбором нескольких
// пунктов. isRequired только рисует красную точку. Значение и события проходят
// насквозь, class и прочие атрибуты ложатся на корень.
export default {
    components: {
        Dot,
    },

    emits: ["update:modelValue", "changed"],

    props: {
        items: {
            type: Array,
            required: true,
        },
        // Сравнение идёт по id строго (===). Не массив (например null) — ничего не отмечено.
        modelValue: {
            type: Array,
            default: () => [],
        },
        label: {
            type: String,
            required: true,
        },
        isRequired: {
            type: Boolean,
            default: false,
        },
        columns: {
            type: Number,
            default: 2,
            validator: isColumnCount,
        },
    },

    // useId() уникален в пределах приложения и совпадает на сервере и при
    // гидратации: подпись и группа каждого поля свои.
    setup() {
        return {
            labelId: useId(),
        };
    },

    computed: {
        itemList() {
            return Array.isArray(this.items) ? this.items.filter((item) => typeof item === "object" && item !== null) : [];
        },

        selectedIds() {
            return Array.isArray(this.modelValue) ? this.modelValue : [];
        },

        gridStyle() {
            return gridTemplate(columnCount(this.columns));
        },

        itemStyles() {
            return gridPlacement(this.itemList.length, columnCount(this.columns));
        },
    },

    methods: {
        isChecked(item) {
            return this.selectedIds.includes(item.id);
        },

        itemName(item) {
            return String(item.name ?? "");
        },

        async toggle(item) {
            this.$emit(
                "update:modelValue",
                this.isChecked(item)
                    ? this.selectedIds.filter((id) => id !== item.id)
                    : [...this.selectedIds, item.id],
            );
            this.$emit("changed");
            await this.$nextTick();
            this.syncChecked();
        },

        // Клик отмечает галочку сам, а Vue ставит checked только при смене
        // пропа. Если родитель значение не принял, проп не изменился и рендера
        // нет: без сверки галочка осталась бы в положении, которое modelValue
        // не задаёт.
        // Сверка парует input с itemList по индексу: каждый input в корне —
        // галочка пункта, в порядке itemList (порядок DOM = порядок массива);
        // другой input внутри компонента сломал бы пары.
        syncChecked() {
            this.$el.querySelectorAll("input").forEach((input, index) => {
                input.checked = this.isChecked(this.itemList[index]);
            });
        },
    },
};
</script>
