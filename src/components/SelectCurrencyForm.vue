<template>
    <select-single-form
        :items="items"
        :model-value="modelValue"
        :label="label"
        :is-required="isRequired"
        :with-search="withSearch"
        :lang="lang"
        @update:model-value="$emit('update:modelValue', $event)"
        @changed="$emit('changed')"
    />
</template>

<script>
import { currencyLabel, pickCurrencies } from "../currencies.js";
import SelectSingleForm from "./SelectSingleForm.vue";

// Выбор валюты в форме: SelectSingleForm с пунктами из списка валют.
// currencies — коды валют (null — весь список). class и прочие атрибуты
// ложатся на корень обёртки.
export default {
    components: {
        SelectSingleForm,
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
        label: {
            type: String,
            required: true,
        },
        isRequired: {
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
            return pickCurrencies(this.currencies).map((currency) => ({ id: currency.code, name: currencyLabel(currency) }));
        },
    },
};
</script>
