<template>
    <a
        v-if="isLink"
        :href="href"
        class="bb-dashboard-ui bb:relative bb:inline-flex bb:items-center bb:justify-center bb:whitespace-nowrap bb:gap-2 bb:px-4 bb:py-2 bb:border bb:rounded-md bb:shadow-xs bb:text-sm bb:font-medium bb:cursor-pointer bb:focus:focus-ring"
        :class="hasColor ? [colorClass(color, 'button'), colorClass(color, 'buttonHover')] : 'bb:bg-white bb:border-gray-300 bb:text-gray-700 bb:hover:bg-gray-50'"
        @click="followLink($event, href)"
    >
        <action-icon v-if="hasIcon" :name="icon"/>
        <span class="bb:pointer-events-none bb:cursor-default" v-text="label"></span>
    </a>
    <button
        v-else
        :type="buttonType"
        :disabled="isDisabled"
        class="bb-dashboard-ui bb:relative bb:inline-flex bb:items-center bb:justify-center bb:whitespace-nowrap bb:gap-2 bb:px-4 bb:py-2 bb:border bb:rounded-md bb:shadow-xs bb:text-sm bb:font-medium bb:focus:focus-ring"
        :class="[
            hasColor ? colorClass(color, 'button') : 'bb:bg-white bb:border-gray-300 bb:text-gray-700',
            isDisabled ? 'bb:opacity-50 bb:cursor-not-allowed' : 'bb:cursor-pointer',
            isDisabled ? '' : hasColor ? colorClass(color, 'buttonHover') : 'bb:hover:bg-gray-50',
        ]"
        @click="$emit('click', $event)"
    >
        <action-icon v-if="hasIcon" :name="icon"/>
        <span class="bb:pointer-events-none bb:cursor-default" v-text="label"></span>
    </button>
</template>

<script>
import { isActionIcon } from "../actionIcons.js";
import { isColor, withColors } from "../colors.js";
import { withNavigation } from "../navigation.js";
import ActionIcon from "./ActionIcon.vue";

// Кнопка действия: подпись, цвет из общего списка цветов, иконка из общего
// списка иконок. Что делает действие, кнопка не знает: страница слушает click
// или передаёт href. Событие click несёт исходный MouseEvent: модификаторы
// вида @click.prevent зовут preventDefault() у первого аргумента, а у
// type="submit" он же отменяет отправку формы. class и прочие атрибуты
// попадают на корневой элемент — и у кнопки, и у ссылки.
//
// Комментарий к разметке — здесь, а не в шаблоне: в разработке комментарий
// рядом с корнем остаётся в разметке, и корень становится фрагментом из двух
// узлов. С адресом — настоящая ссылка: обычный клик уходит в navigate плагина.
// Выключенная кнопка с адресом — выключенная кнопка: у ссылки нет disabled,
// и переходить некуда. Иконка — слева от подписи. Содержимое кнопки
// не ловит указатель и без курсора-руки: см. README, «Клавиатурная
// навигация».
export default {
    components: {
        ActionIcon,
    },

    mixins: [withColors, withNavigation],

    emits: ["click"],

    props: {
        label: {
            type: String,
            required: true,
        },
        // Имя из общего списка цветов (src/colors.js); без него — белая кнопка.
        // Пустая строка у color, icon и href — «не задано», как null.
        color: {
            type: String,
            default: null,
            validator: (value) => value === "" || isColor(value),
        },
        // Имя из списка иконок действий (src/actionIcons.js); слева от подписи.
        icon: {
            type: String,
            default: null,
            validator: (value) => value === "" || isActionIcon(value),
        },
        // Адрес: кнопка становится ссылкой.
        href: {
            type: String,
            default: null,
        },
        // У ссылки не действует.
        type: {
            type: String,
            default: "button",
            validator: (value) => ["button", "submit"].includes(value),
        },
        // Кнопка погашена и не нажимается.
        isDisabled: {
            type: Boolean,
            default: false,
        },
    },

    computed: {
        hasColor() {
            return isColor(this.color);
        },

        hasIcon() {
            return isActionIcon(this.icon);
        },

        isLink() {
            return typeof this.href === "string" && this.href !== "" && !this.isDisabled;
        },

        // Значение вне списка — обычная кнопка, а не reset и не пустой type.
        buttonType() {
            return this.type === "submit" ? "submit" : "button";
        },
    },
};
</script>
