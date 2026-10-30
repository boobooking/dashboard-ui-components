<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-col bb:grow">
        <dropdown-button
            :title="title"
            v-model:is-open="isOpen"
            v-if="hasItems"
            :has-value="selectedItems.length > 0"
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
                    :is-checked="selectedIds.includes(item.id)"
                    :aria-pressed="selectedIds.includes(item.id)"
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

// Ядро выбора нескольких пунктов: кнопка со списком и поиском. Заголовок,
// подпись и рамку рисуют обёртки SelectMultipleFilter и SelectMultipleForm;
// пакет ядро не экспортирует. Корень занимает всю высоту и ширину, которые
// дала обёртка.
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
        // новым массивом после каждого обновления пропсов. id, которых нет
        // среди пунктов, остаются в значении как есть.
        modelValue: {
            type: Array,
            default: () => [],
        },
        // id подписи поля формы: SelectMultipleForm связывает её с кнопкой
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
        // null, undefined и не массив — как пустой список, элементы-необъекты
        // пропускаются: компонент не должен падать.
        itemList() {
            return Array.isArray(this.items) ? this.items.filter((item) => typeof item === "object" && item !== null) : [];
        },

        // null и не массив — как пустое значение: компонент не должен падать.
        selectedIds() {
            return Array.isArray(this.modelValue) ? this.modelValue : [];
        },

        selectedItems() {
            return this.itemList.filter((item) => this.selectedIds.includes(item.id));
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
                ? this.itemName(this.selectedItems[0])
                : `${this.texts.selected}: ${this.selectedItems.length}`;
        },
    },

    methods: {
        // Выбор пункта закрывает список. Фокус ставится на пункт до закрытия:
        // Safari по клику кнопке фокус не даёт и оставляет его на body, а
        // PopoverPanel возвращает фокус на кнопку фильтра, только если он
        // был в панели.
        itemClicked(item) {
            this.itemElements()[this.visibleItems.indexOf(item)]?.focus({ preventScroll: true });
            this.isOpen = false;
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

            return index === -1 ? null : this.itemElements()[index];
        },

        // От чего считают стрелки, пока фокус вне их остановок (на кнопке
        // фильтра, на body): от первого выбранного пункта. Без выбранных —
        // от поля, если оно есть: поле — первая остановка круга, поэтому
        // вниз встаёт первый пункт, вверх — последний, как без поиска.
        arrowsOrigin() {
            return this.firstSelectedElement() ?? this.searchInput();
        },
    },
};
</script>
