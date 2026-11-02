<template>
    <!-- Механика меню — PopoverPanel; здесь пункты и вид панели меню.
         Меню не уже bb:min-w-56 (224 px) и растёт по самому длинному пункту:
         подпись пункта всегда в одну строку. Если слева от кнопки не хватает
         места, меню сдвигается вправо (shift). Клик внутри меню закрывает
         его: открытое меню легло бы поверх модалки, которую открывает пункт. -->
    <popover-panel
        :model-value="modelValue"
        :has-content="hasActions"
        align="end"
        shift
        arrows
        close-on-click
        return-focus
        panel-class="bb:w-max bb:min-w-56 bb:rounded-md bb:shadow-lg bb:bg-white bb:ring-1 bb:ring-black/5"
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
                 и фокус; фокус ставят стрелки (moveMenuFocus) и клик.
                 Подпись всегда в одну строку. Если иконка есть хотя бы у
                 одного пункта, ActionIcon без имени оставляет на месте
                 иконки пустой блок: текст всех пунктов стоит на одной линии. -->
            <template v-for="(item, index) in actionItems" :key="index">
                <a
                    v-if="isLink(item)"
                    :href="item.href"
                    role="menuitem"
                    class="bb:flex bb:items-center bb:gap-2 bb:w-full bb:px-4 bb:py-2 bb:text-sm bb:text-left bb:cursor-pointer bb:focus:outline-hidden"
                    :class="color(item) === null ? 'bb:text-gray-700 bb:hover:bg-gray-100 bb:hover:text-gray-900 bb:focus:bg-gray-100 bb:focus:text-gray-900' : colorClass(color(item), 'menuItem')"
                    @click="linkClicked($event, item.href)"
                >
                    <action-icon v-if="hasIcons" :name="icon(item)"/>
                    <span class="bb:min-w-0 bb:truncate bb:pointer-events-none bb:cursor-default" v-text="item.label"></span>
                </a>
                <button
                    v-else
                    type="button"
                    role="menuitem"
                    class="bb:flex bb:items-center bb:gap-2 bb:w-full bb:px-4 bb:py-2 bb:text-sm bb:text-left bb:cursor-pointer bb:focus:outline-hidden"
                    :class="color(item) === null ? 'bb:text-gray-700 bb:hover:bg-gray-100 bb:hover:text-gray-900 bb:focus:bg-gray-100 bb:focus:text-gray-900' : colorClass(color(item), 'menuItem')"
                    @click="select(item, $event)"
                >
                    <action-icon v-if="hasIcons" :name="icon(item)"/>
                    <span class="bb:min-w-0 bb:truncate bb:pointer-events-none bb:cursor-default" v-text="item.label"></span>
                </button>
            </template>
        </template>
    </popover-panel>
</template>

<script>
import { withColors } from "../colors.js";
import { withNavigation } from "../navigation.js";
import { isLinkItem, itemColor, itemIcon, toMenuItems } from "../menuItems.js";
import ActionIcon from "./ActionIcon.vue";
import PopoverPanel from "./PopoverPanel.vue";

// Меню из пунктов actions на PopoverPanel: пункты и вид панели меню. Кнопку,
// которая открывает меню, рисует вызывающий компонент в слоте trigger.
// Внутренний компонент пакета: на нём стоят меню DropdownButtonWithAction
// и HamburgerMenu.
export default {
    components: {
        ActionIcon,
        PopoverPanel,
    },

    mixins: [withNavigation, withColors],

    emits: ["update:modelValue"],

    props: {
        // Пункты меню: { label, href } — переход, { label, onSelect } —
        // действие, color — имя из общего списка цветов, icon — имя из списка
        // иконок действий. Тип и пункты проверяют публичные компоненты:
        // проверка и здесь давала бы каждое предупреждение дважды.
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

        hasIcons() {
            return this.actionItems.some((item) => itemIcon(item) !== null);
        },
    },

    methods: {
        color(item) {
            return itemColor(item);
        },

        icon(item) {
            return itemIcon(item);
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
        // Фокус на пункт — по той же причине, что у ссылки (linkClicked).
        select(item, event) {
            event.currentTarget.focus({ preventScroll: true });
            if (typeof item.onSelect === "function") {
                return item.onSelect();
            }
        },
    },
};
</script>
