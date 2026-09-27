<template>
    <div
        class="bb-dashboard-ui bb:flex bb:h-full bb:items-center bb:leading-none bb:text-4xl"
        :class="{ 'bb:text-red-500': isRed, 'bb:text-green-500': isGreen, 'bb:animate-pulse': withPulse }"
    >
        <svg class="bb:fill-current bb:w-2 bb:h-2" viewBox="0 0 120 120">
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
