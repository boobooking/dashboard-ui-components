<template>
    <!-- Фон-кнопка отлавливающая клики и Esc -->
    <button
        v-show="isOpen"
        tabindex="-1"
        @click.prevent="closeOverlay"
        class="bb:fixed bb:inset-0 bb:w-full bb:h-full bb:cursor-default bb:flex bb:items-start"
        :class="{
            'bb:z-20': isOpen,
            'bb:bg-transparent': isTransparent,
            'bb:bg-gray-900 bb:opacity-75': !isTransparent,
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
        // Слушатель — в фазе захвата: расширения браузера останавливают
        // keydown на body, и до document на всплытии Escape не доходит.
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
        document.addEventListener("keydown", this.handleEscape, true);
    },

    beforeUnmount() {
        document.removeEventListener("keydown", this.handleEscape, true);
    },
};
</script>
