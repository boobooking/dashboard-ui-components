<template>
    <div class="bb:flex bb:flex-col bb:grow bb:bg-white">
        <div class="bb:relative bb:flex bb:w-full bb:h-full">
            <button
                ref="trigger"
                type="button"
                class="bb:flex bb:w-full bb:h-full bb:items-center bb:focus:outline-hidden bb:cursor-pointer"
                :class="{ 'bb:z-20': isOpen }"
                @click.prevent="$emit('update:isOpen', !isOpen)"
            >
                <span
                    class="bb:flex bb:w-full bb:h-full bb:pl-3 bb:pr-12 bb:py-2 bb:items-center bb:whitespace-nowrap bb:leading-none"
                    v-text="title"
                />
            </button>
            <eraser v-if="needsEraser" @click="$emit('erased')" class="bb:pr-2 bb:h-full"></eraser>
        </div>

        <popup v-model="popupIsOpen">
            <slot></slot>
        </popup>
    </div>
</template>

<script>
import Popup from "./Popup.vue";
import Eraser from "./Eraser.vue";

export default {
    components: { Popup, Eraser },

    emits: ["update:isOpen", "erased"],

    props: {
        isOpen: {
            type: Boolean,
            default: false,
        },
        title: {
            type: String,
            default: null,
        },
        hasValue: {
            type: Boolean,
            default: true,
        },
    },

    data() {
        return {
            popupIsOpen: this.isOpen,
        };
    },

    watch: {
        // Фокус со скрытого пункта возвращается на кнопку: иначе он пропал бы
        // со страницы, и Tab начинал бы с её начала.
        isOpen(newValue) {
            this.popupIsOpen = newValue;

            if (!newValue && this.$el.contains(document.activeElement)) {
                this.$refs.trigger.focus();
            }
        },
        popupIsOpen(newValue) {
            this.$emit("update:isOpen", newValue);
        },
    },

    computed: {
        needsEraser() {
            if (this.isOpen) {
                return false;
            }

            return this.hasValue;
        },
    },
};
</script>
