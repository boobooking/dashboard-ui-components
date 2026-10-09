<template>
    <!-- Кнопка из действий actions: первое — основная кнопка, остальные —
         меню за стрелкой. Без действий кнопки нет. Цвет первого действия
         красит основную кнопку вместе со стрелкой, цвет пункта меню — только
         этот пункт. -->
    <span v-if="hasActions" class="bb-dashboard-ui bb:relative bb:inline-flex bb:shadow-xs bb:rounded-md">
        <!-- Основное действие выполняет пакет, как и пункт меню: переход —
             ссылка через navigate плагина, действие — кнопка, которая
             вызывает onSelect. Проекту не нужно ловить клик самому и
             зависеть от разметки кнопки. Без меню стрелки нет, и кнопка
             скругляется с обеих сторон. -->
        <a
            v-if="isLink(mainAction)"
            :href="mainAction.href"
            class="bb:relative bb:inline-flex bb:items-center bb:px-4 bb:py-2 bb:border bb:text-sm bb:font-medium bb:cursor-pointer bb:focus:z-10 bb:focus:outline-hidden bb:focus:ring-1 bb:focus:ring-indigo-500 bb:focus:border-indigo-500"
            :class="{
                'bb:rounded-l-md': hasMenu,
                'bb:rounded-md': !hasMenu,
                'bb:bg-white bb:border-gray-300 bb:text-gray-700 bb:hover:bg-gray-50': mainColor === null,
                'bb:bg-yellow-100 bb:border-yellow-300 bb:text-yellow-800 bb:hover:bg-yellow-200': mainColor === 'yellow',
                'bb:bg-red-50 bb:border-red-300 bb:text-red-700 bb:hover:bg-red-100': mainColor === 'red',
            }"
            @click="followLink($event, mainAction.href)"
            v-text="mainAction.label"
        ></a>
        <button
            v-else
            type="button"
            class="bb:relative bb:inline-flex bb:items-center bb:px-4 bb:py-2 bb:border bb:text-sm bb:font-medium bb:cursor-pointer bb:focus:z-10 bb:focus:outline-hidden bb:focus:ring-1 bb:focus:ring-indigo-500 bb:focus:border-indigo-500"
            :class="{
                'bb:rounded-l-md': hasMenu,
                'bb:rounded-md': !hasMenu,
                'bb:bg-white bb:border-gray-300 bb:text-gray-700 bb:hover:bg-gray-50': mainColor === null,
                'bb:bg-yellow-100 bb:border-yellow-300 bb:text-yellow-800 bb:hover:bg-yellow-200': mainColor === 'yellow',
                'bb:bg-red-50 bb:border-red-300 bb:text-red-700 bb:hover:bg-red-100': mainColor === 'red',
            }"
            @click="select(mainAction)"
            v-text="mainAction.label"
        ></button>
        <!-- Меню, его пункты и поведение — PopoverMenu; здесь только стрелка,
             которая его открывает. Обёртка стрелки — flex: стрелка
             растягивается по высоте основной кнопки. Без пунктов меню
             PopoverMenu не рисует ни стрелки, ни панели. -->
        <popover-menu
            class="bb:-ml-px bb:flex"
            :actions="menuActions"
            :model-value="modelValue"
            @update:model-value="onMenuToggle"
        >
            <template #trigger="trigger">
                <button
                    type="button"
                    :id="trigger.id"
                    :popovertarget="trigger.popovertarget"
                    class="bb:relative bb:inline-flex bb:items-center bb:px-2 bb:py-2 bb:rounded-r-md bb:border bb:text-sm bb:font-medium bb:focus:z-10 bb:focus:outline-hidden bb:focus:ring-1 bb:focus:ring-indigo-500 bb:focus:border-indigo-500"
                    :class="{
                        'bb:bg-white bb:border-gray-300 bb:text-gray-500 bb:hover:bg-gray-50': mainColor === null,
                        'bb:bg-yellow-100 bb:border-yellow-300 bb:text-yellow-800 bb:hover:bg-yellow-200': mainColor === 'yellow',
                        'bb:bg-red-50 bb:border-red-300 bb:text-red-700 bb:hover:bg-red-100': mainColor === 'red',
                    }"
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
            </template>
        </popover-menu>
    </span>
