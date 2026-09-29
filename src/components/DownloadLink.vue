<template>
    <!-- Ссылка — весь бейдж, а не только подпись: курсор над иконкой и полями
         обещает клик, и клик должен работать. -->
    <a
        :href="url"
        :title="label"
        class="bb-dashboard-ui bb:inline-flex bb:items-center bb:px-3 bb:py-1.5 bb:rounded-full bb:text-xs bb:font-medium bb:leading-none bb:select-none bb:bg-purple-100 bb:text-purple-800 bb:hover:text-purple-600"
    >
        <download-icon/>
        <span class="bb:ml-1">{{ label }}</span>
    </a>
</template>

<script>
import Download from "./icons/Download.vue";
import { withLang } from "../lang.js";

export default {
    components: {
        "download-icon": Download,
    },

    mixins: [withLang],

    props: {
        url: {
            type: String,
            required: true,
        },
        // Не задан — подпись из словаря языка; явно переданная главнее языка.
        title: {
            type: String,
            default: null,
        },
    },

    computed: {
        label() {
            return this.title ?? this.texts.download;
        },
    },
};
</script>
