<template>
    <!-- Ссылка — весь бейдж, а не только подпись: курсор над иконкой и полями
         обещает клик, и клик должен работать. -->
    <a
        :href="url"
        :title="title"
        class="bb-dashboard-ui bb:inline-flex bb:items-center bb:px-3 bb:py-1.5 bb:rounded-full bb:text-xs bb:font-medium bb:leading-none bb:select-none bb:bg-purple-100 bb:text-purple-800 bb:hover:text-purple-600"
    >
        <download-icon/>
        <span class="bb:ml-1">{{ title }}</span>
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
