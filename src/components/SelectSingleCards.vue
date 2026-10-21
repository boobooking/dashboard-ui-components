<template>
    <div class="bb-dashboard-ui">
        <div class="bb:flex bb:items-center">
            <span :id="labelId" class="bb:block bb:text-sm bb:font-medium bb:leading-5 bb:text-gray-700" v-text="label ?? ''"/>
            <dot v-show="isRequired" color="red" class="bb:ml-2"/>
        </div>
        <div v-if="itemList.length > 0" role="radiogroup" :aria-labelledby="labelId" class="bb:mt-2 bb:grid bb:gap-3" :style="gridStyle">
            <!-- :key="index": id бывают булевыми и повторяться, а checked всё равно задаёт проп.
                 input прозрачный и лежит на всей карточке: клик в любом месте попадает в него,
                 а подсказка Vimlike и Vimari одна и стоит на всей карточке.
                 Кружок и надпись — cursor-default и pointer-events-none, как содержимое кнопок пакета. -->
            <label
                v-for="(item, index) in itemList"
                :key="index"
                :style="itemStyles[index]"
                class="bb:relative bb:flex bb:items-start bb:p-3 bb:border bb:rounded-md bb:cursor-pointer bb:select-none bb:transition bb:has-focus-visible:focus-ring"
                :class="isSelected(item) ? 'bb:border-indigo-500 bb:bg-indigo-50' : 'bb:border-gray-300 bb:bg-white bb:hover:bg-gray-50'"
            >
                <input type="radio" :name="groupName" :checked="isSelected(item)" class="bb:absolute bb:inset-0 bb:size-full bb:cursor-pointer bb:opacity-0" @change="select(item)"/>
                <span class="bb:pointer-events-none bb:cursor-default bb:shrink-0 bb:mt-0.5 bb:size-4 bb:rounded-full bb:border-2 bb:flex bb:items-center bb:justify-center" :class="isSelected(item) ? 'bb:border-indigo-600' : 'bb:border-gray-400'">
                    <span v-if="isSelected(item)" class="bb:size-2 bb:rounded-full bb:bg-indigo-600"/>
                </span>
                <span class="bb:pointer-events-none bb:cursor-default bb:ml-3 bb:text-sm bb:font-medium bb:text-gray-700" v-text="itemName(item)"/>
            </label>
        </div>
    </div>
</template>

<script>
import { useId } from "vue";
import { columnCount, gridPlacement, gridTemplate, isColumnCount } from "../columns.js";
import Dot from "./Dot.vue";

// Поле формы вида FormInput: подпись над карточками с выбором одного пункта.
// isRequired только рисует красную точку. Значение и события проходят
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
        // Сравнение идёт по id строго (===). Порядок типов важен: если Boolean
        // стоит раньше String, Vue превращает "" в true.
        modelValue: {
            type: [String, Number, Boolean],
            default: null,
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
    // гидратации: подпись и группа переключателей каждого поля свои.
    setup() {
        return {
            labelId: useId(),
            groupName: useId(),
        };
    },

    computed: {
        itemList() {
            return Array.isArray(this.items) ? this.items.filter((item) => typeof item === "object" && item !== null) : [];
        },

        gridStyle() {
            return gridTemplate(columnCount(this.columns));
        },

        itemStyles() {
            return gridPlacement(this.itemList.length, columnCount(this.columns));
        },
    },

    methods: {
        isSelected(item) {
            return item.id === this.modelValue;
        },

        itemName(item) {
            return String(item.name ?? "");
        },

        async select(item) {
            this.$emit("update:modelValue", item.id);
            this.$emit("changed");
            await this.$nextTick();
            this.syncChecked();
        },

        // Клик отмечает переключатель сам, а Vue ставит checked только при
        // смене пропа. Если родитель значение не принял, проп не изменился
        // и рендера нет: без сверки отмеченной осталась бы карточка, которую
        // modelValue не выбирает.
        syncChecked() {
            this.$el.querySelectorAll("input").forEach((input, index) => {
                input.checked = this.isSelected(this.itemList[index]);
            });
        },
    },
};
</script>
