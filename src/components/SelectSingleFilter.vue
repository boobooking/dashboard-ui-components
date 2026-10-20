<template>
    <div class="bb-dashboard-ui bb:flex bb:flex-none bb:h-18 bb:border bb:border-gray-200">
        <div class="bb:flex bb:w-full bb:flex-col bb:border bb:border-white bb:bg-white">
            <element-header :text="header ?? ''" :is-required="isRequired" :is-loading="isLoading"/>
            <select-single
                :items="items"
                :model-value="modelValue"
                @update:model-value="$emit('update:modelValue', $event)"
                @changed="$emit('changed')"
            />
        </div>
    </div>
</template>

<script>
import ElementHeader from "./ElementHeader.vue";
import SelectSingle from "./SelectSingle.vue";

// Фильтр панели фильтров: заголовок и под ним ядро SelectSingle. Высота
// и серая рамка встроены; без пунктов они остаются. Значение и события
// ядра проходят насквозь, class и прочие атрибуты ложатся на корень.
export default {
    components: {
        ElementHeader,
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
    },
};
</script>
