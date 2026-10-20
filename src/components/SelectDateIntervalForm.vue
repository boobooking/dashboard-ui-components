<template>
    <div class="bb-dashboard-ui">
        <div class="bb:flex bb:items-center">
            <span :id="labelId" class="bb:block bb:text-sm bb:font-medium bb:leading-5 bb:text-gray-700" v-text="label ?? ''"/>
            <dot v-show="isRequired" color="red" class="bb:ml-2"/>
        </div>
        <div class="bb:mt-1" role="group" :aria-labelledby="labelId">
            <select-date-interval
                look="form"
                :date-from="dateFrom"
                :date-to="dateTo"
                :lang="lang"
                @update:date-from="$emit('update:dateFrom', $event)"
                @update:date-to="$emit('update:dateTo', $event)"
                @changed="$emit('changed')"
            />
        </div>
    </div>
</template>

<script>
import { useId } from "vue";
import Dot from "./Dot.vue";
import SelectDateInterval from "./SelectDateInterval.vue";

// Поле формы вида FormInput: подпись над двумя полями дат, у каждого
// своя рамка. isRequired только рисует красную точку. Даты и события ядра
// проходят насквозь, class и прочие атрибуты ложатся на корень.
export default {
    components: {
        Dot,
        SelectDateInterval,
    },

    emits: ["update:dateFrom", "update:dateTo", "changed"],

    props: {
        dateFrom: {
            type: String,
            default: "",
        },
        dateTo: {
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
    // гидратации: группа полей каждой формы называется своей подписью.
    setup() {
        return {
            labelId: useId(),
        };
    },
};
</script>
