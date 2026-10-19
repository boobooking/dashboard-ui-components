<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-none">
        <div class="bb:flex bb:w-full bb:flex-col bb:border bb:border-white bb:bg-white">
            <element-header :text="header" :is-required="isRequired" :is-loading="isLoading"/>
            <dropdown-button
                :title="title"
                v-model:is-open="isOpen"
                v-if="hasItems"
                :has-value="selectedItems.length > 0"
                :find-selected="arrowsOrigin"
                :find-stops="searchStops"
                :find-tab-stops="tabStops"
                :keep-size="withSearch"
                :lang="lang"
                @erased="clear"
                @toggle="onToggle"
            >
                <!-- Поле поиска над пунктами: при прокрутке длинного списка
                     оно остаётся на месте, прокручиваются пункты. -->
                <div
                    v-if="withSearch"
                    class="bb:sticky bb:top-0 bb:min-w-56 bb:px-2 bb:py-2 bb:bg-white bb:border-b bb:border-gray-200"
                >
                    <div class="bb:relative">
                        <!-- type="text", а не "search": у search Escape в Chrome
                             сначала стирает запрос, а не закрывает список, и
                             браузер рисует свой крестик рядом с ластиком.
                             Enter гасится: фильтр может стоять внутри формы,
                             и Enter в поле отправил бы её. -->
                        <input
                            ref="search"
                            type="text"
                            autocomplete="off"
                            v-model="query"
                            :placeholder="texts.search"
                            :aria-label="texts.search"
                            class="bb:w-full bb:pl-3 bb:pr-9 bb:py-2 bb:text-sm bb:bg-white bb:border bb:border-gray-300 bb:rounded-md bb:focus:outline-hidden bb:focus:border-indigo-500 bb:focus:ring-1 bb:focus:ring-indigo-500"
                            @keydown.enter.prevent
                        />
                        <!-- tabindex перекрывает собственный атрибут CrossButton:
                             ластик поля входит в круг Tab. -->
                        <cross-button
                            ref="searchEraser"
                            v-show="query !== ''"
                            size="small"
                            :lang="lang"
                            @clicked="clearQuery"
                            class="bb:absolute bb:right-0 bb:top-0 bb:pr-2 bb:h-full bb:rounded-md bb:focus-visible:ring-2 bb:focus-visible:ring-inset bb:focus-visible:ring-indigo-500"
                            tabindex="0"
                        />
                    </div>
                </div>
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
    </div>
</template>

<script>
import { withLang } from "../lang.js";
import ElementHeader from "./ElementHeader.vue";
import DropdownButton from "./DropdownButton.vue";
import ListElement from "./ListElement.vue";
import CrossButton from "./CrossButton.vue";

