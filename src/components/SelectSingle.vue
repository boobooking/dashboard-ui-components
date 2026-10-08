<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-none">
        <div class="bb:flex bb:w-full bb:flex-col bb:border bb:border-white bb:bg-white">
            <element-header :text="header" :is-required="isRequired" :is-loading="isLoading"/>
            <dropdown-button
                :title="activeItemName"
                v-model:is-open="isOpen"
                v-if="hasItems"
                :has-value="hasValue"
                :find-selected="activeItemElement"
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
    </div>
</template>

<script>
import ElementHeader from "./ElementHeader.vue";
import DropdownButton from "./DropdownButton.vue";
import ListElement from "./ListElement.vue";

export default {
    components: {
        ElementHeader,
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
        // null и undefined — как пустой список: компонент не должен падать.
        itemList() {
            return this.items ?? [];
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
    },
};
</script>
