<template>
    <div class="flex flex-col grow bg-white">
        <div class="relative flex w-full h-full">
            <button
                type="button"
                class="flex w-full h-full items-center focus:outline-hidden cursor-pointer"
                :class="{ 'z-20': isOpen }"
                @click.prevent="$emit('update:isOpen', !isOpen)"
            >
                <span
                    class="flex w-full h-full pl-3 pr-12 py-2 items-center whitespace-nowrap leading-none"
                    v-text="title"
                />
            </button>
            <eraser v-if="needsEraser" @click="$emit('erased')" class="pr-2 h-full"></eraser>
        </div>

        <popup v-model:is-open="popupIsOpen">
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
        isOpen(newValue) {
            this.popupIsOpen = newValue;
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
