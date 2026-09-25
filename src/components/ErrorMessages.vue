<template>
    <div
        v-if="hasErrors"
        class="bb-dashboard-ui border-l-4 p-4"
        :class="isDangerous ? 'bg-red-50 border-red-400' : 'bg-yellow-50 border-yellow-400'"
    >
        <div class="flex">
            <div class="shrink-0">
                <svg
                    class="h-5 w-5"
                    :class="isDangerous ? 'text-red-400' : 'text-yellow-400'"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fill-rule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                    />
                </svg>
            </div>
            <div class="ml-3">
                <p
                    class="text-sm leading-5"
                    :class="isDangerous ? 'text-red-700' : 'text-yellow-700'"
                    v-for="(message, key) in messages"
                    :key="key"
                    v-text="message"
                ></p>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        messages: {
            type: [Object, Array],
            required: true,
        },
        // Тон плашки, по умолчанию жёлтый. Имена значений совпадают с type
        // у ConfirmationModal.
        type: {
            type: String,
            default: "warning",
            validator: (value) => {
                return ["warning", "dangerous"].indexOf(value) !== -1;
            },
        },
    },

    computed: {
        // Object.keys одинаково считает и объект ошибок валидации, и массив
        // строк: у массива ключи — индексы. null — как отсутствие сообщений.
        hasErrors() {
            return Object.keys(this.messages ?? {}).length > 0;
        },

        isDangerous() {
            return this.type === "dangerous";
        },
    },
};
</script>