</template>

<script>
import { withLang } from "../lang.js";
import { isLinkItem, isMenuItem, itemColor, toMenuItems, warnsRemovedDanger } from "../menuItems.js";
import { withNavigation } from "../navigation.js";
import PopoverMenu from "./PopoverMenu.vue";

export default {
    components: {
        PopoverMenu,
    },

    mixins: [withLang, withNavigation, warnsRemovedDanger("DropdownButtonWithAction")],

    emits: ["update:modelValue"],

    props: {
        // Действия: первое — основная кнопка, остальные — пункты меню.
        // { label, href } — переход, { label, onSelect } — действие,
        // color: 'yellow' или 'red' — цвет.
        actions: {
            type: Array,
            default: () => [],
            validator: (value) => value.every(isMenuItem),
        },
        modelValue: {
            type: Boolean,
            default: false,
        },
    },

    data() {
        return {
            // Последнее значение меню — из его событий и входящего значения:
            // меню, пропавшее вместе с последним действием, о закрытии
            // уже не сообщит.
            menuIsOpen: this.modelValue,
        };
    },

    computed: {
        items() {
            return toMenuItems(this.actions);
        },

        hasActions() {
            return this.items.length > 0;
        },

        mainAction() {
            return this.items[0];
        },

        // Цвет первого действия — цвет всей кнопки, вместе со стрелкой.
        mainColor() {
            return this.hasActions ? itemColor(this.mainAction) : null;
        },

        menuActions() {
            return this.items.slice(1);
        },

        hasMenu() {
            return this.menuActions.length > 0;
        },
    },

    watch: {
        modelValue(isOpen) {
            this.menuIsOpen = isOpen;
        },

        // Меню пропало вместе со всей кнопкой — действий не осталось:
        // PopoverMenu размонтирован и о закрытии открытого меню уже
        // не сообщит, сообщает кнопка. Меню, пропавшее при оставшейся
        // кнопке, о закрытии сообщает само. При одном действии меню нет,
        // и пропажа последнего действия ничего не закрывает.
        hasMenu(hasMenu) {
            if (!hasMenu && !this.hasActions && this.menuIsOpen) {
                this.menuIsOpen = false;
                this.$emit("update:modelValue", false);
            }
        },
    },

    created() {
        // Слот actions убран: пункты задаёт проп. Меню проекта, который ещё
        // передаёт разметку, осталось бы без пунктов молча. Проверку
        // process.env.NODE_ENV подменяет бандлер проекта, как у самого Vue:
        // в продакшен-сборке её и предупреждения нет.
        if (process.env.NODE_ENV !== "production" && this.$slots.actions) {
            console.warn("[dashboard-ui-components] DropdownButtonWithAction: слот actions убран, пункты меню передаются пропом actions");
        }

        // Слот button убран: основная кнопка — первое действие. Кнопка
        // проекта, который ещё передаёт разметку, молча потеряла бы своё
        // основное действие.
        if (process.env.NODE_ENV !== "production" && this.$slots.button) {
            console.warn("[dashboard-ui-components] DropdownButtonWithAction: слот button убран, основная кнопка — первый пункт actions");
        }
    },

    methods: {
        isLink(item) {
            return isLinkItem(item);
        },

        // Кнопка без функции onSelect по клику ничего не делает. Результат
        // onSelect возвращается обработчику клика: отклонённый Promise
        // асинхронного onSelect Vue передаёт в свой обработчик ошибок,
        // а без return отказ ушёл бы в unhandledrejection.
        select(item) {
            if (typeof item.onSelect === "function") {
                return item.onSelect();
            }
        },

        onMenuToggle(isOpen) {
            this.menuIsOpen = isOpen;
            this.$emit("update:modelValue", isOpen);
        },
    },
};
</script>
