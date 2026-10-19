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
                :find-stops="withSearch ? searchStops : null"
                :keep-size="withSearch"
                with-stable-height
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
                        <cross-button
                            v-show="query !== ''"
                            size="small"
                            :lang="lang"
                            @clicked="clearQuery"
                            class="bb:absolute bb:right-0 bb:top-0 bb:pr-2 bb:h-full"
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
                        :name="item.name"
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

        // Фильтр поиска: имя пункта содержит запрос без учёта регистра,
        // запрос обрезан по краям. Пустой запрос — все пункты.
        visibleItems() {
            const query = this.query.trim().toLowerCase();

            if (query === "") {
                return this.itemList;
            }

            return this.itemList.filter((item) => item.name.toLowerCase().includes(query));
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
        // несколько пунктов подряд. Фокус ставится на пункт сам: Safari по
        // клику кнопке фокус не даёт и оставляет его на body, а набор после
        // клика должен идти в поиск, и Escape — вернуть фокус на кнопку фильтра.
        itemClicked(item) {
            this.$refs.list
                .querySelectorAll("button")
                [this.visibleItems.indexOf(item)].focus({ preventScroll: true });
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

        // Остановки стрелок с поиском: поле, затем пункты. Ластик поля — тоже
        // кнопка, но в круг не входит. Без совпадений пунктов нет — только поле.
        searchStops() {
            const items = this.$refs.list ? [...this.$refs.list.querySelectorAll("button")] : [];

            return [this.$refs.search, ...items];
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
