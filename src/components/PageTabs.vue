<template>
    <nav class="bb-dashboard-ui bb:flex bb:space-x-4" :aria-label="texts.tabs">
        <a
            v-for="tab in tabList"
            :key="tab.key"
            :href="tab.url"
            :aria-current="tab.key === activeKey ? 'page' : null"
            class="bb:px-3 bb:py-2 bb:font-medium bb:text-sm bb:rounded-md"
            :class="tab.key === activeKey ? 'bb:bg-indigo-100 bb:text-gray-700' : 'bb:text-gray-500 bb:hover:text-gray-700'"
            @click="followLink($event, tab.url)"
            v-text="tab.name"
        />
    </nav>
</template>

<script>
import { withLang } from "../lang.js";
import { withNavigation } from "../navigation.js";

// Табы второго уровня: ссылки на страницы одного раздела. Открытый таб
// приносит страница пропом activeKey — сам компонент его не меняет.
export default {
    mixins: [withLang, withNavigation],

    props: {
        // [{ key, name, url }], все поля — строки. Ключ сравнивается
        // с activeKey строго.
        tabs: {
            type: Array,
            required: true,
        },
        activeKey: {
            type: String,
            default: null,
        },
    },

    computed: {
        // Не массив — пустой список; элементы, которые не объекты, пропускаются.
        tabList() {
            if (!Array.isArray(this.tabs)) {
                return [];
            }

            return this.tabs.filter((tab) => tab !== null && typeof tab === "object");
        },
    },
};
</script>
