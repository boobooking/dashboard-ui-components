<template>
    <div class="bb-dashboard-ui bb:flex bb:w-fit bb:h-18 bb:border bb:border-gray-200">
        <div class="bb:flex bb:border bb:border-white">
            <div class="bb:flex bb:flex-col bb:min-w-72 bb:w-72 bb:bg-white bb:h-full">
                <element-header :text="header ?? ''" :is-required="isRequired" :is-loading="isLoading"/>
                <select-date-interval
                    v-slot="{ from, to }"
                    :date-from="dateFrom"
                    :date-to="dateTo"
                    :lang="lang"
                    @update:date-from="$emit('update:dateFrom', $event)"
                    @update:date-to="$emit('update:dateTo', $event)"
                    @changed="$emit('changed')"
                >
                    <!-- «от» и «до» по половине, между ними вертикальная линия. -->
                    <div class="bb:flex bb:h-full bb:divide-x bb:divide-gray-200">
                        <select-date
                            class="bb:flex-1 bb:min-w-36"
                            :model-value="from.value"
                            :placeholder-text="from.placeholder"
                            :lang="lang"
                            @update:model-value="from.update"
                        />
                        <select-date
                            class="bb:flex-1 bb:min-w-36"
                            :model-value="to.value"
                            :placeholder-text="to.placeholder"
                            :lang="lang"
                            @update:model-value="to.update"
                        />
                    </div>
                </select-date-interval>
            </div>
        </div>
    </div>
</template>

<script>
import ElementHeader from "./ElementHeader.vue";
import SelectDate from "./SelectDate.vue";
import SelectDateInterval from "./SelectDateInterval.vue";

// Фильтр панели фильтров: заголовок и под ним два поля SelectDate, которые
// ядро SelectDateInterval отдаёт в слот. Высота, серая рамка и линия между
// полями встроены. Даты и события ядра проходят насквозь, class и прочие
// атрибуты ложатся на корень.
export default {
    components: {
        ElementHeader,
        SelectDate,
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
        // Язык ядра и обоих полей; без него они берут язык плагина.
        lang: {
            type: String,
            default: null,
        },
    },
};
</script>
