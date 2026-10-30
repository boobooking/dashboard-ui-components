<template>
    <slot :from="from" :to="to" :currency="currencyField"/>
</template>

<script>
import { normalizeAmount } from "../amount.js";
import { withAmountCurrency } from "../amountCurrency.js";
import { withLang } from "../lang.js";

// Ядро диапазона сумм без своей разметки: границы, активная валюта и правила
// событий. В слот по умолчанию ядро отдаёт from и to (значение, подсказка,
// update с новой суммой, changed) и currency (список, код, число знаков,
// признак блокировки, choose). Поля, блок валюты, рамки, заголовок и подпись
// рисуют обёртки AmountIntervalFilter и AmountIntervalForm; пакет ядро не
// экспортирует.
export default {
    // Своего узла у ядра нет: атрибуты потребителя остаются на обёртке.
    inheritAttrs: false,

    mixins: [withLang, withAmountCurrency],

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
    },

    computed: {
        passedCurrency() {
            return this.currency;
        },

        passedFrom() {
            return normalizeAmount(this.amountFrom);
        },

        passedTo() {
            return normalizeAmount(this.amountTo);
        },

        // Поля слота. Значение — проп родителя: поле суммы само держит своё
        // состояние, пока родитель не передал v-model.
        from() {
            return {
                value: this.passedFrom,
                prefix: this.texts.amountFrom,
                update: (amount) => this.$emit("update:amountFrom", amount),
                changed: () => this.$emit("changed"),
            };
        },

        to() {
            return {
                value: this.passedTo,
                prefix: this.texts.amountTo,
                update: (amount) => this.$emit("update:amountTo", amount),
                changed: () => this.$emit("changed"),
            };
        },

        currencyField() {
            return {
                list: this.currencyList,
                code: this.activeCode,
                digits: this.fractionDigits,
                isBlocked: this.isBlocked,
                choose: this.chooseCurrency,
            };
        },
    },

    methods: {
        reportCurrency(code) {
            this.$emit("update:currency", code);
        },

        chooseCurrency(code) {
            this.reportCurrency(code);

            if (this.passedFrom !== null || this.passedTo !== null) {
                this.$emit("changed");
            }
        },
    },
};
</script>
