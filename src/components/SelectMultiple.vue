<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-none">
        <div class="bb:flex bb:w-full bb:flex-col bb:border bb:border-white bb:bg-white">
            <element-header :text="header" :is-required="isRequired" :is-loading="isLoading"/>
            <dropdown-button
                :title="title"
                v-model:is-open="isOpen"
                v-if="hasItems"
                :has-value="selectedItems.length > 0"
                :find-selected="firstSelectedElement"
                :lang="lang"
                @erased="clear"
            >
                <!-- Рамку, фон, скругление и тень списка задаёт панель
                     DropdownButton; здесь — раскладка пунктов и разделители. -->
                <div
                    ref="list"
                    class="bb:flex bb:flex-col bb:py-1 bb:divide-y bb:divide-gray-200 bb:divide-dashed"
                >
                    <list-element
                        v-for="item in visibleItems"
                        :name="item.name"
                        :key="item.id"
                        :is-checked="selectedIds.includes(item.id)"
                        :aria-pressed="selectedIds.includes(item.id)"
                        @clicked="itemClicked(item)"
                    />
                </div>
            </dropdown-button>
        </div>
    </div>
</template>

<script>
import { withLang } from "../lang.js";
import ElementHeader from "./ElementHeader.vue";
import DropdownButton from "./DropdownButton.vue";
import ListElement from "./ListElement.vue";

export default {
    components: {
        ElementHeader,
        DropdownButton,
        ListElement,
    },

    mixins: [withLang],

    emits: ["update:modelValue", "changed"],

    props: {
        items: {
            type: Array,
            required: true,
        },
        // Сравнение идёт по id, а не по ссылке на объект: список приходит
        // новым массивом после каждого обновления пропсов. id, которых нет
        // среди пунктов, остаются в значении как есть.
        modelValue: {
            type: Array,
            default: () => [],
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

        // null и не массив — как пустое значение: компонент не должен падать.
        selectedIds() {
            return Array.isArray(this.modelValue) ? this.modelValue : [];
        },

        selectedItems() {
            return this.itemList.filter((item) => this.selectedIds.includes(item.id));
        },

        visibleItems() {
            return this.itemList;
        },

        hasItems() {
            return this.itemList.length > 0;
        },

        // Один выбранный — его название, несколько — их число.
        title() {
            if (this.selectedItems.length === 0) {
                return "";
            }

            return this.selectedItems.length === 1
                ? this.selectedItems[0].name
                : `${this.texts.selected}: ${this.selectedItems.length}`;
        },
    },

    methods: {
        // Клик переключает пункт и список не закрывает: можно отметить
        // несколько пунктов подряд.
        itemClicked(item) {
            this.$emit(
                "update:modelValue",
                this.selectedIds.includes(item.id)
                    ? this.selectedIds.filter((id) => id !== item.id)
                    : [...this.selectedIds, item.id],
            );
            this.$emit("changed");
        },

        clear() {
            this.$emit("update:modelValue", []);
            this.$emit("changed");
        },

        // Кнопка первого выбранного пункта: пункты стоят в списке в порядке
        // visibleItems.
        firstSelectedElement() {
            const index = this.visibleItems.findIndex((item) => this.selectedIds.includes(item.id));

            return index === -1 ? null : this.$refs.list.querySelectorAll("button")[index];
        },
    },
};
</script>
