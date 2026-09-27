<template>
    <button
        type="button"
        @click.prevent="toggle"
        class="bb:flex bb:w-full bb:bg-white bb:hover:bg-indigo-100 bb:cursor-pointer bb:focus:outline-hidden bb:focus:ring-3 bb:focus:z-10 bb:focus:ring-blue-500/50"
    >
        <span class="bb:flex bb:w-9 bb:h-9 bb:items-center bb:justify-center">
            <svg v-show="isChecked" class="bb:w-5 bb:h-5 bb:fill-current bb:text-green-300" viewBox="0 0 20 20">
                <path
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                    fill-rule="evenodd"
                />
            </svg>
        </span>
        <span class="bb:flex bb:h-9 bb:justify-center bb:items-center bb:pr-6 bb:whitespace-nowrap bb:select-none" v-text="name" />
    </button>
</template>

<script>
export default {
    props: {
        isChecked: {
            type: Boolean,
            default: false,
        },
        name: {
            type: String,
        },
    },

    emits: ["clicked"],

    methods: {
        toggle() {
            this.$emit("clicked");
        },
    },
};
</script>
