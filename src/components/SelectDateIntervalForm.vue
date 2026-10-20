<template>
    <div class="bb-dashboard-ui">
        <div class="bb:flex bb:items-center">
            <span :id="labelId" class="bb:block bb:text-sm bb:font-medium bb:leading-5 bb:text-gray-700" v-text="label ?? ''"/>
            <dot v-show="isRequired" color="red" class="bb:ml-2"/>
        </div>
        <div class="bb:mt-1 bb:grid bb:grid-cols-2 bb:gap-3" role="group" :aria-labelledby="labelId">
            <select-date-interval
                v-slot="{ from, to }"
                :date-from="dateFrom"
                :date-to="dateTo"
                :lang="lang"
                @update:date-from="$emit('update:dateFrom', $event)"
                @update:date-to="$emit('update:dateTo', $event)"
                @changed="$emit('changed')"
            >
                <!-- Рамки — как у SelectDateForm, без отступа сверху: отступ
                     от подписи уже у группы. -->
                <div class="bb:flex bb:h-9.5 bb:w-full bb:rounded-md bb:border bb:border-gray-300 bb:bg-white bb:shadow-xs bb:text-sm bb:[--bb-field-radius:0.375rem]">
                    <select-date
                        class="bb:flex-1"
                        :model-value="from.value"
                        :placeholder-text="from.placeholder"
                        :lang="lang"
                        @update:model-value="from.update"
                    />
                </div>
                <div class="bb:flex bb:h-9.5 bb:w-full bb:rounded-md bb:border bb:border-gray-300 bb:bg-white bb:shadow-xs bb:text-sm bb:[--bb-field-radius:0.375rem]">
                    <select-date
                        class="bb:flex-1"
                        :model-value="to.value"
                        :placeholder-text="to.placeholder"
                        :lang="lang"
                        @update:model-value="to.update"
                    />
                </div>
            </select-date-interval>
        </div>
    </div>
</template>

<script>
import { useId } from "vue";
import Dot from "./Dot.vue";
import SelectDate from "./SelectDate.vue";
import SelectDateInterval from "./SelectDateInterval.vue";

// Поле формы вида FormInput: подпись над двумя полями SelectDate, которые
// ядро SelectDateInterval отдаёт в слот; у каждого поля своя рамка.
// isRequired только рисует красную точку. Даты и события ядра проходят
// насквозь, class и прочие атрибуты ложатся на корень.
export default {
    components: {
        Dot,
        SelectDate,
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
        // Язык ядра и обоих полей; без него они берут язык плагина.
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
