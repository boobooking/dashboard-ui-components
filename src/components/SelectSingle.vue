<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-none">
        <div class="bb:flex bb:w-full bb:flex-col bb:border bb:border-white bb:bg-white">
            <element-header :text="header" :is-required="isRequired" :is-loading="isLoading"/>
            <dropdown-button
                :title="activeItemName"
                v-model:is-open="isOpen"
                v-if="hasItems"
                :has-value="hasValue"
                @erased="clear"
            >
                <div
                    ref="list"
                    class="bb:flex bb:flex-col bb:py-1 bb:mt-1 bb:bg-white bb:border bb:border-gray-200 bb:rounded-md bb:shadow-lg bb:divide-y bb:divide-gray-200 bb:divide-dashed"
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
import { moveMenuFocus } from "../menuFocus.js";

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
        // Стрелки ходят по пунктам, только пока список открыт: у закрытого
        // они прокручивают страницу.
        isOpen(isOpen) {
            this.stopMovingFocus();

            if (isOpen) {
                this.stopArrows = moveMenuFocus(this.$refs.list, this.activeItemElement);
            }
        },
    },

    created() {
        // Снимает слушатель стрелок, пока список открыт.
        this.stopArrows = null;
    },

    beforeUnmount() {
        this.stopMovingFocus();
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

        stopMovingFocus() {
            if (this.stopArrows !== null) {
                this.stopArrows();
                this.stopArrows = null;
            }
        },
    },
};
</script>