export default {
    components: {
        ElementHeader,
        DropdownButton,
        ListElement,
        CrossButton,
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
        // Поле поиска над пунктами списка.
        withSearch: {
            type: Boolean,
            default: false,
        },
    },

    data() {
        return {
            isOpen: false,
            // Запрос поиска: внутреннее состояние, не часть значения.
            // Сбрасывается при каждом закрытии списка.
            query: "",
        };
    },

    watch: {
        // Пункты пропали — выпадающий список уходит из DOM открытым. Без
        // закрытия isOpen остался бы true, и вернувшиеся пункты открыли бы
        // список сами. Список закрывается и вернётся закрытым.
        // Панель при этом уходит из DOM без события toggle, поэтому запрос
        // сбрасывается здесь же: иначе вернувшийся список открылся бы
        // с прежним запросом.
        hasItems(hasItems) {
            if (!hasItems) {
                this.isOpen = false;
                this.query = "";
            }
        },
    },

    computed: {
        // null, undefined и не массив — как пустой список: компонент
        // не должен падать.
        itemList() {
            return Array.isArray(this.items) ? this.items : [];
        },

        // null и не массив — как пустое значение: компонент не должен падать.
        selectedIds() {
            return Array.isArray(this.modelValue) ? this.modelValue : [];
        },

        selectedItems() {
            return this.itemList.filter((item) => this.selectedIds.includes(item.id));
        },

        // Фильтр поиска: имя пункта содержит запрос без учёта регистра,
        // запрос обрезан по краям. Пустой запрос — все пункты. Без поиска
        // запрос не действует: он мог остаться от поля, которое убрали
        // при открытом списке.
        visibleItems() {
            const query = this.withSearch ? this.query.trim().toLowerCase() : "";

            if (query === "") {
                return this.itemList;
            }

            return this.itemList.filter((item) => this.itemName(item).toLowerCase().includes(query));
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
        // Имя пункта строкой: null и undefined — пустое имя, число — его
        // запись. Имя уходит в строковые пропы ListElement и DropdownButton,
        // и число в них Vue встретил бы предупреждением.
        itemName(item) {
            return String(item.name ?? "");
        },

        // Выбор пункта закрывает список. Фокус ставится на пункт до закрытия:
        // Safari по клику кнопке фокус не даёт и оставляет его на body, а
        // PopoverPanel возвращает фокус на кнопку фильтра, только если он
        // был в панели.
        itemClicked(item) {
            this.itemElements()[this.visibleItems.indexOf(item)].focus({ preventScroll: true });
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

        // Кнопки пунктов в порядке visibleItems: корень ListElement — кнопка,
        // и прямые потомки списка — только они. Без совпадений списка нет.
        itemElements() {
            return this.$refs.list ? [...this.$refs.list.querySelectorAll(":scope > button")] : [];
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
            return this.firstSelectedElement() ?? this.$refs.search ?? null;
        },

        // Список открылся — фокус в поле, набор сразу идёт в поиск. Страница
        // к полю не прокручивается: её прокрутка закрыла бы список. Список
        // закрылся по любой причине — запрос сбрасывается.
        onToggle(isOpen) {
            if (isOpen && this.withSearch) {
                this.$refs.search.focus({ preventScroll: true });
            }

            if (!isOpen) {
                this.query = "";
            }
        },

        // Остановки стрелок: поле, если оно есть, затем пункты. Ластик поля —
        // тоже кнопка, но в круг стрелок не входит. Без совпадений пунктов нет —
        // только поле. Функция одна и с поиском, и без него: панель берёт её
        // при открытии, а поиск могут включить и выключить при открытом списке.
        searchStops() {
            const field = this.$refs.search ? [this.$refs.search] : [];

            return [...field, ...this.itemElements()];
        },

        // Остановки Tab: поле, ластик поля, пока запрос не пуст, затем пункты.
        // Ластик в Tab, но не в стрелках: стрелки ходят по выбору, а Tab
        // должен дойти до каждой кнопки списка. Tab ведёт модуль, а не
        // браузер: Safari пропускает кнопки (holdTabFocus). Функция одна и
        // с поиском, и без него, как searchStops.
        tabStops() {
            const field = this.$refs.search ? [this.$refs.search] : [];
            const eraser = this.$refs.search && this.query !== "" ? [this.$refs.searchEraser.$el] : [];

            return [...field, ...eraser, ...this.itemElements()];
        },

        // Набор на пункте уходит в поле: мышь ставит фокус на пункт под
        // курсором, и без этого набор пропадал бы, стоило сдвинуть мышь.
        // Печатный символ — одна клавиша без Ctrl, Cmd и Alt, кроме пробела:
        // пробел нажимает пункт. Ввод через метод ввода (isComposing)
        // не перехватывается. Символ дописывается в запрос, Backspace стирает
        // последний; каретка — в конце, после того как поле получит запрос.
        onListKeydown(event) {
            if (!this.withSearch || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
                return;
            }

            if (event.key === "Backspace") {
                this.query = this.query.slice(0, -1);
            } else if (event.key.length === 1 && event.key !== " ") {
                this.query = this.query + event.key;
            } else {
                return;
            }

            event.preventDefault();
            this.$refs.search.focus({ preventScroll: true });
            this.$nextTick(() => {
                const end = this.$refs.search.value.length;
                this.$refs.search.setSelectionRange(end, end);
            });
        },

        // Ластик поля: запрос пуст, фокус остаётся в поле.
        clearQuery() {
            this.query = "";
            this.$refs.search.focus();
        },
    },
};
</script>
