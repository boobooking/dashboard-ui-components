<template>
    <select-single-filter
        :items="items"
        :model-value="modelValue"
        :header="header"
        :is-required="isRequired"
        :is-loading="isLoading"
        :with-search="withSearch"
        :lang="lang"
        @update:model-value="$emit('update:modelValue', $event)"
        @changed="$emit('changed')"
    />
</template>

<script>
import { currencyItems, pickCurrencies } from "../currencies.js";
import SelectSingleFilter from "./SelectSingleFilter.vue";

// Выбор валюты в панели фильтров: SelectSingleFilter с пунктами из списка
// валют. currencies — коды валют (null — весь список). class и прочие
// атрибуты ложатся на корень обёртки.
export default {
    components: {
        SelectSingleFilter,
    },

    emits: ["update:modelValue", "changed"],

    props: {
        modelValue: {
            type: String,
            default: null,
        },
        currencies: {
            type: Array,
            default: null,
        },
        withSearch: {
            type: Boolean,
            default: true,
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

    computed: {
        items() {
            return currencyItems(pickCurrencies(this.currencies));
        },
    },
};
</script>
