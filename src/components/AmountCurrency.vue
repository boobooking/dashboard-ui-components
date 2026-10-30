<template>
    <div class="bb:relative bb:flex bb:flex-col bb:justify-center bb:h-full bb:w-full bb:min-w-0">
        <!-- relative держит скрытую подпись sr-only внутри блока. -->
        <span v-if="items.length === 1" class="bb:truncate bb:px-3" v-text="items[0].name"/>
        <template v-else-if="items.length > 1">
            <span :id="labelId" class="bb:sr-only" v-text="texts.currency"/>
            <select-single
                :items="items"
                :model-value="modelValue"
                :labelled-by="labelId"
                :with-clear="false"
                with-arrow
                with-search
                :lang="lang"
                @update:model-value="$emit('update:modelValue', $event)"
            />
        </template>
    </div>
</template>

<script>
import { useId } from "vue";
import { currencyLabel } from "../currencies.js";
import { withLang } from "../lang.js";
import SelectSingle from "./SelectSingle.vue";

// Блок валюты полей суммы: без валют пуст, с одной — текст вне порядка Tab, с
// несколькими — список. Ширину и рамку задаёт обёртка. Внутренний компонент пакета.
export default {
    components: { SelectSingle },

    mixins: [withLang],

    emits: ["update:modelValue"],

    props: {
        // Записи таблицы валют, а не коды.
        currencies: {
            type: Array,
            required: true,
        },
        modelValue: {
            type: String,
            default: null,
        },
    },

    // useId() уникален в пределах приложения и совпадает на сервере и при
    // гидратации: кнопка каждого блока называется своей подписью.
    setup() {
        return {
            labelId: useId(),
        };
    },

    computed: {
        items() {
            return this.currencies.map((currency) => ({ id: currency.code, name: currencyLabel(currency) }));
        },
    },
};
</script>
