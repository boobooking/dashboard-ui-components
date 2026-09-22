<template>
    <button
        type="button"
        tabindex="-1"
        class="bb-dashboard-ui flex items-center justify-center bg-transparent cursor-pointer text-gray-400 focus:outline-hidden hover:text-gray-600"
        @click.prevent="$emit('clicked')"
    >
        <svg class="w-full h-full stroke-current" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
    </button>
</template>

<script>
export default {
    emits: ["clicked"],
};
</script>
