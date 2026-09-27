<template>
    <div class="bb:flex bb:h-6 bb:px-3 bb:bg-white bb:items-center bb:justify-between">
        <div
            class="bb:flex bb:flex-1 bb:h-full bb:items-center bb:text-xs bb:text-gray-500 bb:whitespace-nowrap bb:truncate bb:leading-tight bb:select-none"
            v-text="text"
        />
        <dot v-show="isLoading" color="red" :with-pulse="true" class="bb:ml-3"/>
        <dot v-show="isRequired" color="red" class="bb:ml-3"/>
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
