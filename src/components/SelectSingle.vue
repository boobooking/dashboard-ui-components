<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-col bb:grow">
        <dropdown-button
            :title="activeItemName"
            v-model:is-open="isOpen"
            v-if="hasItems"
            :has-value="withClear && hasValue"
            :with-arrow="withArrow"
            :labelled-by="labelledBy"
            :find-selected="arrowsOrigin"
            :find-stops="searchStops"
            :find-tab-stops="tabStops"
            :keep-size="withSearch"
            :lang="lang"
            @erased="clear"
            @toggle="onSearchToggle"
        >
            <list-search-field
                v-if="withSearch"
                ref="search"
                v-model="query"
                :lang="lang"
            />
            <!-- Рамку, фон, скругление и тень списка задаёт панель
                 DropdownButton; здесь — раскладка пунктов и разделители. -->
            <div
                v-if="visibleItems.length > 0"
                ref="list"
                class="bb:flex bb:flex-col bb:py-1 bb:divide-y bb:divide-gray-200 bb:divide-dashed"
                @keydown="onListKeydown"
            >
                <list-element
                    v-for="item in visibleItems"
                    :name="itemName(item)"
                    :key="item.id"
                    :is-checked="item.id === modelValue"
                    @clicked="itemClicked(item)"
                />
            </div>
            <div
                v-else
                class="bb:px-3 bb:py-2 bb:text-sm bb:text-gray-500 bb:text-center"
                v-text="texts.nothingFound"
            />
        </dropdown-button>
    </div>
</template>

<script>
import { withLang } from "../lang.js";
import { withListSearch } from "../listSearch.js";
import DropdownButton from "./DropdownButton.vue";
import ListElement from "./ListElement.vue";
import ListSearchField from "./ListSearchField.vue";

// Ядро выбора одного пункта: кнопка со списком. Заголовок, подпись и рамку
// рисуют обёртки SelectSingleFilter и SelectSingleForm; пакет ядро
// не экспортирует. Корень занимает всю высоту и ширину, которые дала
// обёртка.
export default {
    components: {
        DropdownButton,
        ListElement,
        ListSearchField,
    },

    mixins: [withLang, withListSearch],

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
        // Ластик значения и снятие выбора повторным кликом; при false их нет.
        // Внутренний проп полей суммы.
        withClear: {
            type: Boolean,
            default: true,
        },
        // Стрелка в кнопке списка. Внутренний проп полей суммы.
        withArrow: {
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
        // Не массив, в том числе null и undefined, — как пустой список,
        // элементы-необъекты пропускаются: компонент не должен падать.
        itemList() {
            return Array.isArray(this.items) ? this.items.filter((item) => typeof item === "object" && item !== null) : [];
        },

        activeItem() {
            return this.itemList.find((item) => item.id === this.modelValue) ?? null;
        },

        activeItemName() {
            return this.activeItem === null ? null : this.itemName(this.activeItem);
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
        // Фокус ставится на пункт до закрытия: Safari по клику кнопке фокус не
        // даёт и оставляет его на body, а PopoverPanel возвращает фокус на
        // кнопку списка, только если он был в панели. Без снятия выбора
        // (withClear) клик по выбранному только закрывает список.
        itemClicked(item) {
            this.itemElements()[this.visibleItems.indexOf(item)]?.focus({ preventScroll: true });
            this.isOpen = false;

            if (!this.withClear && item.id === this.modelValue) {
                return;
            }

            this.$emit("update:modelValue", item.id === this.modelValue ? null : item.id);
            this.$emit("changed");
        },

        clear() {
            this.$emit("update:modelValue", null);
            this.$emit("changed");
        },

        // Кнопка выбранного пункта: пункты стоят в списке в порядке
        // visibleItems. Скрытый фильтром пункт кнопки не имеет.
        activeItemElement() {
            const index = this.visibleItems.indexOf(this.activeItem);

            return index === -1 ? null : this.itemElements()[index];
        },

        // От чего считают стрелки, пока фокус вне их остановок (на кнопке
        // списка, на body): от выбранного пункта. Без выбранного — от поля,
        // если оно есть: поле — первая остановка круга, поэтому вниз встаёт
        // первый пункт, вверх — последний, как без поиска.
        arrowsOrigin() {
            return this.activeItemElement() ?? this.searchInput();
        },
    },
};
</script>
