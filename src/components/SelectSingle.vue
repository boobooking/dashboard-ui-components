<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-col bb:grow">
        <dropdown-button
            :title="activeItemName"
            v-model:is-open="isOpen"
            v-if="hasItems"
            :has-value="hasValue"
            :labelled-by="labelledBy"
            :find-selected="activeItemElement"
            :find-tab-stops="itemStops"
            @erased="clear"
        >
            <!-- Рамку, фон, скругление и тень списка задаёт панель
                 DropdownButton; здесь — раскладка пунктов и разделители. -->
            <div
                ref="list"
                class="bb:flex bb:flex-col bb:py-1 bb:divide-y bb:divide-gray-200 bb:divide-dashed"
            >
                <list-element
                    v-for="item in itemList"
                    :name="item.name"
                    :key="item.id"
                    :is-checked="item.id === modelValue"
                    @clicked="itemClicked(item)"
                />
            </div>
        </dropdown-button>
    </div>
</template>

<script>
import DropdownButton from "./DropdownButton.vue";
import ListElement from "./ListElement.vue";

// Ядро выбора одного пункта: кнопка со списком. Заголовок, подпись и рамку
// рисуют обёртки SelectSingleFilter и SelectSingleForm; пакет ядро
// не экспортирует. Корень занимает всю высоту и ширину, которые дала
// обёртка.
export default {
    components: {
        DropdownButton,
        ListElement,
    },

    emits: ["update:modelValue", "changed"],

    props: {
        items: {
            type: Array,
            required: true,
        },
        // Сравнение идёт по id, а не по ссылке на объект: список приходит
        // новым массивом после каждого обновления пропсов, и сравнение по
        // ссылке заставляло бы вызывающий код искать активный элемент в том
        // же массиве, иначе галочка пропадала бы.
        modelValue: {
            type: [String, Number],
            default: null,
        },
        // id подписи поля формы: SelectSingleForm связывает её с кнопкой
        // (DropdownButton). У фильтра не задан.
        labelledBy: {
            type: String,
            default: null,
        },
    },

    data() {
        return {
            isOpen: false,
        };
    },

    watch: {
        // Пункты пропали — выпадающий список уходит из DOM открытым. Без
        // закрытия isOpen остался бы true, и вернувшиеся пункты открыли бы
        // список сами. Список закрывается и вернётся закрытым.
        hasItems(hasItems) {
            if (!hasItems) {
                this.isOpen = false;
            }
        },
    },

    computed: {
        // Не массив, в том числе null и undefined, — как пустой список,
        // элементы-необъекты пропускаются: компонент не должен падать.
        itemList() {
            return Array.isArray(this.items) ? this.items.filter((item) => typeof item === "object" && item !== null) : [];
        },

        activeItem() {
            return this.itemList.find((item) => item.id === this.modelValue) ?? null;
        },

        activeItemName() {
            return this.activeItem === null ? null : this.activeItem.name;
        },

        hasItems() {
            return this.itemList.length > 0;
        },

        hasValue() {
            return this.activeItem !== null;
        },
    },

    methods: {
        // Повторный клик по выбранному снимает выбор — так же, как ластик.
        itemClicked(item) {
            this.isOpen = false;
            this.$emit("update:modelValue", item.id === this.modelValue ? null : item.id);
            this.$emit("changed");
        },

        clear() {
            this.$emit("update:modelValue", null);
            this.$emit("changed");
        },

        // Кнопка выбранного пункта: пункты стоят в списке в порядке itemList.
        activeItemElement() {
            const index = this.itemList.indexOf(this.activeItem);

            return index === -1 ? null : this.$refs.list.querySelectorAll("button")[index];
        },

        // Остановки Tab: кнопки пунктов. Tab ведёт модуль, а не браузер:
        // Safari пропускает кнопки (holdTabFocus).
        itemStops() {
            return this.$refs.list ? [...this.$refs.list.querySelectorAll(":scope > button")] : [];
        },
    },
};
</script>
