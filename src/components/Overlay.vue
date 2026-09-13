<template>
    <!-- Фон-кнопка отлавливающая клики и Esc -->
    <button
        v-show="isOpen"
        tabindex="-1"
        @click.prevent="closeOverlay"
        class="fixed inset-0 w-full h-full cursor-default flex items-start"
        :class="{
            'z-20': isOpen,
            'bg-transparent': isTransparent,
            'bg-gray-900 opacity-75': !isTransparent,
        }"
    />
</template>

<script>
export default {
    props: {
        isOpen: {
            type: Boolean,
            default: false,
        },

        isTransparent: {
            type: Boolean,
            default: true,
        },
    },

    emits: ["update:isOpen", "escaped"],

    methods: {
        closeOverlay() {
            this.$emit("update:isOpen", false);
            this.$emit("escaped");
        },

        // Слушатель висит на document, а не на самом оверлее: фокус в момент
        // нажатия может быть где угодно на странице. Escape обрабатывается
        // только у открытого оверлея — закрытых на странице столько же, сколько
        // выпадающих списков, и все они отвечали бы на одно нажатие.
        handleEscape(event) {
            if (!this.isOpen) {
                return;
            }

            if (event.key === "Esc" || event.key === "Escape") {
                this.closeOverlay();
            }
        },
    },

    mounted() {
        document.addEventListener("keydown", this.handleEscape);
    },

    beforeUnmount() {
        document.removeEventListener("keydown", this.handleEscape);
    },
};
</script>
