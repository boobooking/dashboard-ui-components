<template>
    <span class="bb-dashboard-ui bb:relative bb:inline-flex bb:shadow-xs bb:rounded-md">
        <!-- Без дополнительных действий стрелке нечего открывать: её нет,
             и кнопка скругляется с обеих сторон. -->
        <button
            type="button"
            class="bb:relative bb:inline-flex bb:items-center bb:rounded-l-md bb:border bb:border-gray-300 bb:bg-white bb:hover:bg-gray-50 bb:focus:outline-hidden"
            :class="{ 'bb:rounded-r-md': !hasActions }"
        >
            <slot name="button"></slot>
        </button>
        <span class="bb:-ml-px bb:relative bb:block" v-if="hasActions">
            <!-- Открывает и закрывает меню браузер по popovertarget: свой
                 обработчик click открывал бы меню заново сразу после того,
                 как браузер закрыл его по клику вне. -->
            <button
                ref="arrow"
                :id="menuButtonId"
                type="button"
                :popovertarget="menuId"
                class="bb:relative bb:inline-flex bb:items-center bb:px-2 bb:py-2 bb:rounded-r-md bb:border bb:border-gray-300 bb:bg-white bb:text-sm bb:font-medium bb:text-gray-500 bb:hover:bg-gray-50 bb:focus:z-10 bb:focus:outline-hidden bb:focus:ring-1 bb:focus:ring-indigo-500 bb:focus:border-indigo-500"
            >
                <span class="bb:sr-only">{{ texts.openMenu }}</span>
                <svg
                    class="bb:h-5 bb:w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path
                        fill-rule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                    />
                </svg>
            </button>
            <!-- Меню в верхнем слое браузера: таблицу с горизонтальной
                 прокруткой оно не расширяет, и она его не обрезает.
                 m-0 inset-auto снимают умолчания браузера для [popover],
                 иначе меню встало бы в центр окна; координаты ставит
                 placePopover. text-inherit возвращает пунктам цвет текста
                 страницы: у popover в верхнем слое свой color. Клик внутри
                 меню закрывает его: открытое
                 меню легло бы поверх модалки, которую открывает пункт. -->
            <div
                ref="menu"
                :id="menuId"
                popover="auto"
                class="bb:m-0 bb:inset-auto bb:w-56 bb:rounded-md bb:shadow-lg bb:bg-white bb:text-inherit bb:ring-1 bb:ring-black/5"
                role="menu"
                aria-orientation="vertical"
                :aria-labelledby="menuButtonId"
                @beforetoggle="onBeforeToggle"
                @toggle="onToggle"
                @click="close"
            >
                <!-- Вид пунктов задаёт только компонент: страница передаёт
                     данные, а не разметку. Подсветка — фокус, его ставят и
                     стрелки, и мышь (moveMenuFocus), поэтому hover-стилей нет. -->
                <template v-for="(item, index) in actionItems" :key="index">
                    <a
                        v-if="isLink(item)"
                        :href="item.href"
                        role="menuitem"
                        class="bb:block bb:w-full bb:px-4 bb:py-2 bb:text-sm bb:text-left bb:cursor-pointer bb:focus:outline-hidden"
                        :class="item.danger === true ? 'bb:bg-red-400 bb:text-white bb:focus:bg-red-500' : 'bb:text-gray-700 bb:focus:bg-gray-100 bb:focus:text-gray-900'"
                        @click="followLink($event, item.href)"
                        v-text="item.label"
                    ></a>
                    <button
                        v-else
                        type="button"
                        role="menuitem"
                        class="bb:block bb:w-full bb:px-4 bb:py-2 bb:text-sm bb:text-left bb:cursor-pointer bb:focus:outline-hidden"
                        :class="item.danger === true ? 'bb:bg-red-400 bb:text-white bb:focus:bg-red-500' : 'bb:text-gray-700 bb:focus:bg-gray-100 bb:focus:text-gray-900'"
                        @click="select(item)"
                        v-text="item.label"
                    ></button>
                </template>
            </div>
        </span>
    </span>
</template>

<script>
import { useId } from "vue";
import { withLang } from "../lang.js";
import { withNavigation } from "../navigation.js";
import { canControlPopover, closeOnScrollAndResize, isPopoverOpen, placePopover } from "../popover.js";
import { moveMenuFocus } from "../menuFocus.js";

// Ширина меню — bb:w-56. У стрелки ближе к левому краю окна меню сужается
// до места слева.
const MENU_WIDTH = 224;

