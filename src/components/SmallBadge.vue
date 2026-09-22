<template>
    <span
        class="bb-dashboard-ui inline-flex items-center px-3 py-2 rounded-full text-xs font-medium leading-none select-none whitespace-nowrap"
        :class="{
            'bg-green-50 text-gray-700': isGreen,
            'bg-indigo-100 text-gray-700': isIndigo,
            'bg-gray-200 text-gray-700': isGray,
            'bg-blue-100 text-blue-800': isBlue,
            'bg-red-100 text-red-800': isRed,
            'bg-yellow-100 text-yellow-800': isYellow,
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
