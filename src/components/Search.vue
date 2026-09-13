<template>
    <div class="bb-dashboard-ui flex flex-none">
        <div class="flex w-full flex-col border border-white bg-white">
            <element-header :text="header" :is-required="isRequired" :is-loading="isLoading" />
            <div class="relative flex h-full w-full">
                <label class="flex w-full h-full items-center justify-center">
                    <input
                        class="flex w-full h-full px-3 py-2 cursor-pointer truncate hover:bg-blue-100 focus:bg-white focus:outline-hidden border-none"
                        v-model.trim="search"
                        @input="startSearch"
                    />
                    <eraser
                        v-show="inputNeedsEraser"
                        @click="clearInput"
                        class="pr-2 h-full"
                    />
                </label>
            </div>
        </div>
    </div>
</template>

<script>
import ElementHeader from "./ElementHeader.vue";
import Eraser from "./Eraser.vue";

export default {
    components: {
        ElementHeader,
        Eraser,
    },

    emits: ["update:modelValue", "changed"],

    props: {
        modelValue: {
            type: String,
            default: '',
        },
        header: {
            type: String,
            required: true,
        },
        isRequired: {
            type: Boolean,
            default: false,
        },
        isLoading: {
            type: Boolean,
            default: false,
        }
    },

    data() {
        return {
            search: this.modelValue
        };
    },

    computed: {
        inputNeedsEraser() {
            return this.search.length > 0
        }
    },

    watch: {

    },

    methods: {
        clearInput() {
            this.search = ''
            this.startSearch()
        },
        startSearch() {
            this.$emit('update:modelValue', this.search);
            this.$emit('changed');
        }
    },
};
</script>
