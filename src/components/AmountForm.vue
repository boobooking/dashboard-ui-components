<template>
    <div class="bb-dashboard-ui">
        <div class="bb:flex bb:items-center">
            <label :for="inputId" class="bb:block bb:text-sm bb:font-medium bb:leading-5 bb:text-gray-700" v-text="label"/>
            <dot v-show="isRequired" color="red-pale" class="bb:ml-2"/>
        </div>
        <div class="bb:mt-1 bb:flex bb:gap-3">
            <div class="bb:flex-1 bb:min-w-0 bb:h-9.5 bb:field-frame bb:text-sm">
                <amount-input
                    :model-value="passedAmount"
                    :digits="fractionDigits"
                    :input-id="inputId"
                    :described-by="descriptionId(inputId)"
                    :with-eraser="withEraser"
                    :is-disabled="isBlocked"
                    :lang="lang"
                    @update:model-value="reportAmount"
                    @changed="$emit('changed')"
                />
            </div>
            <div class="bb:w-24 bb:flex-none bb:h-9.5 bb:field-frame bb:text-sm">
                <amount-currency
                    :currencies="currencyList"
                    :model-value="activeCode"
                    :lang="lang"
                    @update:model-value="chooseCurrency"
                />
            </div>
        </div>
        <field-description v-if="hasDescription()" :id="descriptionId(inputId)"><slot name="description">{{ description }}</slot></field-description>
    </div>
</template>

<script>
import { useId } from "vue";
import { withFieldDescription } from "../fieldDescription.js";
import { normalizeAmount } from "../amount.js";
import { withAmountCurrency } from "../amountCurrency.js";
import AmountCurrency from "./AmountCurrency.vue";
import AmountInput from "./AmountInput.vue";
import Dot from "./Dot.vue";
import FieldDescription from "./FieldDescription.vue";

// Поле формы вида FormInput: подпись над строкой из рамки суммы и рамки блока
// валюты. Значение — { amount, currency }, каждое событие несёт новый объект.
// isRequired только рисует красную точку. class и прочие атрибуты ложатся на корень.
export default {
    components: {
        AmountCurrency,
        AmountInput,
        Dot,
        FieldDescription,
    },

    mixins: [withAmountCurrency, withFieldDescription],

    emits: ["update:modelValue", "changed"],

    props: {
        modelValue: {
            type: Object,
            default: null,
        },
        label: {
            type: String,
            required: true,
        },
        isRequired: {
            type: Boolean,
            default: false,
        },
        withEraser: {
            type: Boolean,
            default: true,
        },
        // Язык ядер; без него они берут язык плагина.
        lang: {
            type: String,
            default: null,
        },
    },

    // useId() уникален в пределах приложения и совпадает на сервере и при
    // гидратации: подпись каждого поля указывает на своё поле.
    setup() {
        return {
            inputId: useId(),
        };
    },

    computed: {
        passedAmount() {
            return normalizeAmount(this.modelValue?.amount);
        },

        passedCurrency() {
            return this.modelValue?.currency ?? null;
        },
    },

    methods: {
        reportAmount(amount) {
            this.$emit("update:modelValue", { amount, currency: this.activeCode });
        },

        reportCurrency(code) {
            this.$emit("update:modelValue", { amount: this.passedAmount, currency: code });
        },

        chooseCurrency(code) {
            this.reportCurrency(code);

            if (this.passedAmount !== null) {
                this.$emit("changed");
            }
        },
    },
};
</script>
