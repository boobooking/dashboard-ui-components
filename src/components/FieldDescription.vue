<template>
    <div class="bb:mt-1 bb:w-0 bb:min-w-full bb:text-xs bb:leading-4 bb:font-normal bb:text-gray-500 bb:wrap-anywhere"><slot></slot></div>
</template>

<script>
// Описание поля формы. Вид описания задан только здесь: поля вызывают компонент
// без своих классов. id — обычный атрибут на корне. w-0 и min-w-full убирают
// описание из расчёта ширины: в обёртке по содержимому ширину задаёт поле, а
// не текст описания. Внутренний компонент пакета.
export default {};
</script>
