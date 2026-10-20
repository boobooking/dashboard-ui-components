<template>
    <!-- Механика меню — PopoverPanel; здесь пункты и вид панели меню.
         Ширина меню — bb:w-56 (224 px): у кнопки ближе к левому краю окна
         меню сужается до места слева. Клик внутри меню закрывает его:
         открытое меню легло бы поверх модалки, которую открывает пункт. -->
    <popover-panel
        :model-value="modelValue"
        :has-content="hasActions"
        align="end"
        :max-width="224"
        arrows
        close-on-click
        return-focus
        panel-class="bb:w-56 bb:rounded-md bb:shadow-lg bb:bg-white bb:ring-1 bb:ring-black/5"
        panel-role="menu"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <template #trigger="trigger">
            <slot name="trigger" :id="trigger.id" :popovertarget="trigger.popovertarget"></slot>
        </template>
        <template #default>
            <!-- Вид пунктов задаёт только компонент: страница передаёт
                 данные, а не разметку. Цвет текста у каждого пункта
                 свой: у popover в верхнем слое color браузера, а не
                 страницы. Пункт подсвечивают наведение (hover)
                 и фокус; фокус ставят стрелки (moveMenuFocus) и клик. -->
            <template v-for="(item, index) in actionItems" :key="index">
                <a
                    v-if="isLink(item)"
                    :href="item.href"
                    role="menuitem"
                    class="bb:block bb:w-full bb:px-4 bb:py-2 bb:text-sm bb:text-left bb:cursor-pointer bb:focus:outline-hidden"
                    :class="color(item) === null ? 'bb:text-gray-700 bb:hover:bg-gray-100 bb:hover:text-gray-900 bb:focus:bg-gray-100 bb:focus:text-gray-900' : colorClass(color(item), 'menuItem')"
                    @click="linkClicked($event, item.href)"
                    v-text="item.label"
                ></a>
                <button
                    v-else
                    type="button"
                    role="menuitem"
                    class="bb:block bb:w-full bb:px-4 bb:py-2 bb:text-sm bb:text-left bb:cursor-pointer bb:focus:outline-hidden"
                    :class="color(item) === null ? 'bb:text-gray-700 bb:hover:bg-gray-100 bb:hover:text-gray-900 bb:focus:bg-gray-100 bb:focus:text-gray-900' : colorClass(color(item), 'menuItem')"
                    @click="select(item, $event)"
                    v-text="item.label"
                ></button>
            </template>
        </template>
    </popover-panel>
</template>

<script>
import { withColors } from "../colors.js";
import { withNavigation } from "../navigation.js";
import { isLinkItem, itemColor, toMenuItems } from "../menuItems.js";
import PopoverPanel from "./PopoverPanel.vue";

// Меню из пунктов actions на PopoverPanel: пункты и вид панели меню. Кнопку,
// которая открывает меню, рисует вызывающий компонент в слоте trigger.
// Внутренний компонент пакета: на нём стоят меню DropdownButtonWithAction
// и HamburgerMenu.
export default {
    components: {
        PopoverPanel,
    },

    mixins: [withNavigation, withColors],

    emits: ["update:modelValue"],

    props: {
        // Пункты меню: { label, href } — переход, { label, onSelect } —
        // действие, color — имя из общего списка цветов. Тип и пункты проверяют
        // публичные компоненты: проверка и здесь давала бы каждое
        // предупреждение дважды.
        actions: {
            default: () => [],
        },
        modelValue: {
            type: Boolean,
            default: false,
        },
    },

    computed: {
        actionItems() {
            return toMenuItems(this.actions);
        },

        hasActions() {
            return this.actionItems.length > 0;
        },
    },

    methods: {
        color(item) {
            return itemColor(item);
        },

        // Ссылка — только при непустом строковом href; у ссылки onSelect
        // не вызывается.
        isLink(item) {
            return isLinkItem(item);
        },

        // Safari по клику фокус на пункт не ставит: фокус на пункте до закрытия
        // меню — условие возврата его на кнопку меню (returnFocus панели).
        linkClicked(event, href) {
            event.currentTarget.focus({ preventScroll: true });
            this.followLink(event, href);
        },

        // Кнопка без функции onSelect по клику только закрывает меню.
        // Результат onSelect возвращается обработчику клика: отклонённый
        // Promise асинхронного onSelect Vue передаёт в свой обработчик ошибок,
        // а без return отказ ушёл бы в unhandledrejection.
        select(item, event) {
            event.currentTarget.focus({ preventScroll: true });
            if (typeof item.onSelect === "function") {
                return item.onSelect();
            }
        },
    },
};
</script>
