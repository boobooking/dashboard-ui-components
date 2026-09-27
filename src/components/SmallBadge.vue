<template>
    <span
        class="bb-dashboard-ui bb:inline-flex bb:items-center bb:px-3 bb:py-2 bb:rounded-full bb:text-xs bb:font-medium bb:leading-none bb:select-none bb:whitespace-nowrap"
        :class="{
            'bb:bg-green-50 bb:text-gray-700': isGreen,
            'bb:bg-indigo-100 bb:text-gray-700': isIndigo,
            'bb:bg-gray-200 bb:text-gray-700': isGray,
            'bb:bg-blue-100 bb:text-blue-800': isBlue,
            'bb:bg-red-100 bb:text-red-800': isRed,
            'bb:bg-yellow-100 bb:text-yellow-800': isYellow,
        }"
        v-text="text"
    ></span>
</template>

<script>
export default {
    props: {
        text: {
            type: String,
            required: true,
        },

        color: {
            type: String,
            required: true,
            validator: (value) => {
                return ["green", "indigo", "gray", "blue", "red", "yellow"].indexOf(value) !== -1;
            },
        },
    },

    computed: {
        isGreen() {
            return this.color === "green";
        },

        isIndigo() {
            return this.color === "indigo";
        },

        isGray() {
            return this.color === "gray";
        },

        isBlue() {
            return this.color === "blue";
        },

        isRed() {
            return this.color === "red";
        },

        isYellow() {
            return this.color === "yellow";
        }
    },
};
</script>