export default {
    mixins: [withLang, withNavigation],

    emits: ["update:modelValue"],

    props: {
        // Пункты меню: { label, href } — переход, { label, onSelect } —
        // действие, danger: true — опасный пункт.
        actions: {
            type: Array,
            default: () => [],
        },
        modelValue: {
            type: Boolean,
            default: false,
        },
    },

    setup() {
        return {
            menuButtonId: useId(),
            menuId: useId(),
        };
    },

    data() {
        return {
            // Текущее значение меню. По нему гасится ответное событие:
            // toggle браузер присылает позже и объединяет переключения подряд,
            // поэтому временный флаг вокруг showPopover() его бы пропустил.
            menuIsOpen: this.modelValue,
        };
    },

    computed: {
        // null — пустой список: компонент не падает на null.
        actionItems() {
            return this.actions ?? [];
        },

        hasActions() {
            return this.actionItems.length > 0;
        },
    },

    watch: {
        // Входящее значение только принимается. Ответное событие вернуло бы
        // родителю его же решение, и обработчик вида «закрыли — сбросить
        // выбор» сбросил бы строку, которую родитель только что выбрал.
        modelValue(isOpen) {
            this.menuIsOpen = isOpen;
            this.applyMenuState();
        },

        // DOM меню появляется и исчезает только при рендере, поэтому
        // наблюдатель — после него (flush: "post"). Пункты появились:
        // наблюдатель modelValue мог сработать раньше, когда меню ещё не было
        // в DOM, — состояние применяется заново. Пункты пропали: удаляя
        // открытый popover из документа, браузер не присылает toggle, и без
        // этого слушатели стрелок и прокрутки остались бы висеть, а родитель
        // считал бы меню открытым.
        hasActions: {
            flush: "post",
            handler(hasActions) {
                if (hasActions) {
                    this.applyMenuState();
                    return;
                }

                this.stopListening();

                if (this.menuIsOpen) {
                    this.menuIsOpen = false;
                    this.$emit("update:modelValue", false);
                }
            },
        },
    },

    created() {
        // Снимает слушатели прокрутки и размера окна, пока меню открыто.
        this.stopClosing = null;
        // Снимает слушатель стрелок, пока меню открыто.
        this.stopArrows = null;
    },

    mounted() {
        this.applyMenuState();
    },

    beforeUnmount() {
        this.stopListening();
    },

    methods: {
        isLink(item) {
            return item.href !== undefined;
        },

        select(item) {
            item.onSelect();
        },

        // Привести меню к menuIsOpen. Без Popover API и вне документа
        // управлять нечем.
        applyMenuState() {
            const menu = this.$refs.menu;

            if (!canControlPopover(menu) || !menu.isConnected) {
                return;
            }

            if (this.menuIsOpen && !isPopoverOpen(menu)) {
                menu.showPopover();
            }

            if (!this.menuIsOpen && isPopoverOpen(menu)) {
                menu.hidePopover();
            }
        },

        close() {
            const menu = this.$refs.menu;

            if (isPopoverOpen(menu)) {
                menu.hidePopover();
            }
        },

        onBeforeToggle(event) {
            if (event.newState === "open") {
                placePopover(this.$refs.arrow, this.$refs.menu, { maxWidth: MENU_WIDTH });
            }
        },

        // Единственный путь, которым меню сообщает родителю об открытии или
        // закрытии: стрелка, клик вне, Escape, клик по пункту, прокрутка,
        // размер окна. Значение, совпавшее с текущим, — эхо входящего, его
        // не эмитят. Слушатели вешаются по фактическому состоянию меню:
        // toggle мог прийти после размонтирования или устареть.
        onToggle(event) {
            this.stopListening();

            const menu = this.$refs.menu;
            if (isPopoverOpen(menu)) {
                this.stopClosing = closeOnScrollAndResize(menu, this.close);
                this.stopArrows = moveMenuFocus(menu);
            }

            const isOpen = event.newState === "open";
            if (isOpen === this.menuIsOpen) {
                return;
            }

            this.menuIsOpen = isOpen;
            this.$emit("update:modelValue", isOpen);
        },

        stopListening() {
            if (this.stopClosing !== null) {
                this.stopClosing();
                this.stopClosing = null;
            }

            if (this.stopArrows !== null) {
                this.stopArrows();
                this.stopArrows = null;
            }
        },
    },
};
</script>
