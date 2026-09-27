<template>
    <!-- Обёртка рендерится всегда: если прятать её вместе с modelValue, меню уходит
         из потока раньше, чем доиграет переход. Пустая и нулевой высоты, на
         раскладку не влияет. -->
    <div class="bb-dashboard-ui bb:relative">
        <overlay v-model:is-open="overlayIsOpen"></overlay>
        <!-- Переход висит на самом меню, а не на обёртке. Ненулевой scale на
             обёртке делал её контекстом наложения, из-за чего z-20 меню не
             работал всю анимацию, и containing block для fixed-оверлея, из-за
             чего ловушка кликов схлопывалась. Плюс transform-origin считался
             по коробке обёртки, а не меню. -->
        <transition
            enter-active-class="bb:transition bb:ease-out bb:duration-100"
            enter-from-class="bb:opacity-0 bb:scale-95"
            enter-to-class="bb:opacity-100 bb:scale-100"
            leave-active-class="bb:transition bb:ease-in bb:duration-75"
            leave-from-class="bb:opacity-100 bb:scale-100"
            leave-to-class="bb:opacity-0 bb:scale-95"
        >
            <div
                v-show="modelValue"
                v-bind="$attrs"
                class="bb:absolute bb:z-20"
                :class="{ 'bb:left-0': alignLeft, 'bb:right-0': alignRight }"
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

    emits: ["update:modelValue"],

    props: {
        modelValue: {
            type: Boolean,
            default: false,
        },
        align: {
            type: String,
            default: "left",
            validator: (value) => {
                return ["left", "right"].indexOf(value) !== -1;
            },
        },
    },

    data() {
        return {
            overlayIsOpen: this.modelValue,
        };
    },

    watch: {
        modelValue: function (newState) {
            this.overlayIsOpen = newState;
        },
        overlayIsOpen(newValue) {
            this.$emit("update:modelValue", newValue);
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
