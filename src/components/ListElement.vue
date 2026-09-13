<template>
    <button
        type="button"
        @click.prevent="toggle"
        class="flex w-full bg-white hover:bg-indigo-100 cursor-pointer focus:outline-hidden focus:ring-3 focus:z-10 focus:ring-blue-500/50"
    >
        <span class="flex w-9 h-9 items-center justify-center">
            <svg v-show="isChecked" class="w-5 h-5 fill-current text-green-300" viewBox="0 0 20 20">
                <path
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                    fill-rule="evenodd"
                />
            </svg>
        </span>
        <span class="flex h-9 justify-center items-center pr-6 whitespace-nowrap select-none" v-text="name" />
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
