<template>
    <div class="bb-dashboard-ui bb:flex bb:w-fit bb:h-18 bb:border bb:border-gray-200">
        <div class="bb:flex bb:border bb:border-white">
            <div class="bb:flex bb:flex-col bb:bg-white bb:h-full">
                <element-header :text="header ?? ''" :is-required="isRequired" :is-loading="isLoading"/>
                <amount-interval
                    v-slot="{ from, to, currency: currencyField }"
                    :amount-from="amountFrom"
                    :amount-to="amountTo"
                    :currency="currency"
                    :currencies="currencies"
                    :lang="lang"
                    @update:amount-from="$emit('update:amountFrom', $event)"
                    @update:amount-to="$emit('update:amountTo', $event)"
                    @update:currency="$emit('update:currency', $event)"
                    @changed="$emit('changed')"
                >
                    <!-- Поля по 180px и блок валюты, между ними вертикальные линии. -->
                    <div class="bb:flex bb:h-full bb:divide-x bb:divide-gray-200">
                        <div class="bb:w-45 bb:flex-none bb:text-sm">
                            <amount-input
                                :model-value="from.value"
                                :digits="currencyField.digits"
                                :prefix="from.prefix"
                                :with-eraser="withEraser"
                                :is-disabled="currencyField.isBlocked"
                                :lang="lang"
                                @update:model-value="from.update"
                                @changed="from.changed"
                            />
                        </div>
                        <div class="bb:w-45 bb:flex-none bb:text-sm">
                            <amount-input
                                :model-value="to.value"
                                :digits="currencyField.digits"
                                :prefix="to.prefix"
                                :with-eraser="withEraser"
                                :is-disabled="currencyField.isBlocked"
                                :lang="lang"
                                @update:model-value="to.update"
                                @changed="to.changed"
                            />
                        </div>
                        <div v-if="withCurrency" class="bb:w-24 bb:flex-none bb:text-sm">
                            <amount-currency
                                :currencies="currencyField.list"
                                :model-value="currencyField.code"
                                :lang="lang"
                                @update:model-value="currencyField.choose"
                            />
                        </div>
                    </div>
                </amount-interval>
            </div>
        </div>
    </div>
</template>

<script>
import AmountCurrency from "./AmountCurrency.vue";
import AmountInput from "./AmountInput.vue";
import AmountInterval from "./AmountInterval.vue";
import ElementHeader from "./ElementHeader.vue";

// Фильтр панели фильтров: заголовок и под ним два поля суммы «от» и «до» и
// блок валюты, которые ядро AmountInterval отдаёт в слот. Высота, серая рамка
// и линии между блоками встроены. Значения и события ядра проходят насквозь,
// class и прочие атрибуты ложатся на корень. При withCurrency = false блока
// валюты нет, но число знаков берётся из активной валюты.
export default {
    components: {
        AmountCurrency,
        AmountInput,
        AmountInterval,
        ElementHeader,
    },

    emits: ["update:amountFrom", "update:amountTo", "update:currency", "changed"],

    props: {
        amountFrom: {
            type: Number,
            default: null,
        },
        amountTo: {
            type: Number,
            default: null,
        },
        currency: {
            type: String,
            default: null,
        },
        // Коды валют; null — полный список, [] — валют нет, поля заблокированы.
        currencies: {
            type: Array,
            default: null,
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
        withCurrency: {
            type: Boolean,
            default: true,
        },
        withEraser: {
            type: Boolean,
            default: true,
        },
        // Язык ядра и полей; без него они берут язык плагина.
        lang: {
            type: String,
            default: null,
        },
    },
};
</script>
