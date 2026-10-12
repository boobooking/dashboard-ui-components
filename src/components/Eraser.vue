<template>
    <button
        type="button"
        tabindex="-1"
        class="bb:absolute bb:right-0 bb:top-0 bb:flex bb:items-center bb:justify-center bb:bg-transparent bb:cursor-pointer bb:text-gray-300 bb:hover:text-gray-400 bb:focus:outline-hidden"
        @click="press"
    >
        <!-- Содержимое кнопки не ловит указатель и без курсора-руки:
             см. README, «Клавиатурная навигация». -->
        <span class="bb:sr-only bb:pointer-events-none bb:cursor-default">{{ texts.clear }}</span>
        <svg class="bb:w-6 bb:h-6 bb:stroke-current bb:pointer-events-none bb:cursor-default" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
    </button>
</template>

<script>
import { withLang } from "../lang.js";
import { withPress } from "../press.js";

// Нажатие — с анимацией, clicked — после неё: src/press.js.
export default {
    mixins: [withLang, withPress],

    emits: ["clicked"],
};
</script>
