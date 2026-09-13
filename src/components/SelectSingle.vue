<template>
    <div class="bb-dashboard-ui flex flex-none">
        <div class="flex w-full flex-col border border-white bg-white">
            <element-header :text="header" :is-required="isRequired" :is-loading="isLoading"/>
            <dropdown-button
                :title="activeItemName"
                v-model:is-open="isOpen"
                v-if="hasItems"
                :has-value="hasValue"
                @erased="clear"
            >
                <div
                    class="flex flex-col py-1 mt-1 bg-white border border-gray-200 rounded-md shadow-lg divide-y divide-gray-200 divide-dashed"
                >
                    <list-element
                        v-for="item in items"
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

    computed: {
        activeItem() {
            return this.items.find((item) => item.id === this.modelValue) ?? null;
        },

        activeItemName() {
            return this.activeItem === null ? null : this.activeItem.name;
        },

        hasItems() {
            return this.items.length > 0;
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
    },
};
</script>
