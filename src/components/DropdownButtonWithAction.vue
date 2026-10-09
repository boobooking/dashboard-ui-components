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
        <!-- Меню, его пункты и поведение — PopoverMenu; здесь только стрелка,
             которая его открывает. Обёртка стрелки — flex: стрелка
             растягивается по высоте основной кнопки, которую задаёт слот. -->
        <popover-menu
            class="bb:-ml-px bb:flex"
            :actions="actions"
            :model-value="modelValue"
            @update:model-value="$emit('update:modelValue', $event)"
        >
            <template #trigger="trigger">
                <button
                    type="button"
                    :id="trigger.id"
                    :popovertarget="trigger.popovertarget"
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
            </template>
        </popover-menu>
    </span>
</template>

<script>
import { withLang } from "../lang.js";
import { isMenuItem, toMenuItems } from "../menuItems.js";
import PopoverMenu from "./PopoverMenu.vue";

export default {
    components: {
        PopoverMenu,
    },

    mixins: [withLang],

    emits: ["update:modelValue"],

    props: {
        // Пункты меню: { label, href } — переход, { label, onSelect } —
        // действие, danger: true — опасный пункт.
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

    computed: {
        // Основная кнопка лежит вне PopoverMenu: есть ли пункты, она узнаёт
        // здесь.
        hasActions() {
            return toMenuItems(this.actions).length > 0;
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
    },
};
</script>
