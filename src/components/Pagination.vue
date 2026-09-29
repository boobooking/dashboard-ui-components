<template>
    <nav v-if="hasResults" class="bb-dashboard-ui bb:px-4 bb:flex bb:items-center bb:justify-between bb:sm:px-0">
        <div class="bb:-mt-px bb:w-0 bb:flex-1 bb:flex">
            <a
                v-if="previousPageUrl !== null"
                :href="previousPageUrl"
                class="bb:border-t-2 bb:border-transparent bb:pt-4 bb:pr-1 bb:inline-flex bb:items-center bb:text-sm bb:font-medium bb:text-gray-500 bb:hover:text-gray-700 bb:hover:border-indigo-700"
                @click="followLink($event, previousPageUrl)"
            >
                <arrow-narrow-left class="bb:mr-3 bb:h-5 bb:w-5 bb:text-gray-400"/>
                {{ texts.previousPage }}
            </a>
        </div>
        <div v-if="hasRange" class="bb:hidden bb:md:-mt-px bb:md:flex bb:text-gray-400 bb:text-sm bb:leading-5">
            {{ texts.resultsBefore }}
            <span class="bb:font-medium bb:text-gray-900 bb:mx-1">{{ from }} - {{ to }}</span> {{ texts.resultsOf }}
            <span class="bb:font-medium bb:text-gray-900 bb:mx-1">{{ total }}</span> {{ texts.resultsAfter }}
        </div>
        <div class="bb:-mt-px bb:w-0 bb:flex-1 bb:flex bb:justify-end">
            <a
                v-if="nextPageUrl !== null"
                :href="nextPageUrl"
                class="bb:border-t-2 bb:border-transparent bb:pt-4 bb:pl-1 bb:inline-flex bb:items-center bb:text-sm bb:font-medium bb:text-gray-500 bb:hover:text-gray-700 bb:hover:border-indigo-700"
                @click="followLink($event, nextPageUrl)"
            >
                {{ texts.nextPage }}
                <arrow-narrow-right class="bb:ml-3 bb:h-5 bb:w-5 bb:text-gray-400"/>
            </a>
        </div>
    </nav>
</template>

<script>
import ArrowNarrowLeft from "./icons/ArrowNarrowLeft.vue";
import ArrowNarrowRight from "./icons/ArrowNarrowRight.vue";
import { withLang } from "../lang.js";
import { withNavigation } from "../navigation.js";

// Адрес страницы из links Laravel API Resource: только непустая строка.
// null, отсутствующий ключ и пустая строка — страницы нет, кнопки нет.
function pageUrl(value) {
    return typeof value === "string" && value !== "" ? value : null;
}

export default {
    components: {
        ArrowNarrowLeft,
        ArrowNarrowRight,
    },

    mixins: [withLang, withNavigation],

    props: {
        // links и meta — как их отдаёт Laravel API Resource:
        // links: { prev, next }, meta: { from, to, total }.
        links: {
            type: Object,
            required: true,
        },
        meta: {
            type: Object,
            required: true,
        },
    },

    computed: {
        from() {
            return this.meta?.from;
        },

        to() {
            return this.meta?.to;
        },

        total() {
            return this.meta?.total;
        },

        // Записи есть — пагинация рисуется. Нет meta или total не больше нуля — нет.
        hasResults() {
            return typeof this.total === "number" && this.total > 0;
        },

        // Строка «Показаны результаты X - Y из Z» — только когда известен диапазон.
        hasRange() {
            return typeof this.from === "number" && typeof this.to === "number";
        },

        previousPageUrl() {
            return pageUrl(this.links?.prev);
        },

        nextPageUrl() {
            return pageUrl(this.links?.next);
        },
    },
};
</script>
