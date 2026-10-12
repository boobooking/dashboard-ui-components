<template>
    <!-- Меню, его пункты и поведение — PopoverMenu; здесь только кнопка ☰,
         которая его открывает. Без пунктов кнопки нет. -->
    <popover-menu class="bb-dashboard-ui bb:inline-flex" :actions="actions">
        <template #trigger="trigger">
            <button
                type="button"
                :id="trigger.id"
                :popovertarget="trigger.popovertarget"
                class="bb:relative bb:inline-flex bb:items-center bb:justify-center bb:p-2 bb:rounded-md bb:text-gray-400 bb:hover:text-gray-500 bb:hover:bg-gray-100 bb:focus:outline-hidden bb:focus:bg-gray-100 bb:focus:text-gray-500 bb:transition bb:duration-150 bb:ease-in-out"
            >
                <!-- Содержимое кнопки не ловит указатель и без курсора-руки:
                     см. README, «Клавиатурная навигация». -->
                <span class="bb:sr-only bb:pointer-events-none bb:cursor-default">{{ texts.openMenu }}</span>
                <svg class="bb:h-6 bb:w-6 bb:pointer-events-none bb:cursor-default" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
            </button>
        </template>
    </popover-menu>
</template>

<script>
import { withLang } from "../lang.js";
import { isMenuItem } from "../menuItems.js";
import PopoverMenu from "./PopoverMenu.vue";

export default {
    components: {
        PopoverMenu,
    },

    mixins: [withLang],

    props: {
        // Пункты меню — как у DropdownButtonWithAction: { label, href } —
        // переход, { label, onSelect } — действие, color — имя из общего
        // списка цветов.
        actions: {
            type: Array,
            default: () => [],
            validator: (value) => value.every(isMenuItem),
        },
    },
};
</script>
