<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-none bb:h-18 bb:border bb:border-gray-200">
        <div class="bb:flex bb:w-full bb:flex-col bb:border bb:border-white bb:bg-white">
            <element-header :text="header ?? ''" :is-required="isRequired" :is-loading="isLoading"/>
            <select-multiple
                :items="items"
                :model-value="modelValue"
                :with-search="withSearch"
                :lang="lang"
                @update:model-value="$emit('update:modelValue', $event)"
                @changed="$emit('changed')"
            />
        </div>
    </div>
</template>

<script>
import ElementHeader from "./ElementHeader.vue";
import SelectMultiple from "./SelectMultiple.vue";

// Фильтр панели фильтров: заголовок и под ним ядро SelectMultiple. Высота
// и серая рамка встроены; без пунктов они остаются. Значение и события
// ядра проходят насквозь, class и прочие атрибуты ложатся на корень.
export default {
    components: {
        ElementHeader,
        SelectMultiple,
    },

    emits: ["update:modelValue", "changed"],

    props: {
        items: {
            type: Array,
            required: true,
        },
        modelValue: {
            type: Array,
            default: () => [],
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
        // Поле поиска над пунктами списка.
        withSearch: {
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
