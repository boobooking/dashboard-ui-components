<template>
    <div
        class="bb-dashboard-ui flex h-full items-center leading-none text-4xl"
        :class="{ 'text-red-500': isRed, 'text-green-500': isGreen, 'animate-pulse': withPulse }"
    >
        <svg class="fill-current w-2 h-2" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="45" />
        </svg>
    </div>
</template>

<script>
export default {
    props: {
        withPulse: {
            type: Boolean,
            default: false,
        },
        color: {
            type: String,
            required: true,
            validator: (value) => {
                return ["red", "green"].indexOf(value) !== -1;
            },
        },
    },

    computed: {
        isRed() {
            return this.color === "red";
        },
        isGreen() {
            return this.color === "green";
        },
    },
};
</script>
