<template>
    <button
        type="button"
        tabindex="-1"
        class="bb-dashboard-ui bb:flex bb:items-center bb:justify-center bb:bg-transparent bb:cursor-pointer bb:text-gray-400 bb:focus:outline-hidden bb:hover:text-gray-600"
        @click.prevent="$emit('clicked')"
    >
        <!-- Подпись для скринридера — в слоте. Содержимое кнопки не ловит
             указатель и без курсора-руки: см. README, «Клавиатурная
             навигация». -->
        <span class="bb:sr-only bb:pointer-events-none bb:cursor-default"><slot></slot></span>
        <svg class="bb:w-full bb:h-full bb:stroke-current bb:pointer-events-none bb:cursor-default" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
    </button>
</template>

<script>
export default {
    emits: ["clicked"],
};
</script>
