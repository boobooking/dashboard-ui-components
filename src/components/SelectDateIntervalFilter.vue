<template>
    <div class="bb-dashboard-ui bb:flex bb:w-fit bb:h-18 bb:border bb:border-gray-200">
        <div class="bb:flex bb:border bb:border-white">
            <div class="bb:flex bb:flex-col bb:min-w-72 bb:w-72 bb:bg-white bb:h-full">
                <element-header :text="header ?? ''" :is-required="isRequired" :is-loading="isLoading"/>
                <select-date-interval
                    look="filter"
                    :date-from="dateFrom"
                    :date-to="dateTo"
                    :lang="lang"
                    @update:date-from="$emit('update:dateFrom', $event)"
                    @update:date-to="$emit('update:dateTo', $event)"
                    @changed="$emit('changed')"
                />
            </div>
        </div>
    </div>
</template>

<script>
import ElementHeader from "./ElementHeader.vue";
import SelectDateInterval from "./SelectDateInterval.vue";

// Фильтр панели фильтров: заголовок и под ним ядро SelectDateInterval.
// Высота и серая рамка встроены. Даты и события ядра проходят насквозь,
// class и прочие атрибуты ложатся на корень.
export default {
    components: {
        ElementHeader,
        SelectDateInterval,
    },

    emits: ["update:dateFrom", "update:dateTo", "changed"],

    props: {
        dateFrom: {
            type: String,
            default: "",
        },
        dateTo: {
            type: String,
            default: "",
        },
        header: {
            type: String,
            required: true,
        },
        isRequired: {
            type: Boolean,
            default: false,
        },
        isLoading: {
            type: Boolean,
            default: false,
        },
        // Язык ядра; без него ядро берёт язык плагина.
        lang: {
            type: String,
            default: null,
        },
    },
};
</script>
