<template>
    <a
        :href="url"
        :class="
            isActive
                ? 'bb:border-indigo-400 bb:text-gray-600 bb:focus:border-indigo-700'
                : 'bb:border-transparent bb:text-gray-500 bb:hover:text-gray-600 bb:hover:border-gray-300 bb:focus:text-gray-700 bb:focus:border-gray-300'
        "
        class="bb-dashboard-ui bb:inline-flex bb:items-center bb:px-1 bb:pt-1 bb:border-b-2 bb:text-sm bb:font-medium bb:leading-5 bb:focus:outline-hidden bb:transition bb:duration-150 bb:ease-in-out"
        @click="followLink($event, url)"
        v-text="name"
    />
</template>

<script>
import { withNavigation } from "../navigation.js";

export default {
    mixins: [withNavigation],

    props: {
        url: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: false,
        },
    },
};
</script>
