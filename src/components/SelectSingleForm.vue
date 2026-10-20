<template>
    <div class="bb-dashboard-ui">
        <div class="bb:flex bb:items-center">
            <span :id="labelId" class="bb:block bb:text-sm bb:font-medium bb:leading-5 bb:text-gray-700" v-text="label ?? ''"/>
            <dot v-show="isRequired" color="red" class="bb:ml-2"/>
        </div>
        <div class="bb:mt-1 bb:h-9.5 bb:w-full bb:rounded-md bb:border bb:border-gray-300 bb:bg-white bb:shadow-xs bb:text-sm bb:flex bb:flex-col">
            <select-single
                :items="items"
                :model-value="modelValue"
                :labelled-by="labelId"
                @update:model-value="$emit('update:modelValue', $event)"
                @changed="$emit('changed')"
            />
        </div>
    </div>
</template>

<script>
import { useId } from "vue";
import Dot from "./Dot.vue";
import SelectSingle from "./SelectSingle.vue";

// Поле формы вида FormInput: подпись над рамкой, в рамке ядро SelectSingle.
// isRequired только рисует красную точку. Значение и события ядра проходят
// насквозь, class и прочие атрибуты ложатся на корень.
export default {
    components: {
        Dot,
        SelectSingle,
    },

    emits: ["update:modelValue", "changed"],

    props: {
        items: {
            type: Array,
            required: true,
        },
        modelValue: {
            type: [String, Number],
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
    },

    // useId() уникален в пределах приложения и совпадает на сервере и при
    // гидратации: кнопка каждого поля называется своей подписью.
    setup() {
        return {
            labelId: useId(),
        };
    },
};
</script>
