<template>
    <div
        class="bb-dashboard-ui bb:flex bb:h-full bb:items-center bb:leading-none bb:text-4xl"
        :class="[colorClass(color, 'mark'), { 'bb:animate-pulse': withPulse }]"
    >
        <svg class="bb:fill-current bb:w-2 bb:h-2" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="45" />
        </svg>
    </div>
</template>

<script>
import { isColor, withColors } from "../colors.js";

export default {
    mixins: [withColors],

    props: {
        withPulse: {
            type: Boolean,
            default: false,
        },
        // Имя из общего списка цветов (src/colors.js).
        color: {
            type: String,
            required: true,
            validator: isColor,
        },
    },
};
</script>
