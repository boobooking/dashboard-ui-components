<template>
    <div class="bb-dashboard-ui bb:flex bb:w-fit bb:h-18 bb:border bb:border-gray-200">
        <div class="bb:flex bb:border bb:border-white">
            <div class="bb:flex bb:flex-col bb:w-36 bb:bg-white bb:h-full">
                <element-header :text="header ?? ''" :is-required="isRequired" :is-loading="isLoading"/>
                <select-date
                    class="bb:flex-1"
                    :model-value="modelValue"
                    :lang="lang"
                    @update:model-value="$emit('update:modelValue', $event)"
                    @changed="$emit('changed')"
                />
            </div>
        </div>
    </div>
</template>

<script>
import ElementHeader from "./ElementHeader.vue";
import SelectDate from "./SelectDate.vue";

// Фильтр панели фильтров: заголовок и под ним ядро SelectDate. Высота
// и серая рамка встроены. Подсказки у поля нет. Дата и события ядра
// проходят насквозь, class и прочие атрибуты ложатся на корень.
export default {
    components: {
        ElementHeader,
        SelectDate,
    },

    emits: ["update:modelValue", "changed"],

    props: {
        modelValue: {
            type: String,
            default: "",
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
};
</script>
