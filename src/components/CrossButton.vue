<template>
    <button
        type="button"
        class="bb-dashboard-ui bb:group bb:flex bb:items-center bb:justify-center bb:bg-transparent bb:cursor-pointer bb:text-gray-400 bb:focus:outline-hidden bb:hover:text-gray-500"
        @click.prevent="press"
    >
        <!-- Подпись для скринридера — в слоте, без слота — «Очистить».
             Содержимое кнопки не ловит указатель и без курсора-руки: см.
             README, «Клавиатурная навигация». -->
        <span class="bb:sr-only bb:pointer-events-none bb:cursor-default"><slot>{{ texts.clear }}</slot></span>
        <!-- Кольцо фокуса — вокруг иконки, а не кнопки: у кнопки справа может
             быть отступ, и кольцо сдвинуло бы крестик от центра. -->
        <span class="bb:flex bb:rounded-md bb:group-focus-visible:focus-ring bb:pointer-events-none bb:cursor-default">
            <svg class="bb:stroke-current bb:pointer-events-none bb:cursor-default" :class="{ 'bb:w-6 bb:h-6': size === 'small', 'bb:w-8 bb:h-8': size === 'large' }" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </span>
    </button>
</template>

<script>
import { withLang } from "../lang.js";
import { withPress } from "../press.js";

// Кнопка-крестик. Что она делает — закрывает или очищает, — решает тот, кто
// её использует: подписью в слоте и обработчиком clicked. Он же задаёт
// положение и размер кнопки; иконка всегда в её центре, не считая отступа,
// если родитель его задал. Кольцо фокуса с клавиатуры — вокруг иконки.
// Нажатие — с анимацией, clicked — после неё: src/press.js.
export default {
    mixins: [withLang, withPress],

    props: {
        // Размер иконки: small — 24×24, large — 32×32.
        size: {
            type: String,
            required: true,
            validator: (value) => ["small", "large"].includes(value),
        },
    },

    emits: ["clicked"],
};
</script>
