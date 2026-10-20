<template>
    <div class="bb-dashboard-ui">
        <div class="bb:flex bb:items-center">
            <span :id="labelId" class="bb:block bb:text-sm bb:font-medium bb:leading-5 bb:text-gray-700" v-text="label ?? ''"/>
            <dot v-show="isRequired" color="red" class="bb:ml-2"/>
        </div>
        <div class="bb:mt-1 bb:flex bb:h-9.5 bb:w-full bb:rounded-md bb:border bb:border-gray-300 bb:bg-white bb:shadow-xs bb:text-sm bb:[--bb-field-radius:0.375rem]">
            <select-date
                class="bb:flex-1"
                :model-value="modelValue"
                :labelled-by="labelId"
                :lang="lang"
                @update:model-value="$emit('update:modelValue', $event)"
                @changed="$emit('changed')"
            />
        </div>
    </div>
</template>

<script>
import { useId } from "vue";
import Dot from "./Dot.vue";
import SelectDate from "./SelectDate.vue";

// Поле формы вида FormInput: подпись над рамкой, в рамке ядро SelectDate.
// Подсказки у поля нет. isRequired только рисует красную точку. Дата
// и события ядра проходят насквозь, class и прочие атрибуты ложатся на корень.
export default {
    components: {
        Dot,
        SelectDate,
    },

    emits: ["update:modelValue", "changed"],

    props: {
        modelValue: {
            type: String,
            default: "",
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

    // useId() уникален в пределах приложения и совпадает на сервере и при
    // гидратации: кнопка и поле ввода каждого поля называются своей подписью.
    setup() {
        return {
            labelId: useId(),
        };
    },
};
</script>
