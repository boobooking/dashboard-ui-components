<template>
    <div class="flex h-6 px-3 bg-white items-center justify-between">
        <div
            class="flex flex-1 h-full items-center text-xs text-gray-500 whitespace-nowrap truncate leading-tight select-none"
            v-text="text"
        />
        <dot v-show="isLoading" color="red" :add-pulse="true" class="ml-3"/>
        <dot v-show="isRequired" color="red" class="ml-3"/>
    </div>
</template>

<script>
import Dot from "./Dot.vue"

export default {
    components: {
        Dot,
    },

    props: {
        text: {
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
        },
    },
};
</script>
