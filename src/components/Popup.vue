<template>
    <!-- Обёртка рендерится всегда: если прятать её вместе с isOpen, меню уходит
         из потока раньше, чем доиграет переход. Пустая и нулевой высоты, на
         раскладку не влияет. -->
    <div class="bb-dashboard-ui relative">
        <overlay v-model:is-open="overlayIsOpen"></overlay>
        <!-- Переход висит на самом меню, а не на обёртке. Ненулевой scale на
             обёртке делал её контекстом наложения, из-за чего z-20 меню не
             работал всю анимацию, и containing block для fixed-оверлея, из-за
             чего ловушка кликов схлопывалась. Плюс transform-origin считался
             по коробке обёртки, а не меню. -->
        <transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
        >
            <div
                v-show="isOpen"
                v-bind="$attrs"
                class="absolute z-20"
                :class="{ 'left-0': alignLeft, 'right-0': alignRight }"
            >
                <slot></slot>
            </div>
        </transition>
    </div>
</template>

<script>
import Overlay from "./Overlay.vue";

export default {
    components: {
        Overlay,
    },

    // Классы вроде origin-top-right адресованы меню, а не обёртке: только на
    // меню transform-origin считается по его собственной коробке.
    inheritAttrs: false,

    emits: ["update:isOpen"],

    props: {
        isOpen: {
            type: Boolean,
            default: false,
        },
        align: {
            type: String,
            default: "left",
        },
    },

    data() {
        return {
            overlayIsOpen: this.isOpen,
        };
    },

    watch: {
        isOpen: function (newState) {
            this.overlayIsOpen = newState;
        },
        overlayIsOpen(newValue) {
            this.$emit("update:isOpen", newValue);
        },
    },

    computed: {
        alignLeft() {
            return this.align === "left";
        },

        alignRight() {
            return this.align === "right";
        },
    },
};
</script>
