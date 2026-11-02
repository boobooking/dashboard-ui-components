<template>
    <div class="bb:grid bb:grid-cols-3 bb:gap-4 bb:px-6 bb:py-5 bb:bg-white bb:odd:bg-gray-50">
        <dt class="bb:m-0 bb:p-0 bb:text-sm bb:leading-5 bb:font-normal bb:text-gray-500 bb:wrap-break-word" v-text="title"></dt>
        <dd class="bb:col-span-2 bb:m-0 bb:p-0 bb:text-sm bb:leading-5 bb:font-medium bb:text-gray-900 bb:wrap-break-word">
            <slot></slot>
        </dd>
    </div>
</template>

<script>
// Строка DetailList: название слева, значение справа. Первая строка серая,
// вторая белая, и так далее: bb:odd: считает соседние элементы, поэтому скрытая
// через v-if строка в счёт не входит, а обёртка вокруг строки его собьёт.
export default {
    props: {
        // Название строки.
        title: {
            type: String,
            required: true,
        },
    },
};
</script>
