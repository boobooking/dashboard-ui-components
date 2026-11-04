<template>
    <div class="bb-dashboard-ui">
        <div class="bb:flex bb:items-center">
            <span :id="labelId" class="bb:block bb:text-sm bb:font-medium bb:leading-5 bb:text-gray-700" v-text="label ?? ''"/>
            <dot v-show="isRequired" color="red-pale" class="bb:ml-2"/>
        </div>
        <div class="bb:mt-1 bb:grid bb:grid-cols-[1fr_1fr_6rem] bb:gap-3" role="group" :aria-labelledby="labelId" :aria-describedby="descriptionId(labelId)">
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
                <!-- Рамки — как у AmountForm, без отступа сверху: отступ от
                     подписи уже у группы. -->
                <div class="bb:min-w-0 bb:h-9.5 bb:field-frame bb:text-sm">
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
                <div class="bb:min-w-0 bb:h-9.5 bb:field-frame bb:text-sm">
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
                <div class="bb:h-9.5 bb:field-frame bb:text-sm">
                    <amount-currency
                        :currencies="currencyField.list"
                        :model-value="currencyField.code"
                        :lang="lang"
                        @update:model-value="currencyField.choose"
                    />
                </div>
            </amount-interval>
        </div>
        <field-description v-if="hasDescription()" :id="descriptionId(labelId)"><slot name="description">{{ description }}</slot></field-description>
    </div>
</template>

<script>
import { useId } from "vue";
import { withFieldDescription } from "../fieldDescription.js";
import AmountCurrency from "./AmountCurrency.vue";
import AmountInput from "./AmountInput.vue";
import AmountInterval from "./AmountInterval.vue";
import Dot from "./Dot.vue";
import FieldDescription from "./FieldDescription.vue";

// Поле формы вида FormInput: подпись над двумя полями суммы «от» и «до» и
// блоком валюты, которые ядро AmountInterval отдаёт в слот; у каждого своя
// рамка. isRequired только рисует красную точку. Значения и события ядра
// проходят насквозь, class и прочие атрибуты ложатся на корень.
export default {
    components: {
        AmountCurrency,
        AmountInput,
        AmountInterval,
        Dot,
        FieldDescription,
    },

    mixins: [withFieldDescription],

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
        // Язык ядра и полей; без него они берут язык плагина.
        lang: {
            type: String,
            default: null,
        },
    },

    // useId() уникален в пределах приложения и совпадает на сервере и при
    // гидратации: группа полей каждой формы называется своей подписью.
    setup() {
        return {
            labelId: useId(),
        };
    },
};
</script>
