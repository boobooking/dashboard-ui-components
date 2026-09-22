<template>
    <!-- Ссылка — весь бейдж, а не только подпись: курсор над иконкой и полями
         обещает клик, и клик должен работать. -->
    <a
        :href="url"
        :title="title"
        class="bb-dashboard-ui inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium leading-none select-none bg-purple-100 text-purple-800 hover:text-purple-600"
    >
        <download-icon/>
        <span class="ml-1">{{ title }}</span>
    </a>
</template>

<script>
import Download from "./icons/Download.vue";

export default {
    components: {
        "download-icon": Download,
    },

    props: {
        url: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            default: "Скачать",
        },
    },
};
</script>
